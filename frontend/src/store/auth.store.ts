// ==========================================
// BhumiSetu - Auth Store (Zustand) backed by the real API
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Permission, ROLE_PERMISSIONS, GOVERNMENT_ROLES } from '../types/auth';
import type { Jurisdiction } from '../types/common';
import { authService } from '../services/auth.service';
import { getToken, setUnauthorizedHandler } from '../services/api-client';

/** Backend permission names: upload, view_docs, review, supervise, view_records, dashboard, admin, system_admin, audit. */
export type BackendPermission = 'upload' | 'view_docs' | 'review' | 'supervise' | 'view_records' | 'dashboard' | 'admin' | 'system_admin' | 'audit';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaPending: boolean;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;

  login: (username: string, password: string) => Promise<boolean>;
  verifyMFA: (otp: string) => Promise<boolean>;
  logout: () => void;
  citizenLogin: (email: string, password: string) => Promise<boolean>;
  clearError: () => void;
  refresh: () => Promise<void>;

  /** Real backend permission check. */
  can: (p: BackendPermission) => boolean;
  hasPermission: (permission: Permission) => boolean;
  hasAnyPermission: (permissions: Permission[]) => boolean;
  isGovernmentUser: () => boolean;
  getJurisdiction: () => Jurisdiction | null;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      mfaPending: false,
      sessionId: null,
      isLoading: false,
      error: null,

      login: async (username, password) => {
        set({ isLoading: true, error: null });
        try {
          const { user, token } = await authService.login(username, password);
          set({ user, token, isAuthenticated: true, mfaPending: false, isLoading: false });
          return true;
        } catch (err: any) {
          set({ error: err.message || 'Sign-in failed', isLoading: false });
          return false;
        }
      },

      verifyMFA: async () => true,

      logout: () => {
        authService.logout();
        set({ user: null, token: null, isAuthenticated: false, mfaPending: false, sessionId: null, error: null });
      },

      citizenLogin: async () => {
        set({ error: 'Citizens can search published records without signing in.' });
        return false;
      },

      clearError: () => set({ error: null }),

      refresh: async () => {
        if (!getToken()) return;
        try { set({ user: await authService.me() }); } catch { /* 401 handled globally */ }
      },

      can: (p) => !!get().user?.permissions?.includes(p),

      hasPermission: (permission) => {
        const user = get().user;
        return !!user && (ROLE_PERMISSIONS[user.role]?.includes(permission) ?? false);
      },
      hasAnyPermission: (permissions) => {
        const user = get().user;
        if (!user) return false;
        const mine = ROLE_PERMISSIONS[user.role] || [];
        return permissions.some(p => mine.includes(p));
      },
      isGovernmentUser: () => {
        const user = get().user;
        return !!user && GOVERNMENT_ROLES.includes(user.role);
      },
      getJurisdiction: () => get().user?.jurisdiction || null,
    }),
    {
      name: 'bhoomi-auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      // A persisted session without a stored API token (e.g. from the old mock build) is not a session.
      onRehydrateStorage: () => (state) => {
        if (state && (!getToken() || !state.user?.permissions)) {
          state.user = null; state.token = null; state.isAuthenticated = false;
        }
      },
    }
  )
);

setUnauthorizedHandler(() => {
  useAuthStore.getState().logout();
  if (!['/', '/login', '/search'].includes(window.location.pathname)) window.location.href = '/login';
});
