// useAdbStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';

export interface AdbDevice {
  id: string;
  status: 'device' | 'offline' | 'unauthorized' | string;
  props: Record<string, string>;
}

interface AdbState {
  devices: AdbDevice[];
  selectedDevice: AdbDevice | null;
  loading: boolean;
  setDevices: (devices: AdbDevice[]) => void;
  setSelectedDevice: (device: AdbDevice | null) => void;
  refreshDevices: () => void;
}

declare const vscode: {
  postMessage: (msg: any) => void;
};

export const useAdbStore = create<AdbState>((set) => ({
  devices: [],
  selectedDevice: null,
  loading: false,

  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  refreshDevices: () => {
    set({ loading: true });
    vscode.postMessage({ type: 'GET_ADB_DEVICES' });
  },
}));

export function useAdb() {
  const devices = useAdbStore((s) => s.devices);
  const refreshDevices = useAdbStore((s) => s.refreshDevices);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.devices) {
        useAdbStore.setState({ devices: msg.devices, loading: false });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { devices, refreshDevices };
}
