import { create } from 'zustand';

type Screen = 'home' | 'logs' | 'settings' | 'about';

interface UIState {
  currentScreen: Screen;
  setScreen: (screen: Screen) => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentScreen: 'home',
  setScreen: (screen) => set({ currentScreen: screen }),
}));

// Custom hook for easier usage
export function useNavigation() {
  const currentScreen = useUIStore((s) => s.currentScreen);
  const navigate = useUIStore((s) => s.setScreen);
  return { currentScreen, navigate };
}
