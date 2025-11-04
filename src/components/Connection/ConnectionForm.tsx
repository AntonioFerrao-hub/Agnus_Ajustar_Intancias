import { useState, useEffect } from 'react';
import { Plus, Smartphone, Zap, Server, CheckCircle, AlertCircle } from 'lucide-react';
import { CreateConnectionPayload } from '../../types';
import { useServerSelection } from '../../hooks/useServerSelection';

interface ConnectionFormProps {
  onSubmit: (connection: CreateConnectionPayload) => void;
  isLoading?: boolean;
}

export function ConnectionForm({ onSubmit, isLoading = false }: ConnectionFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'evolution' as 'evolution' | 'wuzapi',
    phone: '',
    webhook: '',
    token: '',
    // Flags Evolution
    qrcode: true,
    rejectCall: true,
    msgCall: '',
    groupsIgnore: true,
    alwaysOnline: true,
    readMessages: false,
    readStatus: false,
    syncFullHistory: true,
    // Proxy (opcional)
    proxyHost: '',
    proxyPort: '',
    proxyProtocol: '',
    proxyUsername: '',
    proxyPassword: '',
  });

  const {
    selectedServerId,
    isValidatingServer,
    serverCounts,
    availableServers,
    selectedServer,
    setSelectedServerId,
    getAvailableServers,
    validateServerAvailability,
    selectDefaultServer,
    resetSelection,
  } = useServerSelection();

  // Selecionar servidor padrão quando o tipo de API mudar
  useEffect(() => {
    if (formData.type) {
      const defaultServer = selectDefaultServer(formData.type);
      if (!defaultServer) {
        resetSelection();
      }
    }
  }, [formData.type]);

  // Normaliza identificadores: remove acentos, espaços e caracteres inválidos
  const normalizeIdentifier = (str: string) => {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^A-Za-z0-9_]/g, '_')
      .toLowerCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('📝 Formulário submetido com dados:', formData);
    console.log('🖥️ Servidor selecionado:', selectedServerId);
    
    // Validar se o nome foi preenchido
    if (!formData.name || formData.name.trim() === '') {
      console.log('❌ Erro: Nome não preenchido');
      alert('Por favor, preencha o nome da conexão.');
      return;
    }
    
    if (!selectedServerId) {
      console.log('❌ Erro: Nenhum servidor selecionado');
      alert('Por favor, selecione um servidor antes de criar a conexão.');
      return;
    }

    console.log('🔍 Validando disponibilidade do servidor...');
    // Validar disponibilidade do servidor antes de criar a conexão
    const isServerAvailable = await validateServerAvailability(selectedServerId);
    console.log('🖥️ Servidor disponível:', isServerAvailable);
    
    if (!isServerAvailable) {
      console.log('❌ Erro: Servidor não disponível');
      alert('O servidor selecionado não está disponível. Por favor, escolha outro servidor ou tente novamente.');
      return;
    }

    // Regras WUZAPI: token deve ser igual ao nome, sem acento, >= 10 chars
    let finalName = formData.name.trim();
    let finalToken: string | undefined = undefined;
    let finalInstanceName: string | undefined = undefined;

    if (formData.type === 'wuzapi') {
      const normalized = normalizeIdentifier(finalName);
      if (!normalized || normalized.length < 10) {
        alert('Para WUZAPI, o nome/token deve ter pelo menos 10 caracteres, sem acentos. Ex.: contato_suporte01');
        return;
      }
      finalName = normalized;
      finalToken = normalized;
    } else if (formData.type === 'evolution') {
      finalInstanceName = finalName.toLowerCase().replace(/\s+/g, '-');
      // Evolution: token pode ser informado
      if (formData.token && formData.token.trim().length > 0) {
        finalToken = formData.token.trim();
      }
    }
    
    const connection: CreateConnectionPayload = {
      name: finalName, // normalizado quando wuzapi
      type: formData.type,
      status: 'disconnected',
      phone: formData.phone || undefined,
      webhook: formData.webhook || undefined,
      instanceName: finalInstanceName,
      token: finalToken,
      serverId: selectedServerId,
      // Evolution extras
      integration: 'WHATSAPP-BAILEYS',
      qrcode: formData.qrcode,
      rejectCall: formData.rejectCall,
      msgCall: formData.msgCall || undefined,
      groupsIgnore: formData.groupsIgnore,
      alwaysOnline: formData.alwaysOnline,
      readMessages: formData.readMessages,
      readStatus: formData.readStatus,
      syncFullHistory: formData.syncFullHistory,
      proxyHost: formData.proxyHost || undefined,
      proxyPort: formData.proxyPort || undefined,
      proxyProtocol: formData.proxyProtocol || undefined,
      proxyUsername: formData.proxyUsername || undefined,
      proxyPassword: formData.proxyPassword || undefined,
    };

    console.log('📤 Enviando dados da conexão:', connection);
    onSubmit(connection);
    
    // Reset form
    setFormData({
      name: '',
      type: 'evolution',
      phone: '',
      webhook: '',
      token: '',
      qrcode: true,
      rejectCall: false,
      msgCall: '',
      groupsIgnore: false,
      alwaysOnline: true,
      readMessages: false,
      readStatus: false,
      syncFullHistory: true,
      proxyHost: '',
      proxyPort: '',
      proxyProtocol: '',
      proxyUsername: '',
      proxyPassword: '',
    });
    resetSelection();
    console.log('🔄 Formulário resetado');
  };

  const generateToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Nome da Conexão
          </label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: WhatsApp Vendas"
            required
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Número do WhatsApp (Opcional)
          </label>
          <input
            type="text"
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Ex: 5511999999999"
          />
          <p className="text-xs text-gray-500 mt-1">
            Informe o número internacional completo, se desejar vincular.
          </p>
        </div>

        {/* Server Selection Section */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Seleção de Servidor
          </label>
          
          {/* Server Counts Display */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-gray-900">Servidores Disponíveis</h4>
              <div className="flex items-center space-x-4 text-xs text-gray-600">
                <span className="flex items-center">
                  <Zap className="h-3 w-3 mr-1 text-blue-500" />
                  Evolution: {serverCounts.evolution}
                </span>
                <span className="flex items-center">
                  <Smartphone className="h-3 w-3 mr-1 text-green-500" />
                  WUZAPI: {serverCounts.wuzapi}
                </span>
                <span className="flex items-center">
                  <Server className="h-3 w-3 mr-1 text-gray-500" />
                  Total: {serverCounts.total}
                </span>
              </div>
            </div>
            
            {/* Server Selection List */}
            <div className="space-y-2">
              {getAvailableServers(formData.type).length > 0 ? (
                getAvailableServers(formData.type).map((server) => (
                  <div
                    key={server.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedServerId === server.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedServerId(server.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${
                          server.status === 'connected' ? 'bg-green-500' :
                          server.status === 'testing' ? 'bg-yellow-500' : 'bg-red-500'
                        }`}></div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{server.name}</p>
                          <p className="text-xs text-gray-500">{server.url}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {selectedServerId === server.id && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                          server.status === 'connected' 
                            ? 'bg-green-100 text-green-800'
                            : server.status === 'testing'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {server.status === 'connected' && 'Online'}
                          {server.status === 'testing' && 'Testando'}
                          {server.status === 'disconnected' && 'Offline'}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Nenhum servidor {formData.type === 'evolution' ? 'Evolution API' : 'WUZAPI'} disponível</p>
                  <p className="text-xs">Configure servidores nas Configurações</p>
                </div>
              )}
            </div>
            
            {/* Selected Server Info removido */}
            {false && selectedServer && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">
                    Servidor Selecionado: {selectedServer.name}
                  </span>
                </div>
                <p className="text-xs text-blue-700 mt-1">
                  A conexão será criada em: {selectedServer.url}
                </p>
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de API
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'evolution' })}
              className={`p-4 border-2 rounded-lg transition-colors ${
                formData.type === 'evolution'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <Zap className={`h-6 w-6 ${
                  formData.type === 'evolution' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  formData.type === 'evolution' ? 'text-green-900' : 'text-gray-600'
                }`}>
                  Evolution API
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'wuzapi' })}
              className={`p-4 border-2 rounded-lg transition-colors ${
                formData.type === 'wuzapi'
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex flex-col items-center space-y-2">
                <Smartphone className={`h-6 w-6 ${
                  formData.type === 'wuzapi' ? 'text-green-600' : 'text-gray-400'
                }`} />
                <span className={`text-sm font-medium ${
                  formData.type === 'wuzapi' ? 'text-green-900' : 'text-gray-600'
                }`}>
                  WUZAPI
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Token - Evolution */}
        {formData.type === 'evolution' && (
          <div>
            <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
              Token (Obrigatório na Evolution)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                id="token"
                value={formData.token}
                onChange={(e) => setFormData({ ...formData, token: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Ex: evol-conn-123456"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, token: generateToken() })}
                className="px-3 py-2 border rounded-md text-sm bg-gray-50 hover:bg-gray-100"
              >
                Gerar Token
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Este token será usado na criação da instância.</p>
          </div>
        )}

        <div>
          <label htmlFor="webhook" className="block text-sm font-medium text-gray-700 mb-1">
            Webhook URL (Opcional)
          </label>
          <input
            type="url"
            id="webhook"
            value={formData.webhook}
            onChange={(e) => setFormData({ ...formData, webhook: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="https://seu-servidor.com/webhook"
          />
          <p className="text-xs text-gray-500 mt-1">
            URL para receber notificações de mensagens e eventos
          </p>
        </div>

        {/* Comportamento - Evolution */}
        {formData.type === 'evolution' && (
          <div className="mt-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Comportamento</h3>
            <div className="space-y-4">
              {/* QRCode */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">QRCode</p>
                  <p className="text-xs text-gray-500">Exibir QR Code na criação</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.qrcode}
                  onChange={(e) => setFormData({ ...formData, qrcode: e.target.checked })}
                />
              </div>

              {/* Rejeitar chamadas */}
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">Rejeitar Chamadas</p>
                    <p className="text-xs text-gray-500">Rejeitar todas as chamadas recebidas</p>
                  </div>
                  <input
                    type="checkbox"
                    className="h-5 w-5"
                    checked={formData.rejectCall}
                    onChange={(e) => setFormData({ ...formData, rejectCall: e.target.checked })}
                  />
                </div>
                <div className="mt-2">
                  <input
                    type="text"
                    placeholder="Mensagem de rejeição"
                    value={formData.msgCall}
                    onChange={(e) => setFormData({ ...formData, msgCall: e.target.value })}
                    disabled={!formData.rejectCall}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
              </div>

              {/* Ignorar grupos */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Ignorar Grupos</p>
                  <p className="text-xs text-gray-500">Ignorar mensagens de grupos</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.groupsIgnore}
                  onChange={(e) => setFormData({ ...formData, groupsIgnore: e.target.checked })}
                />
              </div>

              {/* Sempre online */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Sempre Online</p>
                  <p className="text-xs text-gray-500">Permanecer sempre online</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.alwaysOnline}
                  onChange={(e) => setFormData({ ...formData, alwaysOnline: e.target.checked })}
                />
              </div>

              {/* Visualizar mensagens */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Visualizar Mensagens</p>
                  <p className="text-xs text-gray-500">Marcar mensagens como lidas</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.readMessages}
                  onChange={(e) => setFormData({ ...formData, readMessages: e.target.checked })}
                />
              </div>

              {/* Sincronizar histórico completo */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Sincronizar Histórico Completo</p>
                  <p className="text-xs text-gray-500">Sincronizar histórico completo ao ler o QR Code</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.syncFullHistory}
                  onChange={(e) => setFormData({ ...formData, syncFullHistory: e.target.checked })}
                />
              </div>

              {/* Visualizar status */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-800">Visualizar Status</p>
                  <p className="text-xs text-gray-500">Marcar status como visualizados</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-5"
                  checked={formData.readStatus}
                  onChange={(e) => setFormData({ ...formData, readStatus: e.target.checked })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Proxy (Opcional) - Evolution */}
        {formData.type === 'evolution' && (
          <div className="mt-4 border rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Proxy (Opcional)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Host</label>
                <input
                  type="text"
                  value={formData.proxyHost}
                  onChange={(e) => setFormData({ ...formData, proxyHost: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="proxy.exemplo.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Porta</label>
                <input
                  type="text"
                  value={formData.proxyPort}
                  onChange={(e) => setFormData({ ...formData, proxyPort: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="8080"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Protocolo</label>
                <input
                  type="text"
                  value={formData.proxyProtocol}
                  onChange={(e) => setFormData({ ...formData, proxyProtocol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="http | https | socks5"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Usuário</label>
                <input
                  type="text"
                  value={formData.proxyUsername}
                  onChange={(e) => setFormData({ ...formData, proxyUsername: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="user"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Senha</label>
                <input
                  type="password"
                  value={formData.proxyPassword}
                  onChange={(e) => setFormData({ ...formData, proxyPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="senha"
                />
              </div>
            </div>
          </div>
        )}

        

        <button
          type="submit"
          disabled={isLoading || !formData.name.trim() || !selectedServerId || isValidatingServer}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Criando...</span>
            </div>
          ) : isValidatingServer ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Validando servidor...</span>
            </div>
          ) : !selectedServerId ? (
            'Selecione um Servidor'
          ) : (
            'Criar Conexão'
          )}
        </button>
      </form>
    </div>
  );
}