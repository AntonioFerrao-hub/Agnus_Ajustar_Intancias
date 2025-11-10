import axios, { AxiosRequestHeaders } from 'axios';
import { Server, ServerFormData } from './types';

// Permite definir a base de API via env em tempo de build (ex.: preview/produção)
// Fallback para '/api' em desenvolvimento com proxy do Vite.
const apiBaseURL = (import.meta as any)?.env?.VITE_API_BASE_URL || '/api';
const api = axios.create({
  baseURL: apiBaseURL,
});

// Attach JWT token if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    const headers = (config.headers ?? {}) as AxiosRequestHeaders;
    (headers as any).Authorization = `Bearer ${token}`;
    config.headers = headers;
  }
  return config;
});

// Redirect to login on 401 and clear auth
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      try {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } catch {}
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const getServers = async (): Promise<Server[]> => {
  const response = await api.get('/servers');
  return response.data;
};

export const addServer = async (serverData: ServerFormData): Promise<Server> => {
  const response = await api.post('/servers', serverData);
  return response.data;
};

export const updateServer = async (id: string, serverData: ServerFormData): Promise<Server> => {
  const response = await api.put(`/servers/${id}`, serverData);
  return response.data;
};

export const deleteServer = async (id: string): Promise<void> => {
  await api.delete(`/servers/${id}`);
};

export default api;