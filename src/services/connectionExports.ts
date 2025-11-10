import axios from 'axios';

export interface ConnectionExportSnapshot {
  id: string;
  batchId: string;
  serverId: string;
  type: 'evolution' | 'wuzapi';
  exportedAt: string;
  itemCount: number;
}

export async function getConnectionExports(params?: { serverId?: string; type?: 'evolution' | 'wuzapi' }): Promise<ConnectionExportSnapshot[]> {
  const response = await axios.get('/api/connections/exports', { params });
  return response.data;
}