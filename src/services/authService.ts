import api from '../api';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions?: string[] | null;
}

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data as { token: string; user: AuthUser };
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  },
  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },
  getUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw) as AuthUser; } catch { return null; }
  },
  isAuthenticated(): boolean {
    return !!localStorage.getItem(TOKEN_KEY);
  },
  async changePassword(currentPassword: string, newPassword: string) {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  }
};