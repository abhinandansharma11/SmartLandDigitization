// ==========================================
// BhoomiAI - UI Store (Zustand)
// ==========================================

import { create } from 'zustand';

interface UIStore {
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  activeModal: string | null;
  modalData: Record<string, unknown> | null;
  drawerOpen: boolean;
  drawerContent: string | null;
  globalSearchOpen: boolean;

  toggleSidebar: () => void;
  toggleSidebarCollapse: () => void;
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;
  openDrawer: (content: string) => void;
  closeDrawer: () => void;
  toggleGlobalSearch: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  sidebarCollapsed: false,
  activeModal: null,
  modalData: null,
  drawerOpen: false,
  drawerContent: null,
  globalSearchOpen: false,

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleSidebarCollapse: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  openModal: (modalId, data) => set({ activeModal: modalId, modalData: data || null }),
  closeModal: () => set({ activeModal: null, modalData: null }),
  openDrawer: (content) => set({ drawerOpen: true, drawerContent: content }),
  closeDrawer: () => set({ drawerOpen: false, drawerContent: null }),
  toggleGlobalSearch: () => set((s) => ({ globalSearchOpen: !s.globalSearchOpen })),
}));
