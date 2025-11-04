import api from '../api';

export interface WebhookPayload {
  name: string;
  description?: string;
  url: string;
  status?: 'active' | 'inactive' | 'error';
  events?: string[];
}

export interface WebhookRecord {
  id: string;
  name: string;
  description?: string;
  url: string;
  status: 'active' | 'inactive' | 'error';
  events: string[];
  createdAt: string;
  lastTriggered?: string | null;
}

export const webhookService = {
  async init(): Promise<void> {
    await api.post('/webhooks/init');
  },

  async list(): Promise<WebhookRecord[]> {
    const { data } = await api.get('/webhooks');
    return data;
  },

  async create(payload: WebhookPayload): Promise<WebhookRecord> {
    const { data } = await api.post('/webhooks', payload);
    return data;
  },

  async update(id: string, payload: WebhookPayload): Promise<WebhookRecord> {
    const { data } = await api.put(`/webhooks/${id}`, payload);
    return data;
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/webhooks/${id}`);
  }
};