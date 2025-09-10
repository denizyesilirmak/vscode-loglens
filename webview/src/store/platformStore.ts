import { create } from 'zustand';
import { useEffect } from 'react';

type Platform = 'ios' | 'android' | null;

interface PlatformState {
  currentPlatform: Platform;
  setPlatform: (platform: Platform) => void;
  initialized: boolean;
  init: () => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  currentPlatform: null,
  initialized: false,
  setPlatform: (platform) => set({ currentPlatform: platform }),
  init: () => {
    if (typeof window !== 'undefined' && !usePlatformStore.getState().initialized) {
      // Listener
      const handler = (event: MessageEvent) => {
        const msg = event.data;
        if (msg?.panel) {
          set({ currentPlatform: msg.panel, initialized: true });
          window.removeEventListener('message', handler);
        }
      };
      window.addEventListener('message', handler);
      window.vscode?.postMessage({ type: 'GET_CURRENT_PANEL' });
    }
  },
}));

export function usePlatform() {
  const currentPlatform = usePlatformStore((s) => s.currentPlatform);
  const init = usePlatformStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return { currentPlatform };
}
