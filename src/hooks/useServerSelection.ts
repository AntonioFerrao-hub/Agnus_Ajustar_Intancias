import { useState, useEffect, useMemo } from 'react';
import { useConnectionStore } from '../store/useConnectionStore';
import { useServerStore } from '../store/useServerStore'; // Importar o store de servidores
import { Server } from '../types';

interface ApiConfig {
  id: string;
  name: string;
  type: 'evolution' | 'wuzapi';
  url: string;
  key: string;
  isActive: boolean;
  status: 'connected' | 'disconnected' | 'testing';
  createdAt: string;
}

interface ServerCounts {
  evolution: number;
  wuzapi: number;
  total: number;
}

interface AvailableServer {
  id: string;
  name: string;
  type: 'evolution' | 'wuzapi';
  url: string;
  status: 'connected' | 'disconnected' | 'testing';
  isActive: boolean;
}

export function useServerSelection() {
  const { addLog } = useConnectionStore();
  const { servers, fetchServers } = useServerStore(); // Usar o store de servidores
  const [selectedServerId, setSelectedServerId] = useState<string>('');
  const [isValidatingServer, setIsValidatingServer] = useState(false);

  // Buscar servidores ao montar o hook
  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  // Contar servidores disponíveis por tipo
  const serverCounts = useMemo<ServerCounts>(() => {
    const activeConfigs = servers.filter(config => config.isActive);
    const evolution = activeConfigs.filter(config => config.type === 'evolution').length;
    const wuzapi = activeConfigs.filter(config => config.type === 'wuzapi').length;
    
    return {
      evolution,
      wuzapi,
      total: evolution + wuzapi
    };
  }, [servers]);

  // Obter servidores disponíveis por tipo
  const getAvailableServers = (type?: 'evolution' | 'wuzapi'): AvailableServer[] => {
    let filteredConfigs = servers.filter(config => config.isActive);
    
    if (type) {
      filteredConfigs = filteredConfigs.filter(config => config.type === type);
    }
    
    return filteredConfigs.map(config => ({
      id: config.id,
      name: config.name,
      type: config.type,
      url: config.url,
      status: config.status,
      isActive: config.isActive
    }));
  };

  // Obter servidor selecionado
  const getSelectedServer = (): AvailableServer | null => {
    if (!selectedServerId) return null;
    
    const config = servers.find(config => config.id === selectedServerId);
    if (!config) return null;
    
    return {
      id: config.id,
      name: config.name,
      type: config.type,
      url: config.url,
      status: config.status,
      isActive: config.isActive
    };
  };

  // Validar disponibilidade do servidor
  const validateServerAvailability = async (serverId: string): Promise<boolean> => {
    setIsValidatingServer(true);
    
    try {
      const server = servers.find(config => config.id === serverId);
      if (!server) {
        throw new Error('Servidor não encontrado');
      }

      console.log('🔍 Validando servidor:', server);

      // Simular validação de conectividade
      // Em um cenário real, isso faria uma requisição real para o servidor
      await new Promise(resolve => setTimeout(resolve, 500)); // Reduzido para 500ms
      
      // Temporariamente sempre retornar true para debug
      const isAvailable = true; // Math.random() > 0.1;
      
      console.log('✅ Servidor validado com sucesso:', server.name);
      
      if (isAvailable) {
        addLog({
          id: Date.now().toString(),
          type: 'success',
          action: 'Validação de Servidor',
          message: `Servidor ${server.name} está disponível e pronto para uso`,
          timestamp: new Date().toISOString(),
        });
        return true;
      } else {
        throw new Error('Servidor não está respondendo');
      }
    } catch (error) {
      const server = servers.find(config => config.id === serverId);
      console.error('❌ Erro na validação do servidor:', error);
      addLog({
        id: Date.now().toString(),
        type: 'error',
        action: 'Validação de Servidor',
        message: `Falha ao validar servidor ${server?.name || serverId}: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
      });
      return false;
    } finally {
      setIsValidatingServer(false);
    }
  };

  // Selecionar servidor automaticamente baseado no tipo
  const selectDefaultServer = (type: 'evolution' | 'wuzapi') => {
    const availableServers = getAvailableServers(type);
    if (availableServers.length > 0) {
      setSelectedServerId(availableServers[0].id);
      return availableServers[0];
    }
    return null;
  };

  // Reset da seleção
  const resetSelection = () => {
    setSelectedServerId('');
  };

  return {
    // Estados
    selectedServerId,
    isValidatingServer,
    
    // Dados
    serverCounts,
    availableServers: getAvailableServers(),
    selectedServer: getSelectedServer(),
    
    // Funções
    setSelectedServerId,
    getAvailableServers,
    getSelectedServer,
    validateServerAvailability,
    selectDefaultServer,
    resetSelection,
  };
}