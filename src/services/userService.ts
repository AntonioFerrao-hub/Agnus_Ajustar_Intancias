import api from '../api';

export type CreateUserPayload = {
  name: string;
  email: string;
  password: string;
  passwordConfirm?: string;
  role: 'admin' | 'user';
  permissions?: string[];
};

export type UpdateUserPayload = Partial<CreateUserPayload> & { active?: boolean };

export type AppUser = {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'user';
  permissions?: string[] | null;
  createdAt: string;
  lastActive?: string;
  status: 'active' | 'inactive';
};

export const userService = {
  async getUsers(): Promise<AppUser[]> {
    const response = await api.get('/users');
    return response.data;
  },

  async createUser(payload: CreateUserPayload): Promise<AppUser> {
    const response = await api.post('/users', payload);
    return response.data;
  },

  async updateUser(id: string, payload: UpdateUserPayload): Promise<AppUser> {
    const response = await api.put(`/users/${id}`, payload);
    return response.data;
  },

  async deleteUser(id: string): Promise<void> {
    await api.delete(`/users/${id}`);
  },
};