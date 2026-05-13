import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  activePanel: 'risk' | 'detail' | 'community' | null;
  graphColorMode: 'risk' | 'community';
  setSidebarOpen: (open: boolean) => void;
  setActivePanel: (panel: UIStore['activePanel']) => void;
  setGraphColorMode: (mode: UIStore['graphColorMode']) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  activePanel: 'risk',
  graphColorMode: 'risk',
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActivePanel: (panel) => set({ activePanel: panel }),
  setGraphColorMode: (mode) => set({ graphColorMode: mode }),
}));
