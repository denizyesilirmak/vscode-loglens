// useAdbStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';

export interface AdbDevice {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | string;
  props: Record<string, string>;
}

export interface DeviceProcess {
  pid: string;
  name: string;
}

interface AdbState {
  devices: AdbDevice[];
  processes: DeviceProcess[]; // List of running processes
  selectedDevice: AdbDevice | null;
  loading: boolean;
  setDevices: (devices: AdbDevice[]) => void;
  setProcesses: (processes: DeviceProcess[]) => void;
  setSelectedDevice: (device: AdbDevice | null) => void;
  refreshDevices: () => void;
  refreshProcesses: (deviceId: string) => void;
  clearProcesses: () => void;
}

declare const vscode: {
  postMessage: (msg: any) => void;
};

export const useAdbStore = create<AdbState>((set) => ({
  devices: [],
  processes: [],
  selectedDevice: null,
  loading: false,

  setDevices: (devices) => set({ devices }),
  setProcesses: (processes) => set({ processes }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  refreshDevices: () => {
    set({ loading: true });
    vscode.postMessage({ type: 'GET_ADB_DEVICES' });
  },

  refreshProcesses: (deviceId) => {
    vscode.postMessage({ type: 'GET_ADB_PROCESSES', deviceId });
  },

  clearProcesses: () => set({ processes: [] }),
}));

export function useAdb() {
  const devices = useAdbStore((s) => s.devices);
  const selectedDevice = useAdbStore((s) => s.selectedDevice);
  const processes = useAdbStore((s) => s.processes);
  const refreshDevices = useAdbStore((s) => s.refreshDevices);
  const refreshProcesses = useAdbStore((s) => s.refreshProcesses);
  const clearProcesses = useAdbStore((s) => s.clearProcesses);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.devices) {
        useAdbStore.setState({ devices: msg.devices, loading: false });
      }
      if (msg.type === 'ADB_PROCESSES_LIST') {
        useAdbStore.setState({ processes: msg.processes });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { devices, processes, selectedDevice, refreshDevices, refreshProcesses, clearProcesses };
}
