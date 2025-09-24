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
  addLog: (log: IosLogEntry) => void;
  setRunning: (running: boolean) => void;
  setLoading: (loading: boolean) => void;
}

declare const vscode: {
  postMessage: (msg: unknown) => void;
};

const MAX_LOGS = 200;

export const useIosLogStore = create<IosLogState>((set) => ({
  logs: [],
  loading: false,
  running: false,

  startIosLog: (options) => {
    set({ loading: true });
    vscode.postMessage({ type: 'IOS_START_LOG', options });
  },

  stopIosLog: () => {
    vscode.postMessage({ type: 'IOS_STOP_LOG' });
    set({ running: false });
  },

  clearLogs: () => set({ logs: [] }),

  addLog: (log) =>
    set((state) => {
      const newLogs = [...state.logs, log];
      return { logs: newLogs.slice(-MAX_LOGS) }; // keep last 200
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
          const parsed = parseIosLogLine(message.line);
          if (parsed) addLog(parsed);
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
          setRunning(false);
          setLoading(false);
          break;
        }
        case 'IOS_LOG_EXIT': {
          setRunning(false);
          setLoading(false);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addLog, setRunning, setLoading]);

  return { logs, running, loading, startIosLog, stopIosLog, clearLogs };
}
