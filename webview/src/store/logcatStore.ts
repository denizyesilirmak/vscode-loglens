// useLogcatStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';
import { parseLogLine } from '../utils/adb';

export interface LogEntry {
  Time: string;
  PID: string;
  ProcessName?: string; // Process name resolved from PID
  TID?: string;
  Level?: string; // Added Level
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
  addLog: (logs: LogEntry | LogEntry[]) => void;
  setRunning: (running: boolean) => void;
  setLoading: (loading: boolean) => void;
}

declare const vscode: {
  postMessage: (msg: unknown) => void;
};

// Removed unused LogMessage interface

const MAX_LOGS = 50000; // Increased limit for visualization
const BATCH_SIZE_LIMIT = 1000;

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
    set({ running: false, loading: false });
    vscode.postMessage({ type: 'ADB_STOP_LOGCAT' });
    setTimeout(() => {
      set({ logs: [] });
    }, 100);
  },

  clearLogs: () => set({ logs: [] }),

  addLog: (newLogs) =>
    set((state) => {
      const incoming = Array.isArray(newLogs) ? newLogs : [newLogs];
      if (incoming.length === 0) return {};

      // We need to work with a copy to mutate safely if we merge into the last element
      const currentLogs = [...state.logs];

      for (const log of incoming) {
        const lastLog = currentLogs[currentLogs.length - 1];

        // Check for merge capability
        // Matching: PID, TID (if exists), Tag, Level
        // We rely on consistent properties. 
        if (
          lastLog &&
          lastLog.PID === log.PID &&
          lastLog.Tag === log.Tag &&
          lastLog.Level === log.Level &&
          lastLog.TID === log.TID
        ) {
          // Merge: Append message with newline
          // We must create a new object for the last log to trigger React updates (immutability) if we were just replacing it, 
          // but since we are replacing the whole 'logs' array in the store, mutating the local 'lastLog' reference within 'currentLogs' is fine 
          // AS LONG AS 'lastLog' is a copy or we treat it carefully. 
          // Actually, 'lastLog' is a reference to an object in 'state.logs'. Mutating it directly is bad practice in Zustand/Redux.
          // Let's replace the last log with a merged version.

          currentLogs[currentLogs.length - 1] = {
            ...lastLog,
            Message: lastLog.Message + '\n' + log.Message
          };
        } else {
          currentLogs.push(log);
        }
      }

      // Trim if too large
      if (currentLogs.length > MAX_LOGS) {
        return { logs: currentLogs.slice(-MAX_LOGS) };
      }
      return { logs: currentLogs };
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
      // console.log('Received message:', message.type); 
      switch (message.type) {
        case 'ADB_LOG': {
          if (!useLogcatStore.getState().running) break;
          const parsed = parseLogLine(message.line);
          if (parsed) {
            addLog({
              ...parsed,
              ProcessName: message.processName,
            });
          }
          break;
        }
        case 'ADB_LOG_BATCH': {
          if (!useLogcatStore.getState().running) break;
          const lines = message.lines as string[];
          const parsedBatch: LogEntry[] = [];

          for (const line of lines) {
            const parsed = parseLogLine(line);
            if (parsed) {
              // We don't get processName per line in batch easily unless parsed from line or passed separately
              // For now assuming processName is not attached to every line in batch mode from backend yet
              parsedBatch.push(parsed as LogEntry);
            }
          }
          if (parsedBatch.length > 0) {
            addLog(parsedBatch);
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
