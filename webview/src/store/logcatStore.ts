// useLogcatStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';
import { parseLogLine } from '../utils/adb';

export interface LogEntry {
  Time: string;
  PID: string;
  ProcessName?: string; // Process name resolved from PID
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
  postMessage: (msg: unknown) => void;
};

interface LogMessage {
  type: 'ADB_LOG';
  line: string;
  processName?: string;
}

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
    console.log('stopLogcat called - sending ADB_STOP_LOGCAT message');
    // İlk önce frontend'te durdur
    set({ running: false, loading: false });
    // Sonra backend'e mesaj gönder
    vscode.postMessage({ type: 'ADB_STOP_LOGCAT' });
    // Log'ları da temizle
    setTimeout(() => {
      set({ logs: [] });
    }, 100);
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
  const {
    logs,
    running,
    loading,
    startLogcat,
    stopLogcat,
    clearLogs,
    addLog,
    setRunning,
    setLoading,
  } = useLogcatStore();

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;
      console.log('Received message:', message.type); // DEBUG: tüm mesajları logla
      switch (message.type) {
        case 'ADB_LOG': {
          // Eğer running false ise yeni log ekleme!
          if (!useLogcatStore.getState().running) {
            console.log('Ignoring ADB_LOG because running is false');
            break;
          }

          const parsed = parseLogLine(message.line);
          if (parsed) {
            // Debug log to see if process names are being received
            if (message.processName) {
              console.log(`Process name for PID ${parsed.PID}: ${message.processName}`);
            }
            const logEntry: LogEntry = {
              ...parsed,
              ProcessName: message.processName,
            };
            addLog(logEntry);
          }
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
          console.log('Received ADB_LOGCAT_STOPPED - setting running to false and clearing logs');
          setRunning(false);
          setLoading(false);
          // KRITIK: Stop edildiğinde log'ları temizle!
          clearLogs();
          break;
        }
        case 'ADB_LOGCAT_EXIT': {
          console.log('Received ADB_LOGCAT_EXIT - setting running to false');
          setRunning(false);
          setLoading(false);
          break;
        }
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [addLog, setRunning, setLoading, clearLogs]);

  return { logs, running, loading, startLogcat, stopLogcat, clearLogs };
}
