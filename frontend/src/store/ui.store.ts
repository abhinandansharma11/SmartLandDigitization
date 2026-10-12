// ==========================================
// BhumiSetu - UI Store (Zustand)
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

  toasts: { id: number; title: string; body?: string; kind: 'success' | 'error' | 'info' }[];
  toast: (title: string, opts?: { body?: string; kind?: 'success' | 'error' | 'info' }) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

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

  toasts: [],
  toast: (title, opts = {}) => {
    const id = ++toastId;
    set((s) => ({ toasts: [...s.toasts, { id, title, body: opts.body, kind: opts.kind || 'success' }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })), opts.kind === 'error' ? 7000 : 4000);
  },
  dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));

/** Shorthand usable outside React components. */
export const toast = (title: string, opts?: { body?: string; kind?: 'success' | 'error' | 'info' }) => useUIStore.getState().toast(title, opts);
