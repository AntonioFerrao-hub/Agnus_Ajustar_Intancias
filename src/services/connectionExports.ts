import api from '../api';

export interface ConnectionExportSnapshot {
  id: string;
  batchId: string;
  serverId: string;
  type: 'evolution' | 'wuzapi';
  exportedAt: string;
  itemCount: number;
}

export async function getConnectionExports(params?: { serverId?: string; type?: 'evolution' | 'wuzapi' }): Promise<ConnectionExportSnapshot[]> {
  const response = await api.get('/connections/exports', { params });
  return response.data as ConnectionExportSnapshot[];
}