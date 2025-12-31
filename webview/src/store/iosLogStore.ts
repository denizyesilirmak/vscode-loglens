// useIosLogStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';
import { parseIosLogLine } from '../utils/log';

export interface IosLogEntry {
  Time: string;
  Process: string;
  Category?: string;
  Message: string;
}

interface IosLogState {
  logs: IosLogEntry[];
  loading: boolean;
  running: boolean;
  startIosLog: (options: { device: string; appName?: string }) => void;
  stopIosLog: () => void;
  clearLogs: () => void;
  addLog: (logs: IosLogEntry | IosLogEntry[]) => void; // Updated to accept array
  setRunning: (running: boolean) => void;
  setLoading: (loading: boolean) => void;
}

declare const vscode: {
  postMessage: (msg: unknown) => void;
};

const MAX_LOGS = 50000;

export const useIosLogStore = create<IosLogState>((set) => ({
  logs: [],
  loading: false,
  running: false,

  startIosLog: (options) => {
    set({ loading: true });
    vscode.postMessage({ type: 'IOS_START_LOG', options });
  },

  stopIosLog: () => {
    console.log('stopIosLog called - sending IOS_STOP_LOG message');
    set({ running: false, loading: false });
    vscode.postMessage({ type: 'IOS_STOP_LOG' });
  },

  clearLogs: () => set({ logs: [] }),

  addLog: (newLogs) =>
    set((state) => {
      const incoming = Array.isArray(newLogs) ? newLogs : [newLogs];
      const updated = state.logs.concat(incoming);
      if (updated.length > MAX_LOGS) {
        return { logs: updated.slice(-MAX_LOGS) };
      }
      return { logs: updated };
    }),

  setRunning: (running) => set({ running }),
  setLoading: (loading) => set({ loading }),
}));

// Custom hook
export function useIosLog() {
  const {
    logs,
    running,
    loading,
    startIosLog,
    stopIosLog,
    clearLogs,
    addLog,
    setRunning,
    setLoading,
  } = useIosLogStore();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'IOS_LOG': {
          if (!useIosLogStore.getState().running) break;
          const parsed = parseIosLogLine(message.line);
          if (parsed) addLog(parsed);
          break;
        }
        case 'IOS_LOG_BATCH': {
          if (!useIosLogStore.getState().running) break;
          const lines = message.lines as string[];
          const parsedBatch: IosLogEntry[] = [];
          for (const line of lines) {
            const parsed = parseIosLogLine(line);
            if (parsed) parsedBatch.push(parsed);
          }
          if (parsedBatch.length > 0) {
            addLog(parsedBatch);
          }
          break;
        }
        case 'IOS_LOG_ERROR': {
          console.error('iOS Log Error:', message.error);
          break;
        }
        case 'IOS_LOG_STARTED': {
          setRunning(true);
          setLoading(false);
          break;
        }
        case 'IOS_LOG_STOPPED': {
          console.log('Received IOS_LOG_STOPPED - setting running to false and clearing logs');
          setRunning(false);
          setLoading(false);
          // clearLogs();
          break;
        }
        case 'IOS_LOG_EXIT': {
          console.log('Received IOS_LOG_EXIT - setting running to false');
          setRunning(false);
          setLoading(false);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addLog, setRunning, setLoading, clearLogs]);

  return { logs, running, loading, startIosLog, stopIosLog, clearLogs };
}
