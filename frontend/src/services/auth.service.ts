// ==========================================
// BhumiSetu - Auth Service (real backend)
// ==========================================

import { apiClient, setToken } from './api-client';
import { BUser, toUser } from './backend';
import type { User } from '../types/auth';

export const authService = {
  /** `login` accepts the backend sign-in name (e.g. "reviewer"). */
  async login(username: string, password: string): Promise<{ user: User; token: string }> {
    const r = await apiClient.post<{ token: string; user: BUser }>('/auth/login', { username: username.trim(), password });
    setToken(r.token);
    return { user: toUser(r.user), token: r.token };
  },
  async me(): Promise<User> {
    return toUser(await apiClient.get<BUser>('/auth/me'));
  },
  logout() { setToken(null); },
};
