// ==========================================
// BhoomiAI - API Client
// ==========================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// Simulate network latency
export function delay(ms: number = 600): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulated API client — will be replaced with real fetch/axios when backend is ready
export const apiClient = {
  baseURL: API_BASE_URL,

  async get<T>(endpoint: string, _params?: Record<string, unknown>): Promise<T> {
    await delay(400 + Math.random() * 400);
    console.log(`[API Mock] GET ${API_BASE_URL}${endpoint}`);
    throw new Error(`API not connected. Endpoint: ${endpoint}`);
  },

  async post<T>(endpoint: string, _data?: unknown): Promise<T> {
    await delay(500 + Math.random() * 500);
    console.log(`[API Mock] POST ${API_BASE_URL}${endpoint}`);
    throw new Error(`API not connected. Endpoint: ${endpoint}`);
  },

  async put<T>(endpoint: string, _data?: unknown): Promise<T> {
    await delay(400 + Math.random() * 400);
    console.log(`[API Mock] PUT ${API_BASE_URL}${endpoint}`);
    throw new Error(`API not connected. Endpoint: ${endpoint}`);
  },

  async delete<T>(endpoint: string): Promise<T> {
    await delay(300);
    console.log(`[API Mock] DELETE ${API_BASE_URL}${endpoint}`);
    throw new Error(`API not connected. Endpoint: ${endpoint}`);
  },
};
