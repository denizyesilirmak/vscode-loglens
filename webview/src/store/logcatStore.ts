// useLogcatStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';
import { parseLogLine } from '../utils/adb';

export interface LogEntry {
  Time: string;
  PID: string;
  TID?: string;
  Tag: string;
  Message: string;
}

interface LogcatState {
  logs: LogEntry[];
  loading: boolean;
  running: boolean;
  startLogcat: (options: { device: string; level?: string; buffer?: string }) => void;
  stopLogcat: () => void;
  clearLogs: () => void;
  addLog: (log: LogEntry) => void;
  setRunning: (running: boolean) => void;
  setLoading: (loading: boolean) => void;
}

declare const vscode: {
  postMessage: (msg: any) => void;
};

const MAX_LOGS = 200;

export const useLogcatStore = create<LogcatState>((set) => ({
  logs: [],
  loading: false,
  running: false,

  startLogcat: (options) => {
    set({ loading: true });
    vscode.postMessage({ type: 'ADB_START_LOGCAT', options });
  },

  stopLogcat: () => {
    vscode.postMessage({ type: 'ADB_STOP_LOGCAT' });
    set({ running: false });
  },

  clearLogs: () => set({ logs: [] }),

  addLog: (log) =>
    set((state) => {
      const newLogs = [...state.logs, log];
      return { logs: newLogs.slice(-MAX_LOGS) }; // son 200
    }),

  setRunning: (running) => set({ running }),
  setLoading: (loading) => set({ loading }),
}));

// Custom hook
export function useLogcat() {
  const { logs, startLogcat, stopLogcat, clearLogs, addLog, setRunning, setLoading } =
    useLogcatStore();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      switch (message.type) {
        case 'ADB_LOG': {
          const parsed = parseLogLine(message.line);
          if (parsed) addLog(parsed);
          break;
        }
        case 'ADB_LOG_ERROR': {
          console.error('ADB Log Error:', message.error);
          break;
        }
        case 'ADB_LOGCAT_STARTED': {
          setRunning(true);
          setLoading(false);
          break;
        }
        case 'ADB_LOGCAT_STOPPED': {
          setRunning(false);
          setLoading(false);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addLog, setRunning, setLoading]);

  // Artık hook'tan start/stop/clear da dönüyor
  return { logs, startLogcat, stopLogcat, clearLogs };
}
