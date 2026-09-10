// ==========================================
// BhoomiAI - Auth Service (Mock)
// ==========================================

import { delay } from './api-client';
import { LoginRequest, LoginResponse, User, MFARequest } from '../types/auth';
import { MOCK_USERS, DEMO_PASSWORDS, findUserByCredentials } from '../data/mock-users';

export const authService = {
  async login(request: LoginRequest): Promise<LoginResponse> {
    await delay(800);
    const user = findUserByCredentials(request.email);
    if (!user) throw new Error('Invalid credentials. User not found.');
    const validPassword = DEMO_PASSWORDS[request.email] || DEMO_PASSWORDS[user.employeeId || ''];
    if (!validPassword || request.password !== validPassword) {
      throw new Error('Invalid credentials. Please check your email/ID and password.');
    }
    if (user.status === 'suspended') throw new Error('Account suspended. Contact administrator.');
    return {
      user,
      token: `mock-jwt-${user.id}-${Date.now()}`,
      requiresMFA: user.mfaEnabled,
      sessionId: `session-${Date.now()}`,
    };
  },

  async verifyMFA(_request: MFARequest): Promise<{ success: boolean; token: string }> {
    await delay(600);
    // Accept any 6-digit OTP for demo
    return { success: true, token: `mock-jwt-mfa-${Date.now()}` };
  },

  async logout(): Promise<void> {
    await delay(300);
  },

  async citizenRegister(data: { name: string; mobile: string; email?: string; password: string }): Promise<User> {
    await delay(800);
    const newUser: User = {
      id: `usr-${Date.now()}`,
      name: data.name,
      email: data.email || '',
      mobile: data.mobile,
      role: 'citizen' as User['role'],
      jurisdiction: { state: 'Uttar Pradesh' },
      status: 'active',
      createdAt: new Date().toISOString(),
      mfaEnabled: false,
    };
    return newUser;
  },

  async getCurrentUser(userId: string): Promise<User | null> {
    await delay(200);
    return MOCK_USERS.find(u => u.id === userId) || null;
  },
};
