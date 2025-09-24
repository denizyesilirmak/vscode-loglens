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
    console.log('stopIosLog called - sending IOS_STOP_LOG message');
    // İlk önce frontend'te durdur
    set({ running: false, loading: false });
    // Sonra backend'e mesaj gönder
    vscode.postMessage({ type: 'IOS_STOP_LOG' });
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
          if (!useIosLogStore.getState().running) {
            console.log('Ignoring IOS_LOG because running is false');
            break;
          }

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
