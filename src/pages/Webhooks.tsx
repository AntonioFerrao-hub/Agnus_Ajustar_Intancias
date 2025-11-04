import { useState, useEffect, FormEvent } from 'react';
import { 
  Webhook, 
  Plus, 
  Trash2, 
  Edit3, 
  Globe,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { webhookService, WebhookRecord } from '../services/webhookService';

interface WebhookConfig {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: string[];
  connectionId?: string;
  connectionType?: 'evolution' | 'wuzapi';
  status: 'active' | 'inactive' | 'error';
  lastTriggered?: string;
  createdAt: string;
}

const EVOLUTION_EVENTS = [
  'APPLICATION_STARTUP',
  'QRCODE_UPDATED', 
  'CONNECTION_UPDATE',
  'MESSAGES_UPSERT',
  'MESSAGES_UPDATE',
  'MESSAGES_DELETE',
  'SEND_MESSAGE',
  'CONTACTS_SET',
  'CONTACTS_UPSERT',
  'CONTACTS_UPDATE',
  'PRESENCE_UPDATE',
  'CHATS_SET',
  'CHATS_UPSERT',
  'CHATS_UPDATE',
  'CHATS_DELETE',
  'GROUPS_UPSERT',
  'GROUP_UPDATE',
  'GROUP_PARTICIPANTS_UPDATE',
  'NEW_JWT_TOKEN'
];

const WUZAPI_EVENTS = [
  'message',
  'message_ack',
  'message_create',
  'message_revoke',
  'media_uploaded',
  'group_join',
  'group_leave',
  'group_update',
  'qr',
  'ready',
  'authenticated',
  'auth_failure',
  'disconnected'
];

export function Webhooks() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<WebhookConfig | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', description: '', url: '' });
  const { connections, addLog } = useConnectionStore();

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    url: ''
  });

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Garantir que a tabela exista antes de listar
        try {
          await webhookService.init();
        } catch (initErr) {
          console.warn('Falha ao inicializar tabela de webhooks (pode já existir):', initErr);
        }
        const list = await webhookService.list();
        const mapped: WebhookConfig[] = (list || []).map((w: WebhookRecord) => ({
          id: w.id,
          name: w.name,
          description: w.description,
          url: w.url,
          events: Array.isArray(w.events) ? w.events : [],
          status: w.status,
          createdAt: w.createdAt,
          lastTriggered: w.lastTriggered || undefined,
        }));
        setWebhooks(mapped);
      } catch (err) {
        console.error('Falha ao carregar webhooks do backend:', err);
        addLog({
          id: Date.now().toString(),
          type: 'error',
          action: 'Erro ao Carregar',
          message: 'Falha ao carregar webhooks do backend',
          timestamp: new Date().toISOString(),
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Removido: função de carregamento automático dos servidores

  const handleCreateWebhook = async (e: FormEvent) => {
    e.preventDefault();
    
    try {
      const created = await webhookService.create({
        name: formData.name,
        description: formData.description,
        url: formData.url,
        status: 'active',
        events: []
      });

      const newWebhook: WebhookConfig = {
        id: created.id,
        name: created.name,
        description: created.description,
        url: created.url,
        events: Array.isArray(created.events) ? created.events : [],
        status: created.status,
        createdAt: created.createdAt,
        lastTriggered: created.lastTriggered || undefined,
      };

      setWebhooks(prev => [...prev, newWebhook]);
      setFormData({ name: '', description: '', url: '' });
      setShowCreateForm(false);

      addLog({
        id: Date.now().toString(),
        type: 'success',
        action: 'Webhook Criado',
        message: `Webhook ${formData.name} criado com sucesso`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Erro ao criar webhook:', error);
      addLog({
        id: Date.now().toString(),
        type: 'error',
        action: 'Erro na Criação',
        message: `Falha ao criar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const handleDeleteWebhook = async (webhook: WebhookConfig) => {
    if (!confirm(`Tem certeza que deseja excluir o webhook "${webhook.name}"?`)) {
      return;
    }

    try {
      await webhookService.remove(webhook.id);
      setWebhooks(prev => prev.filter(w => w.id !== webhook.id));

      addLog({
        id: Date.now().toString(),
        type: 'warning',
        action: 'Webhook Excluído',
        message: `Webhook ${webhook.name} foi excluído`,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      console.error('Erro ao excluir webhook:', error);
    }
  };

  const handleTestWebhook = async (webhook: WebhookConfig) => {
    try {
      // Send a test payload to the webhook URL
      const testPayload = {
        event: 'test',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Este é um teste do webhook',
          webhook_id: webhook.id
        }
      };

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testPayload)
      });

      if (response.ok) {
        addLog({
          id: Date.now().toString(),
          type: 'success',
          action: 'Teste de Webhook',
          message: `Webhook ${webhook.name} testado com sucesso`,
          timestamp: new Date().toISOString(),
        });
      } else {
        throw new Error(`HTTP ${response.status}`);
      }

    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      addLog({
        id: Date.now().toString(),
        type: 'error',
        action: 'Erro no Teste',
        message: `Falha ao testar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addLog({
      id: Date.now().toString(),
      type: 'info',
      action: 'Copiado',
      message: 'URL copiada para a área de transferência',
      timestamp: new Date().toISOString(),
    });
  };

  const getStatusColor = (status: WebhookConfig['status']) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: WebhookConfig['status']) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'error': return <XCircle className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Removido: availableEvents pois não há mais seleção de eventos/tipo

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurar Webhooks</h2>
          <p className="text-gray-600">Gerencie webhooks para receber notificações em tempo real</p>
        </div>
        <button
          onClick={async () => {
            try {
              await webhookService.init();
            } catch (err) {
              console.warn('Falha ao inicializar webhooks:', err);
            }
            setShowCreateForm(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Webhook</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Webhook className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Webhooks</p>
              <p className="text-2xl font-bold text-gray-900">{webhooks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {webhooks.filter(w => w.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Com Erro</p>
              <p className="text-2xl font-bold text-gray-900">
                {webhooks.filter(w => w.status === 'error').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Globe className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Evolution API</p>
              <p className="text-2xl font-bold text-gray-900">
                {webhooks.filter(w => w.connectionType === 'evolution').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Webhooks Configurados ({webhooks.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando webhooks...</p>
          </div>
        ) : webhooks.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {webhooks.map((webhook) => (
              <div key={webhook.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-medium text-gray-900">{webhook.name}</h4>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(webhook.status)}`}>
                        {getStatusIcon(webhook.status)}
                        <span className="ml-1">
                          {webhook.status === 'active' ? 'Ativo' : webhook.status === 'error' ? 'Erro' : 'Inativo'}
                        </span>
                      </span>
                      {webhook.connectionType && (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {webhook.connectionType.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 mb-3">
                      <Globe className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 font-mono">{webhook.url}</span>
                      <button
                        onClick={() => copyToClipboard(webhook.url)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={webhook.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="mb-3">
                      <p className="text-sm text-gray-600 mb-1">Eventos monitorados:</p>
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                          >
                            {event}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>Criado em {new Date(webhook.createdAt).toLocaleDateString('pt-BR')}</span>
                      {webhook.lastTriggered && (
                        <span>
                          Último disparo: {new Date(webhook.lastTriggered).toLocaleString('pt-BR')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleTestWebhook(webhook)}
                      className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                    >
                      Testar
                    </button>
                    <button
                      onClick={() => { 
                        setEditingWebhook(webhook);
                        setEditFormData({ 
                          name: webhook.name, 
                          description: webhook.description || '', 
                          url: webhook.url 
                        });
                      }}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteWebhook(webhook)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <Webhook className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum webhook configurado</h3>
            <p className="text-gray-500 mb-4">Configure seu primeiro webhook para receber notificações.</p>
            <button
              onClick={async () => {
                try {
                  await webhookService.init();
                } catch (err) {
                  console.warn('Falha ao inicializar webhooks:', err);
                }
                setShowCreateForm(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Criar Webhook
            </button>
          </div>
        )}
      </div>

      {/* Create Webhook Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Novo Webhook</h3>
            
            <form onSubmit={handleCreateWebhook} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Webhook
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">
                  URL do Webhook
                </label>
                <input
                  type="url"
                  id="url"
                  value={formData.url}
                  onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://api.exemplo.com/webhook"
                  required
                />
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Opcional: breve descrição do webhook"
                />
              </div>

              {/* Removido: ligação com conexão específica */}

              {/* Removido: seleção de eventos */}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', description: '', url: '' });
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Criar Webhook
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Webhook Modal */}
      {editingWebhook && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Webhook</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!editingWebhook) return;
              try {
                const updated = await webhookService.update(editingWebhook.id, {
                  name: editFormData.name,
                  description: editFormData.description,
                  url: editFormData.url,
                  status: editingWebhook.status,
                  events: editingWebhook.events || []
                });
                setWebhooks(prev => prev.map(w => w.id === editingWebhook.id ? {
                  id: updated.id,
                  name: updated.name,
                  description: updated.description,
                  url: updated.url,
                  events: Array.isArray(updated.events) ? updated.events : [],
                  status: updated.status,
                  createdAt: updated.createdAt,
                  lastTriggered: updated.lastTriggered || undefined,
                } : w));
                setEditingWebhook(null);
                addLog({
                  id: Date.now().toString(),
                  type: 'success',
                  action: 'Webhook Atualizado',
                  message: `Webhook ${editFormData.name} atualizado com sucesso`,
                  timestamp: new Date().toISOString(),
                });
              } catch (error) {
                console.error('Erro ao atualizar webhook:', error);
                addLog({
                  id: Date.now().toString(),
                  type: 'error',
                  action: 'Erro na Atualização',
                  message: `Falha ao atualizar webhook: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                  timestamp: new Date().toISOString(),
                });
              }
            }} className="space-y-4">
              <div>
                <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">Nome do Webhook</label>
                <input
                  type="text"
                  id="edit-name"
                  value={editFormData.name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-url" className="block text-sm font-medium text-gray-700 mb-1">URL do Webhook</label>
                <input
                  type="url"
                  id="edit-url"
                  value={editFormData.url}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label htmlFor="edit-description" className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  id="edit-description"
                  value={editFormData.description}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Opcional: breve descrição do webhook"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingWebhook(null)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}