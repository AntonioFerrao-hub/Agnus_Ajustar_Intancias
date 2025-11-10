import api from '../api';
import { Connection, CreateConnectionPayload } from '../types';

export const connectionService = {
  async getConnections(): Promise<Connection[]> {
    const response = await api.get('/connections');
    return response.data;
  },

  async createConnection(connectionData: CreateConnectionPayload): Promise<Connection> {
    const response = await api.post('/connections', connectionData);
    return response.data;
  },

  async updateConnection(id: string, connectionData: Partial<CreateConnectionPayload> | Partial<Connection>): Promise<Connection> {
    const response = await api.put(`/connections/${id}`, connectionData as any);
    return response.data;
  },

  async deleteConnection(id: string): Promise<void> {
    await api.delete(`/connections/${id}`);
  },

  async getQRCode(id: string): Promise<{ qrCode: string }> {
    const response = await api.get(`/connections/${id}/qrcode`);
    return response.data;
  },

  async exportConnections(payload: { type: 'evolution' | 'wuzapi'; serverId: string; items: any[]; batchId?: string; exportDate?: string }): Promise<{ inserted: number; updated: number; results: any[]; batchId: string }> {
    const response = await api.post('/connections/export', payload);
    return response.data;
  },
};