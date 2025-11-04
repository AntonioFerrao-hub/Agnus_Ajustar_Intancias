import axios from 'axios';
import { EvolutionInstance } from '../types';

interface EvolutionApiInfo {
  version: string;
  name: string;
  description: string;
}

interface CreateInstanceData {
  instanceName: string;
  token?: string;
  qrcode?: boolean;
  number?: string;
  webhook?: string;
  webhook_by_events?: boolean;
  events?: string[];
}

interface WebhookData {
  url: string;
  events: string[];
  webhook_by_events?: boolean;
}

class EvolutionApiService {
  private baseURL: string = '';
  private apiKey: string = '';

  setConfig(baseURL: string, apiKey: string) {
    this.baseURL = baseURL.replace(/\/$/, ''); // Remove trailing slash
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      'apikey': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
    if (!this.baseURL || !this.apiKey) {
      throw new Error('Evolution API service not configured. Call setConfig() first.');
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const axiosConfig: any = {
        method,
        url,
        headers: this.getHeaders(),
        timeout: 30000, // 30 seconds timeout
      };

      // Não enviar corpo em requisições GET para evitar payload "null"
      if (method !== 'GET' && data !== undefined && data !== null) {
        axiosConfig.data = data;
      }

      const response = await axios(axiosConfig);

      return response.data;
    } catch (error: any) {
      console.error(`Evolution API ${method} ${endpoint} error:`, error);
      
      if (error.response) {
        throw new Error(`Evolution API Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Evolution API: No response from server');
      } else {
        throw new Error(`Evolution API: ${error.message}`);
      }
    }
  }

  // Get API info
  async getApiInfo(): Promise<EvolutionApiInfo> {
    return await this.makeRequest<EvolutionApiInfo>('/');
  }

  // Get all instances (robusto para diferentes formatos de resposta)
  async getAllInstances(): Promise<EvolutionInstance[]> {
    const response = await this.makeRequest<any>('/instance/fetchInstances');
    if (Array.isArray(response)) return response as EvolutionInstance[]; // array direto
    if (response?.data && Array.isArray(response.data)) return response.data as EvolutionInstance[]; // { data: [...] }
    if (response?.instances && Array.isArray(response.instances)) return response.instances as EvolutionInstance[]; // { instances: [...] }
    if (response && typeof response === 'object' && (response.id || response.name)) {
      return [response as EvolutionInstance]; // objeto único
    }
    return [];
  }

  // Create instance
  async createInstance(instanceData: CreateInstanceData): Promise<EvolutionInstance> {
    const payload = {
      instanceName: instanceData.instanceName,
      token: instanceData.token,
      qrcode: instanceData.qrcode !== false, // Default to true
      number: instanceData.number,
      webhook: instanceData.webhook,
      webhook_by_events: instanceData.webhook_by_events || false,
      events: instanceData.events || [],
    };

    return await this.makeRequest<EvolutionInstance>('/instance/create', 'POST', payload);
  }

  // Get instance by name
  async getInstance(instanceName: string): Promise<EvolutionInstance | null> {
    try {
      return await this.makeRequest<EvolutionInstance>(`/instance/fetchInstances/${instanceName}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Delete instance
  async deleteInstance(instanceName: string): Promise<void> {
    await this.makeRequest(`/instance/delete/${instanceName}`, 'DELETE');
  }

  // Connect instance
  async connectInstance(instanceName: string): Promise<any> {
    return await this.makeRequest(`/instance/connect/${instanceName}`, 'GET');
  }

  // Logout instance
  async logoutInstance(instanceName: string): Promise<void> {
    await this.makeRequest(`/instance/logout/${instanceName}`, 'DELETE');
  }

  // Restart instance
  async restartInstance(instanceName: string): Promise<void> {
    await this.makeRequest(`/instance/restart/${instanceName}`, 'PUT');
  }

  // Get QR Code
  async getQRCode(instanceName: string): Promise<string> {
    const response = await this.makeRequest<{ base64: string }>(`/instance/connect/${instanceName}`);
    return response.base64;
  }

  // Set webhook
  async setWebhook(instanceName: string, webhookData: WebhookData): Promise<any> {
    return await this.makeRequest(`/webhook/set/${instanceName}`, 'POST', webhookData);
  }

  // Get webhook
  async getWebhook(instanceName: string): Promise<any> {
    return await this.makeRequest(`/webhook/find/${instanceName}`);
  }

  // Send message
  async sendMessage(instanceName: string, to: string, message: string): Promise<any> {
    const payload = {
      number: to,
      text: message,
    };

    return await this.makeRequest(`/message/sendText/${instanceName}`, 'POST', payload);
  }

  // Get instance status
  async getInstanceStatus(instanceName: string): Promise<{
    instance: {
      instanceName: string;
      status: string;
    };
  }> {
    return await this.makeRequest(`/instance/connectionState/${instanceName}`);
  }
}

// Export singleton instance
export const evolutionApiService = new EvolutionApiService();