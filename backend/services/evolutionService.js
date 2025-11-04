const axios = require('axios');

class EvolutionService {
  constructor() {
    this.instances = new Map(); // Cache de configurações por servidor
  }

  // Configurar instância para um servidor específico
  setServerConfig(serverId, baseURL, apiKey) {
    this.instances.set(serverId, {
      baseURL: baseURL.replace(/\/$/, ''), // Remove trailing slash
      apiKey,
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
      }
    });
  }

  // Obter configuração do servidor
  getServerConfig(serverId) {
    const config = this.instances.get(serverId);
    if (!config) {
      throw new Error(`Evolution API server ${serverId} not configured`);
    }
    return config;
  }

  // Fazer requisição para a Evolution API
  async makeRequest(serverId, endpoint, method = 'GET', data = null) {
    const config = this.getServerConfig(serverId);
    const url = `${config.baseURL}${endpoint}`;
    
    try {
      console.log(`Evolution API ${method} ${url}`, data ? { data } : '');
      
      const axiosConfig = {
        method,
        url,
        headers: config.headers,
        timeout: 30000, // 30 seconds timeout
      };

      // Evitar enviar corpo em requisições GET (alguns servidores falham ao receber "null")
      if (method !== 'GET' && data !== undefined && data !== null) {
        axiosConfig.data = data;
      }

      const response = await axios(axiosConfig);

      console.log(`Evolution API ${method} ${endpoint} success:`, response.status);
      return response.data;
    } catch (error) {
      console.error(`Evolution API ${method} ${endpoint} error:`, error.response?.data || error.message);
      
      if (error.response) {
        throw new Error(`Evolution API Error ${error.response.status}: ${error.response.data?.message || error.response.statusText}`);
      } else if (error.request) {
        throw new Error('Evolution API: No response from server');
      } else {
        throw new Error(`Evolution API: ${error.message}`);
      }
    }
  }

  // Obter informações da API
  async getApiInfo(serverId) {
    return await this.makeRequest(serverId, '/');
  }

  // Obter todas as instâncias
  async getAllInstances(serverId) {
    const response = await this.makeRequest(serverId, '/instance/fetchInstances');
    return response.data || [];
  }

  // Criar nova instância
  async createInstance(serverId, instanceData) {
    // Aceita payload completo vindo da rota, preservando campos adicionais
    // Garantindo que qrcode default seja true quando não especificado
    const payload = {
      ...instanceData,
      qrcode: instanceData.qrcode !== false,
    };

    console.log('Creating Evolution instance:', payload);
    return await this.makeRequest(serverId, '/instance/create', 'POST', payload);
  }

  // Obter instância por nome
  async getInstance(serverId, instanceName) {
    try {
      return await this.makeRequest(serverId, `/instance/fetchInstances/${instanceName}`);
    } catch (error) {
      if (error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  // Deletar instância
  async deleteInstance(serverId, instanceName) {
    return await this.makeRequest(serverId, `/instance/delete/${instanceName}`, 'DELETE');
  }

  // Conectar instância
  async connectInstance(serverId, instanceName) {
    return await this.makeRequest(serverId, `/instance/connect/${instanceName}`);
  }

  // Obter QR Code
  async getQRCode(serverId, instanceName) {
    const response = await this.makeRequest(serverId, `/instance/connect/${instanceName}`);
    return response.base64;
  }

  // Obter status da instância
  async getInstanceStatus(serverId, instanceName) {
    return await this.makeRequest(serverId, `/instance/connectionState/${instanceName}`);
  }

  // Fazer logout da instância
  async logoutInstance(serverId, instanceName) {
    return await this.makeRequest(serverId, `/instance/logout/${instanceName}`, 'DELETE');
  }

  // Configurar webhook
  async setWebhook(serverId, instanceName, webhookData) {
    return await this.makeRequest(serverId, `/webhook/set/${instanceName}`, 'POST', webhookData);
  }
}

// Export singleton instance
module.exports = new EvolutionService();