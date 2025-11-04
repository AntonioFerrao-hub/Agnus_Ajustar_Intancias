import React, { useState, useEffect } from 'react';
import api from '../api';
import { wuzApiService } from '../services/wuzApi';
import { Server, ServerFormData } from '../types';
import { useServerStore } from '../store/useServerStore';
import { evolutionApiService } from '../services/evolutionApi';

interface ServerFormProps {
  server?: Server;
  onClose: () => void;
  onSave?: () => void;
}

const ServerForm: React.FC<ServerFormProps> = ({ server, onClose, onSave }) => {
  const { addServer, updateServer, setLoading } = useServerStore();
  
  const [formData, setFormData] = useState<ServerFormData>({
    name: '',
    type: 'evolution',
    url: '',
    apiKey: '',
    description: '',
  });

  const [errors, setErrors] = useState<Partial<ServerFormData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [connectionMessage, setConnectionMessage] = useState<string>('');

  useEffect(() => {
    if (server) {
      setFormData({
        name: server.name,
        type: server.type,
        url: server.url,
        apiKey: server.apiKey,
        description: server.description || '',
      });
    }
  }, [server]);

  const validateForm = (): boolean => {
    const newErrors: Partial<ServerFormData> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'URL é obrigatória';
    } else {
      try {
        new URL(formData.url);
      } catch {
        newErrors.url = 'URL inválida';
      }
    }

    if (!formData.apiKey.trim()) {
      newErrors.apiKey = 'API Key é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setLoading(true);

    try {
      if (server) {
        updateServer(server.id, formData);
      } else {
        addServer(formData);
      }
      
      onSave?.();
      onClose();
    } catch (error) {
      console.error('Error saving server:', error);
    } finally {
      setIsSubmitting(false);
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof ServerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    setConnectionStatus('idle');
    setConnectionMessage('');
  };

  const testConnection = async () => {
    if (!formData.url || !formData.apiKey) return;
    setTestingConnection(true);
    setConnectionStatus('idle');
    setConnectionMessage('');
    try {
      if (formData.type === 'wuzapi') {
        // Usa backend para testar WUZAPI e evitar CORS/bloqueios no navegador
        try {
          const resp = await api.post('/servers/test', {
            url: formData.url,
            apiKey: formData.apiKey,
            type: 'wuzapi',
          });
          const usersCount = resp?.data?.usersCount ?? undefined;
          setConnectionStatus('success');
          setConnectionMessage('');
        } catch (err: any) {
          const status = err?.response?.status;
          const backendMessage = err?.response?.data?.message;
          const msg = backendMessage || err?.message || 'Falha ao testar WUZAPI via backend';
          console.error('Erro ao testar conexão (WUZAPI backend):', msg, err);
          setConnectionStatus('error');
          setConnectionMessage(msg);
        }
      } else {
        // Evolution: consulta info básica da API
        evolutionApiService.setConfig(formData.url, formData.apiKey);
        const info = await evolutionApiService.getApiInfo();
        if (info && typeof info === 'object') {
          setConnectionStatus('success');
          setConnectionMessage('');
        } else {
          setConnectionStatus('error');
          setConnectionMessage('Resposta inválida da API Evolution');
        }
      }
    } catch (err) {
      const status = err?.response?.status;
      const backendMessage = err?.response?.data?.message;
      const msg = backendMessage ? `${backendMessage}${status ? ` (status ${status})` : ''}` : (err?.message || 'Erro desconhecido ao testar conexão');
      console.error('Erro ao testar conexão:', msg, err);
      setConnectionStatus('error');
      setConnectionMessage(msg);
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {server ? 'Editar Servidor' : 'Novo Servidor'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome do Servidor *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Ex: Servidor Principal"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              value={formData.type}
              onChange={(e) => handleInputChange('type', e.target.value as 'evolution' | 'wuzapi')}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="evolution">Evolution API</option>
              <option value="wuzapi">WUZAPI</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL do Servidor *
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => handleInputChange('url', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.url ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="https://api.exemplo.com"
            />
            {errors.url && <p className="text-red-500 text-sm mt-1">{errors.url}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key *
            </label>
            <input
              type="password"
              value={formData.apiKey}
              onChange={(e) => handleInputChange('apiKey', e.target.value)}
              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                errors.apiKey ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Sua API Key"
            />
            {errors.apiKey && <p className="text-red-500 text-sm mt-1">{errors.apiKey}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Descrição opcional do servidor"
              rows={3}
            />
          </div>

          {/* Test Connection */}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={testConnection}
              disabled={testingConnection || !formData.url || !formData.apiKey}
              className="flex items-center px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testingConnection ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testando...
                </>
              ) : (
                'Testar Conexão'
              )}
            </button>
            
            {connectionStatus === 'success' && (
              <span className="text-green-600 text-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Conexão OK
              </span>
            )}
            
            {connectionStatus === 'error' && (
              <span className="text-red-600 text-sm flex items-center">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                Falha na conexão
              </span>
            )}
            {connectionStatus === 'error' && connectionMessage && (
              <div className="text-red-600 text-xs mt-1">{connectionMessage}</div>
            )}
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Salvando...' : server ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServerForm;