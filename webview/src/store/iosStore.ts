// useIosStore.ts
import { create } from 'zustand';
import { useEffect } from 'react';

export interface SimulatorDevice {
  name: string;
  udid: string;
  state: 'Booted' | 'Shutdown' | string;
  runtime?: string;
}

interface IosState {
  devices: SimulatorDevice[];
  selectedDevice: SimulatorDevice | null;
  loading: boolean;
  setDevices: (devices: SimulatorDevice[]) => void;
  setSelectedDevice: (device: SimulatorDevice | null) => void;
  refreshDevices: () => void;
}

declare const vscode: {
  postMessage: (msg: any) => void;
};

export const useIosStore = create<IosState>((set) => ({
  devices: [],
  selectedDevice: null,
  loading: false,

  setDevices: (devices) => set({ devices }),
  setSelectedDevice: (device) => set({ selectedDevice: device }),

  refreshDevices: () => {
    set({ loading: true });
    vscode.postMessage({ type: 'GET_BOOTED_SIMULATORS' });
  },
}));

export function useIos() {
  const devices = useIosStore((s) => s.devices);
  const refreshDevices = useIosStore((s) => s.refreshDevices);

  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const msg = event.data;
      if (msg.bootedSimulators) {
        useIosStore.setState({ devices: msg.bootedSimulators, loading: false });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  return { devices, refreshDevices };
}
