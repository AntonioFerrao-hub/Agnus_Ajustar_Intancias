import axios from 'axios';
import api from '../api';
import { WuzapiUser, WuzapiUsersResponse } from '../types';

class WuzApiService {
  private baseURL: string = '';
  private apiKey: string = '';

  setConfig(baseURL: string, apiKey: string) {
    // Normaliza URL: remove barras finais e sufixo '/admin' se presente
    const trimmed = String(baseURL).trim();
    const noTrailing = trimmed.replace(/\/+$/, '');
    const normalized = noTrailing.replace(/\/admin$/i, '');
    this.baseURL = normalized;
    this.apiKey = apiKey;
  }

  private getHeaders() {
    return {
      // WUZAPI espera Authorization com a chave direta (sem Bearer)
      'Authorization': this.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  private async makeRequest<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any): Promise<T> {
    if (!this.baseURL || !this.apiKey) {
      throw new Error('WUZAPI service not configured. Call setConfig() first.');
    }

    const url = `${this.baseURL}${endpoint}`;
    
    try {
      const response = await axios({
        method,
        url,
        headers: this.getHeaders(),
        data,
        timeout: 30000, // 30 seconds timeout
      });

      return response.data;
    } catch (error: any) {
      console.error(`WUZAPI ${method} ${endpoint} error:`, error);
      
      if (error.response) {
        throw new Error(`WUZAPI Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('WUZAPI: No response from server');
      } else {
        throw new Error(`WUZAPI: ${error.message}`);
      }
    }
  }

  // Get all users
  async getUsers(): Promise<WuzapiUser[]> {
    const response = await this.makeRequest<WuzapiUsersResponse>('/admin/users');
    return response.data || [];
  }

  // Create a new user
  async createUser(userData: {
    name: string;
    token?: string;
    webhook_url?: string;
  }): Promise<WuzapiUser> {
    const payload = {
      name: userData.name,
      token: userData.token || userData.name.toLowerCase().replace(/\s+/g, '_'),
      webhook_url: userData.webhook_url || '',
    };

    return await this.makeRequest<WuzapiUser>('/admin/users', 'POST', payload);
  }

  // Get user by token
  async getUserByToken(token: string): Promise<WuzapiUser | null> {
    try {
      return await this.makeRequest<WuzapiUser>(`/admin/users/${token}`);
    } catch (error: any) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Delete user
  async deleteUser(token: string): Promise<void> {
    await this.makeRequest(`/admin/users/${token}`, 'DELETE');
  }

  // Get QR Code for user
  async getQRCode(token: string): Promise<string> {
    // Primeiro tenta endpoint de sessão como no PHP
    if (!this.baseURL || !this.apiKey) {
      throw new Error('WUZAPI service not configured. Call setConfig() first.');
    }
    const url = `${this.baseURL}/session/qr`;
    try {
      const response = await axios({
        method: 'GET',
        url,
        headers: {
          'token': token,
          'Accept': 'application/json',
        },
        timeout: 30000,
      });
      const data = response.data;
      // Respostas possíveis: { qrcode }, { QRCode }, { qrCode }, { data: { qrcode|QRCode|qrCode } }, ou string base64
      const base64 =
        data?.qr ||
        data?.qrcode ||
        data?.QRCode ||
        data?.qrCode ||
        data?.data?.qr ||
        data?.data?.qrcode ||
        data?.data?.QRCode ||
        data?.data?.qrCode ||
        (typeof data === 'string' ? data : null);
      if (!base64) {
        throw new Error('QR Code não encontrado na resposta');
      }
      return base64;
    } catch (sessionErr: any) {
      // Fallback para endpoint REST /users/{token}/qrcode
      try {
        const response = await this.makeRequest<{ qrcode: string }>(`/users/${token}/qrcode`);
        return (response as any)?.qr || response.qrcode;
      } catch (userErr: any) {
        console.error('WUZAPI QR error (session, users):', sessionErr?.message, userErr?.message);
        throw new Error(sessionErr?.message || userErr?.message || 'Falha ao obter QR Code');
      }
    }
  }

  // Get user status
  async getUserStatus(token: string): Promise<{
    connected: boolean;
    loggedIn: boolean;
    jid?: string;
  }> {
    const response = await this.makeRequest<{
      connected: boolean;
      loggedIn: boolean;
      jid?: string;
    }>(`/users/${token}/status`);
    return response;
  }

  // Connect user session (WU /session/connect)
  async connectSession(token: string, payload?: {
    Subscribe?: string[];
    Immediate?: boolean;
  }): Promise<any> {
    if (!this.baseURL || !this.apiKey) {
      throw new Error('WUZAPI service not configured. Call setConfig() first.');
    }
    const url = `${this.baseURL}/session/connect`;
    try {
      const response = await axios({
        method: 'POST',
        url,
        headers: {
          'token': token,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        data: payload || { Subscribe: ['Message', 'ChatPresence'], Immediate: true },
        timeout: 30000,
      });
      return response.data;
    } catch (error: any) {
      console.error('WUZAPI POST /session/connect error:', error);
      if (error.response) {
        throw new Error(`WUZAPI Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('WUZAPI: No response from server');
      } else {
        throw new Error(`WUZAPI: ${error.message}`);
      }
    }
  }

  // Connect via backend proxy to avoid CORS issues
  async connectSessionBackend(serverId: string, token: string, payload?: {
    Subscribe?: string[];
    Immediate?: boolean;
  }): Promise<any> {
    const response = await api.post('/wuz/session/connect', {
      serverId,
      token,
      payload: payload || { Subscribe: ['Message', 'ChatPresence'], Immediate: true },
    });
    return response.data;
  }

  // Get QR Code via backend proxy to avoid CORS; supports `qr` key
  async getQRCodeBackend(serverId: string, token: string): Promise<string> {
    const response = await api.post('/wuz/session/qr', { serverId, token });
    const data = response.data;
    const base64 =
      data?.qr ||
      data?.qrcode ||
      data?.QRCode ||
      data?.qrCode ||
      data?.data?.qr ||
      data?.data?.qrcode ||
      data?.data?.QRCode ||
      data?.data?.qrCode ||
      (typeof data === 'string' ? data : null);
    if (!base64) {
      throw new Error('QR Code não encontrado na resposta do backend');
    }
    return base64;
  }

  // Send message
  async sendMessage(token: string, to: string, message: string): Promise<any> {
    const payload = {
      to,
      message,
    };

    return await this.makeRequest(`/users/${token}/send`, 'POST', payload);
  }

  // Create webhook
  async createWebhook(token: string, webhookData: {
    url: string;
    events: string[];
  }): Promise<any> {
    return await this.makeRequest(`/users/${token}/webhook`, 'POST', webhookData);
  }

  // Update webhook
  async updateWebhook(token: string, webhookData: {
    url: string;
    events: string[];
  }): Promise<any> {
    return await this.makeRequest(`/users/${token}/webhook`, 'PUT', webhookData);
  }

  // Delete webhook
  async deleteWebhook(token: string): Promise<void> {
    await this.makeRequest(`/users/${token}/webhook`, 'DELETE');
  }

  // Logout user
  async logoutUser(token: string): Promise<void> {
    await this.makeRequest(`/users/${token}/logout`, 'POST');
  }

  // Restart user session
  async restartUser(token: string): Promise<void> {
    await this.makeRequest(`/users/${token}/restart`, 'POST');
  }
}

// Export singleton instance
export const wuzApiService = new WuzApiService();
