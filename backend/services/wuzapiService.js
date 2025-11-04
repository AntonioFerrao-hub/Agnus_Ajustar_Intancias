const axios = require('axios');

class WuzapiService {
  constructor() {
    this.instances = new Map(); // Cache de configurações por servidor
  }

  // Configurar instância para um servidor específico
  setServerConfig(serverId, baseURL, apiKey) {
    this.instances.set(serverId, {
      baseURL: baseURL.replace(/\/$/, ''), // Remove trailing slash
      apiKey,
      headers: {
        'Authorization': `${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      }
    });
  }

  // Obter configuração do servidor
  getServerConfig(serverId) {
    const config = this.instances.get(serverId);
    if (!config) {
      throw new Error(`WUZAPI server ${serverId} not configured`);
    }
    return config;
  }

  // Fazer requisição para a API WUZAPI
  async makeRequest(serverId, endpoint, method = 'GET', data = null) {
    const config = this.getServerConfig(serverId);
    const url = `${config.baseURL}${endpoint}`;
    
    try {
      console.log(`WUZAPI ${method} ${url}`, data ? { data } : '');
      
      const response = await axios({
        method,
        url,
        headers: config.headers,
        data,
        timeout: 30000, // 30 seconds timeout
      });

      console.log(`WUZAPI ${method} ${endpoint} success:`, response.status);
      return response.data;
    } catch (error) {
      console.error(`WUZAPI ${method} ${endpoint} error:`, error.response?.data || error.message);
      
      if (error.response) {
        throw new Error(`WUZAPI Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('WUZAPI: No response from server');
      } else {
        throw new Error(`WUZAPI: ${error.message}`);
      }
    }
  }

  // Obter todos os usuários
  async getUsers(serverId) {
    const response = await this.makeRequest(serverId, '/admin/users');
    return response || [];
  }

  // Criar novo usuário
  async createUser(serverId, userData) {
    const payload = {
      name: userData.name,
      token: userData.token || userData.name.toLowerCase().replace(/\s+/g, '_'),
      webhook: userData.webhook || '',
      events: userData.events || 'All'
    };

    console.log('Creating WUZAPI user:', payload);
    return await this.makeRequest(serverId, '/admin/users', 'POST', payload);
  }

  // Obter usuário por token
  async getUserByToken(serverId, token) {
    try {
      return await this.makeRequest(serverId, `/admin/users/${token}`);
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Obter QR Code do usuário
  async getQRCode(serverId, token) {
    const response = await this.makeRequest(serverId, `/users/${token}/qrcode`);
    return response.qrcode;
  }

  // Obter status do usuário
  async getUserStatus(serverId, token) {
    return await this.makeRequest(serverId, `/users/${token}/status`);
  }

  // Fazer logout do usuário
  async logoutUser(serverId, token) {
    return await this.makeRequest(serverId, `/users/${token}/logout`, 'POST');
  }

  // Deletar usuário
  async deleteUser(serverId, token) {
    return await this.makeRequest(serverId, `/admin/users/${token}`, 'DELETE');
  }

  // Configurar webhook
  async setWebhook(serverId, token, webhookData) {
    return await this.makeRequest(serverId, `/users/${token}/webhook`, 'POST', webhookData);
  }
}

// Export singleton instance
module.exports = new WuzapiService();