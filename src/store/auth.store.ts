// ==========================================
// BhoomiAI - Auth Store (Zustand)
// ==========================================

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole, Permission, ROLE_PERMISSIONS, GOVERNMENT_ROLES } from '../types/auth';
import type { Jurisdiction } from '../types/common';
import { authService } from '../services/auth.service';
import { MOCK_USERS } from '../data/mock-users';

interface AuthStore {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  mfaPending: boolean;
  sessionId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<boolean>;
  verifyMFA: (otp: string) => Promise<boolean>;
  logout: () => void;
  citizenLogin: (email: string, password: string) => Promise<boolean>;
  clearError: () => void;

  // Demo helper
  switchRole: (userId: string) => void;

  // Permission checks
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

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          if (response.requiresMFA) {
            set({
              mfaPending: true,
              sessionId: response.sessionId,
              user: response.user,
              isLoading: false,
            });
            return true;
          }
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            mfaPending: false,
            isLoading: false,
          });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      verifyMFA: async (otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const result = await authService.verifyMFA({
            sessionId: get().sessionId || '',
            otp,
          });
          if (result.success) {
            set({
              token: result.token,
              isAuthenticated: true,
              mfaPending: false,
              isLoading: false,
            });
            return true;
          }
          set({ error: 'Invalid OTP', isLoading: false });
          return false;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          mfaPending: false,
          sessionId: null,
          error: null,
        });
      },

      citizenLogin: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authService.login({ email, password });
          if (response.user.role !== UserRole.CITIZEN) {
            set({ error: 'Please use the Government Portal for employee login.', isLoading: false });
            return false;
          }
          set({
            user: response.user,
            token: response.token,
            isAuthenticated: true,
            mfaPending: false,
            isLoading: false,
          });
          return true;
        } catch (err: any) {
          set({ error: err.message, isLoading: false });
          return false;
        }
      },

      clearError: () => set({ error: null }),

      // Demo role switcher for SIH presentation
      switchRole: (userId: string) => {
        const user = MOCK_USERS.find(u => u.id === userId);
        if (user) {
          set({
            user,
            token: `mock-jwt-${user.id}-${Date.now()}`,
            isAuthenticated: true,
            mfaPending: false,
            error: null,
          });
        }
      },

      hasPermission: (permission: Permission) => {
        const user = get().user;
        if (!user) return false;
        const permissions = ROLE_PERMISSIONS[user.role];
        return permissions?.includes(permission) ?? false;
      },

      hasAnyPermission: (permissions: Permission[]) => {
        const user = get().user;
        if (!user) return false;
        const userPermissions = ROLE_PERMISSIONS[user.role];
        return permissions.some(p => userPermissions?.includes(p));
      },

      isGovernmentUser: () => {
        const user = get().user;
        if (!user) return false;
        return GOVERNMENT_ROLES.includes(user.role);
      },

      getJurisdiction: () => {
        const user = get().user;
        return user?.jurisdiction || null;
      },
    }),
    {
      name: 'bhoomi-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
