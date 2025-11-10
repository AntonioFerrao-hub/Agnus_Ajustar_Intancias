import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Smartphone, 
  Zap, 
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { useServerStore } from '../store/useServerStore';
import { evolutionApiService } from '../services/evolutionApi';
import { wuzApiService } from '../services/wuzApi';
import api from '../api';
import { connectionService } from '../services/connectionService';
import { getConnectionExports, ConnectionExportSnapshot } from '../services/connectionExports';
import { Connection, CreateConnectionPayload, Server, EvolutionInstance, WuzapiUser } from '../types';
import { ConnectionForm } from './Connection/ConnectionForm';
import { QRCodeDisplay } from './Connection/QRCodeDisplay';
import { EvoQrModal } from './Connection/EvoQrModal';
import { WuQrModal } from './Connection/WuQrModal';
import ServerFilter from './ServerFilter';

export default function ConnectionList() {
  const { 
    connections, 
    setConnections, 
    addConnection, 
    updateConnection, 
    removeConnection,
    setLoading,
    setError,
    isLoading,
    error
  } = useConnectionStore();

  const [showForm, setShowForm] = useState(false);
  const [editingConnection, setEditingConnection] = useState<Connection | null>(null);
  // Filtro por tipo (modo banco)
  const [filterType, setFilterType] = useState<'all' | 'evolution' | 'wuzapi'>('all');
  // Estado do modal de QR
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrModalConnection, setQrModalConnection] = useState<Connection | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);

  // Modo Online (consulta direta nos servidores)
  const [onlineMode, setOnlineMode] = useState(true);
  const { servers, fetchServers } = useServerStore();
  const [dbServerFilter, setDbServerFilter] = useState<string>('');
  const [dbBatchFilter, setDbBatchFilter] = useState<string>('');
  const [dbSnapshots, setDbSnapshots] = useState<ConnectionExportSnapshot[]>([]);
  const [showDbFilters, setShowDbFilters] = useState(true);

  // Referência para focar o primeiro campo ao abrir filtros (modo Banco)
  const dbServerSelectRef = useRef<HTMLSelectElement>(null);

  const clearDbFilters = () => {
    setDbServerFilter('');
    setDbBatchFilter('');
    setDbSnapshots([]);
  };

  useEffect(() => {
    if (!onlineMode) {
      dbServerSelectRef.current?.focus();
    }
  }, [onlineMode]);

  // Carregar snapshots somente quando filtros estiverem visíveis e servidor selecionado (modo Banco)
  useEffect(() => {
    async function loadSnapshots() {
      try {
        if (!onlineMode && dbServerFilter) {
          const snapshots = await getConnectionExports({ serverId: dbServerFilter });
          setDbSnapshots(snapshots);
        } else {
          setDbSnapshots([]);
        }
      } catch (err) {
        console.error('Falha ao carregar snapshots:', err);
      }
    }
    loadSnapshots();
  }, [onlineMode, dbServerFilter]);
  const [onlineLoading, setOnlineLoading] = useState(false);
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<string>('');
  const [onlineFilter, setOnlineFilter] = useState<'all' | 'connected' | 'connecting' | 'disconnected'>('all');
  const [instancesByServer, setInstancesByServer] = useState<Record<string, {
    server: Server;
    instances: EvolutionInstance[];
    success: boolean;
    error?: string;
  }>>({});
  // Estado para WUZAPI (modo online)
  const [wuUsersByServer, setWuUsersByServer] = useState<Record<string, {
    server: Server;
    users: WuzapiUser[];
    success: boolean;
    error?: string;
  }>>({});
  const [qrOnlineServer, setQrOnlineServer] = useState<Server | null>(null);
  const [qrOnlineInstance, setQrOnlineInstance] = useState<EvolutionInstance | null>(null);
  const [qrWuServer, setQrWuServer] = useState<Server | null>(null);
  const [qrWuUser, setQrWuUser] = useState<WuzapiUser | null>(null);
  const [selectedServerIds, setSelectedServerIds] = useState<string[]>([]);
  const [selectedWuServerIds, setSelectedWuServerIds] = useState<string[]>([]);
  const [selectAllEvolution, setSelectAllEvolution] = useState<boolean>(false);
  const [selectAllWu, setSelectAllWu] = useState<boolean>(false);
  const [currentFilterType, setCurrentFilterType] = useState<'evolution' | 'wuzapi'>('evolution');
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    if (onlineMode) {
      // Apenas carregar lista de servidores; não buscar instâncias/usuários automaticamente
      setOnlineError(null);
      // Limpar resultados ao alternar o modo
      setInstancesByServer({});
      setWuUsersByServer({});
      setLastUpdate('');
      fetchServers();
    } else {
      // No modo banco, manter carregamento de conexões
      loadConnections();
    }
  }, [onlineMode]);

  // Não recarregar automaticamente ao trocar o servidor; usuário deve clicar em "Atualizar"

  // carregar lista de servidores ao entrar no modo online
  const initOnline = async () => {
    try {
      setOnlineError(null);
      await fetchServers();
      // Sem carregamentos automáticos aqui
    } catch (e: any) {
      setOnlineError(e?.message || 'Erro ao inicializar modo online');
    }
  };

  const loadConnections = async () => {
    try {
      setLoading(true);
      const data = await connectionService.getConnections();
      setConnections(data);
    } catch (err) {
      setError('Erro ao carregar conexões');
      console.error('Erro ao carregar conexões:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (connectionData: CreateConnectionPayload) => {
    try {
      console.log('🔄 Iniciando criação de conexão:', connectionData);
      setLoading(true);
      
      if (editingConnection) {
        console.log('✏️ Editando conexão existente:', editingConnection.id);
        const updated = await connectionService.updateConnection(editingConnection.id, connectionData);
        console.log('✅ Conexão atualizada:', updated);
        updateConnection(editingConnection.id, updated);
      } else {
        console.log('➕ Criando nova conexão...');
        const newConnection = await connectionService.createConnection(connectionData);
        console.log('✅ Nova conexão criada:', newConnection);
        addConnection(newConnection);
      }
      
      setShowForm(false);
      setEditingConnection(null);
      console.log('🔄 Recarregando lista de conexões...');
      await loadConnections();
      console.log('✅ Processo concluído com sucesso!');
    } catch (err) {
      const anyErr = err as any;
      const backendMsg = anyErr?.response?.data?.message || anyErr?.message || 'Erro ao salvar conexão';
      console.error('❌ Erro ao salvar conexão:', backendMsg, anyErr?.response?.data);
      setError(`Erro ao salvar conexão: ${backendMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conexão?')) return;
    
    try {
      setLoading(true);
      await connectionService.deleteConnection(id);
      removeConnection(id);
    } catch (err) {
      setError('Erro ao excluir conexão');
      console.error('Erro ao excluir conexão:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (connection: Connection) => {
    setEditingConnection(connection);
    setShowForm(true);
  };

  const fetchQRCode = async (id: string) => {
    try {
      setQrLoading(true);
      const { qrCode } = await connectionService.getQRCode(id);
      setQrCodeData(qrCode);
    } catch (err) {
      console.error('Erro ao obter QR Code:', err);
      setError('Erro ao obter QR Code');
    } finally {
      setQrLoading(false);
    }
  };

  const openQRModal = async (connection: Connection) => {
    setQrModalConnection(connection);
    setQrModalOpen(true);
    setQrCodeData(null);
    await fetchQRCode(connection.id);
  };

  const refreshQRCode = async () => {
    if (qrModalConnection) {
      await fetchQRCode(qrModalConnection.id);
    }
  };

  // --------- ONLINE MODE HELPERS ---------
  // Normaliza o status vindo do Evolution para três estados finais
  const normalizeInstanceStatus = (
    inst: EvolutionInstance
  ): 'connected' | 'connecting' | 'disconnected' => {
    const raw = String((inst as any).connectionStatus ?? (inst as any).status ?? '').toLowerCase();
    if (['open', 'connected', 'conectada', 'online'].includes(raw)) return 'connected';
    if (['connecting', 'conectando'].includes(raw)) return 'connecting';
    if (['closed', 'close', 'disconnected', 'desconectada', 'desconetada', 'erro', 'error', 'offline'].includes(raw))
      return 'disconnected';
    return 'disconnected';
  };

  const statusLabelPt = (s: 'connected' | 'connecting' | 'disconnected') =>
    s === 'connected' ? 'Conectada' : s === 'connecting' ? 'Conectando' : 'Desconectada';
  const countsEvo = useMemo(() => {
    const allInstances: EvolutionInstance[] = Object.values(instancesByServer)
      .flatMap((s) => (s.success ? s.instances || [] : []));
    const connected = allInstances.filter((i) => normalizeInstanceStatus(i) === 'connected').length;
    const connecting = allInstances.filter((i) => normalizeInstanceStatus(i) === 'connecting').length;
    const disconnected = allInstances.filter((i) => normalizeInstanceStatus(i) === 'disconnected').length;
    return {
      servers: Object.keys(instancesByServer).length,
      instances: allInstances.length,
      connected,
      disconnected,
      connecting,
    };
  }, [instancesByServer]);

  // Normaliza o status vindo do WUZAPI para três estados finais
  const normalizeWuStatus = (
    user: WuzapiUser
  ): 'connected' | 'connecting' | 'disconnected' => {
    const connected = !!user.connected;
    const logged = !!user.loggedIn;
    if (connected && logged) return 'connected';
    if (connected && !logged) return 'connecting';
    return 'disconnected';
  };

  const countsWu = useMemo(() => {
    const allUsers: WuzapiUser[] = Object.values(wuUsersByServer)
      .flatMap((s) => (s.success ? s.users || [] : []));
    const connected = allUsers.filter((u) => normalizeWuStatus(u) === 'connected').length;
    const connecting = allUsers.filter((u) => normalizeWuStatus(u) === 'connecting').length;
    const disconnected = allUsers.filter((u) => normalizeWuStatus(u) === 'disconnected').length;
    return {
      servers: Object.keys(wuUsersByServer).length,
      instances: allUsers.length,
      connected,
      disconnected,
      connecting,
    };
  }, [wuUsersByServer]);

  const counts = currentFilterType === 'wuzapi' ? countsWu : countsEvo;

  const loadOnlineInstances = async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      if (!selectAllEvolution && selectedServerIds.length === 0) {
        setInstancesByServer({});
        return;
      }
      // Não exigir isActive vindo do backend (não persistido). Considerar ativo por padrão.
      const evoServers = servers
        .filter((s) => s.type === 'evolution' && s.isActive !== false)
        .filter((s) => (selectAllEvolution ? true : selectedServerIds.includes(s.id)));
      const results: Record<string, {
        server: Server;
        instances: EvolutionInstance[];
        success: boolean;
        error?: string;
      }> = {};

      for (const server of evoServers) {
        try {
          evolutionApiService.setConfig(server.url, server.apiKey);
          const instances = await evolutionApiService.getAllInstances();
          results[server.id] = { server, instances, success: true };
        } catch (err: any) {
          results[server.id] = { server, instances: [], success: false, error: err?.message || 'Servidor offline' };
        }
      }

      setInstancesByServer(results);
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } finally {
      setOnlineLoading(false);
    }
  };

  const loadOnlineWuUsers = async () => {
    setOnlineLoading(true);
    setOnlineError(null);
    try {
      if (!selectAllWu && selectedWuServerIds.length === 0) {
        setWuUsersByServer({});
        return;
      }
      const wuServers = servers
        .filter((s) => s.type === 'wuzapi' && s.isActive !== false)
        .filter((s) => (selectAllWu ? true : selectedWuServerIds.includes(s.id)));

      const results: Record<string, {
        server: Server;
        users: WuzapiUser[];
        success: boolean;
        error?: string;
      }> = {};

      for (const server of wuServers) {
        try {
          const resp = await api.get(`/servers/${server.id}/wuz/users`);
          const users = resp?.data?.users || resp?.data?.data || [];
          results[server.id] = { server, users, success: true };
        } catch (err: any) {
          const msg = err?.response?.data?.message || err?.message || 'Servidor offline';
          results[server.id] = { server, users: [], success: false, error: msg };
        }
      }

      setWuUsersByServer(results);
      setLastUpdate(new Date().toLocaleString('pt-BR'));
    } finally {
      setOnlineLoading(false);
    }
  };

  const exportEvolutionToDatabase = async () => {
    try {
      setExporting(true);
      setOnlineError(null);
      let totalItems = 0;
      const chunkSize = 50;
      for (const { server, instances, success } of Object.values(instancesByServer)) {
        if (!success || !instances || instances.length === 0) continue;
        totalItems += instances.length;
        // Gera batchId/exportDate únicos por servidor para vincular todos os chunks
        const batchId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) 
          ? (crypto as any).randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const exportDate = new Date().toISOString();
        // Exporta em chunks para evitar 413 Payload Too Large
        for (let i = 0; i < instances.length; i += chunkSize) {
          const slice = instances.slice(i, i + chunkSize);
          await connectionService.exportConnections({ type: 'evolution', serverId: server.id, items: slice, batchId, exportDate });
        }
      }
      setLastUpdate(`Exportadas ${totalItems} instância(s) para o banco em ${new Date().toLocaleString('pt-BR')}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao exportar instâncias';
      setOnlineError(msg);
    } finally {
      setExporting(false);
    }
  };

  const exportWuUsersToDatabase = async () => {
    try {
      setExporting(true);
      setOnlineError(null);
      let totalItems = 0;
      const chunkSize = 50;
      for (const { server, users, success } of Object.values(wuUsersByServer)) {
        if (!success || !users || users.length === 0) continue;
        totalItems += users.length;
        // Gera batchId/exportDate únicos por servidor para vincular todos os chunks
        const batchId = (typeof crypto !== 'undefined' && (crypto as any).randomUUID) 
          ? (crypto as any).randomUUID() 
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const exportDate = new Date().toISOString();
        // Exporta em chunks para evitar 413 Payload Too Large
        for (let i = 0; i < users.length; i += chunkSize) {
          const slice = users.slice(i, i + chunkSize);
          await connectionService.exportConnections({ type: 'wuzapi', serverId: server.id, items: slice, batchId, exportDate });
        }
      }
      setLastUpdate(`Exportados ${totalItems} usuário(s) WU para o banco em ${new Date().toLocaleString('pt-BR')}`);
    } catch (e: any) {
      const msg = e?.response?.data?.message || e?.message || 'Erro ao exportar usuários WU';
      setOnlineError(msg);
    } finally {
      setExporting(false);
    }
  };

  const shouldShowInstance = (inst: EvolutionInstance) => {
    const st = normalizeInstanceStatus(inst);
    if (onlineFilter === 'all') return true;
    if (onlineFilter === 'connected') return st === 'connected';
    if (onlineFilter === 'connecting') return st === 'connecting';
    if (onlineFilter === 'disconnected') return st === 'disconnected';
    return true;
  };

  const openOnlineQRModal = async (server: Server, instance: EvolutionInstance) => {
    // Agora usamos o modal EvoQrModal para gerar o QR (cópia 100% do HTML)
    setQrOnlineServer(server);
    setQrOnlineInstance(instance);
    setOnlineError(null);
    setQrCodeData(null);
    setQrLoading(false);
    setQrModalOpen(true);
  };

  const openWuQRModal = async (server: Server, user: WuzapiUser) => {
    setQrWuServer(server);
    setQrWuUser(user);
    setOnlineError(null);
    setQrModalOpen(true);
  };

  const refreshOnlineQRCode = async () => {
    if (!qrOnlineServer || !qrOnlineInstance) return;
    setQrLoading(true);
    try {
      evolutionApiService.setConfig(qrOnlineServer.url, qrOnlineServer.apiKey);
      const base64 = await evolutionApiService.getQRCode(qrOnlineInstance.name);
      setQrCodeData(`data:image/png;base64,${base64}`);
    } catch (e) {
      setOnlineError('Erro ao atualizar QR Code');
    } finally {
      setQrLoading(false);
    }
  };

  const shouldShowWuUser = (user: WuzapiUser) => {
    const st = normalizeWuStatus(user);
    if (onlineFilter === 'all') return true;
    if (onlineFilter === 'connected') return st === 'connected';
    if (onlineFilter === 'connecting') return st === 'connecting';
    if (onlineFilter === 'disconnected') return st === 'disconnected';
    return true;
  };

  const logoutInstance = async (server: Server, instanceName: string) => {
    try {
      evolutionApiService.setConfig(server.url, server.apiKey);
      await evolutionApiService.logoutInstance(instanceName);
      await loadOnlineInstances();
    } catch (e) {
      setOnlineError('Erro ao desconectar instância');
    }
  };

  const disconnectAllConnectingInstances = async () => {
    try {
      for (const { server, instances, success } of Object.values(instancesByServer)) {
        if (!success) continue;
        for (const inst of instances) {
          if (normalizeInstanceStatus(inst) === 'connecting') {
            evolutionApiService.setConfig(server.url, server.apiKey);
            try { await evolutionApiService.logoutInstance(inst.name); } catch {}
          }
        }
      }
      await loadOnlineInstances();
    } catch (e) {
      setOnlineError('Erro ao desconectar em lote');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'connecting':
        return <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'connected':
        return 'Conectado';
      case 'connecting':
        return 'Conectando';
      case 'error':
        return 'Erro';
      default:
        return 'Desconectado';
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClasses = 'inline-flex px-2 py-1 text-xs font-semibold rounded-full';
    switch (status) {
      case 'connected':
        return `${baseClasses} bg-green-100 text-green-800`;
      case 'connecting':
        return `${baseClasses} bg-yellow-100 text-yellow-800`;
      case 'error':
        return `${baseClasses} bg-red-100 text-red-800`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`;
    }
  };

  if (showForm) {
    return (
      <div className="relative">
        {/* Overlay */}
        <div
          className="fixed inset-0 bg-black bg-opacity-40"
          onClick={() => {
            setShowForm(false);
            setEditingConnection(null);
          }}
        />
        
        {/* Modal */}
        <div className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
          <div
            className="bg-white rounded-lg shadow-lg w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
                <Plus className="h-5 w-5 text-green-600" />
                <span>{editingConnection ? 'Editar Conexão' : 'Nova Conexão'}</span>
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingConnection(null);
                }}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Fechar"
              >
                ✕
              </button>
            </div>
            <div className="p-4">
              <ConnectionForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredConnections = connections.filter((c) => {
    if (filterType === 'all') return true;
    return c.type === filterType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Filtros do Banco – renderizados abaixo das ações */}
      <div className="bg-white border rounded-lg p-4 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-gray-900">Conexões WhatsApp</h2>
          <p className="text-sm text-gray-600">Gerencie suas conexões com WhatsApp</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <button
            onClick={() => setOnlineMode(true)}
            className={`w-full sm:w-auto px-3 py-2 rounded ${onlineMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Online
          </button>
          <button
            onClick={() => setOnlineMode(false)}
            className={`w-full sm:w-auto px-3 py-2 rounded ${!onlineMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Banco
          </button>
          {/* Filtros sempre visíveis no modo Banco – botão de toggle removido */}
          {!onlineMode && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Conexão
            </button>
          )}
        </div>
      </div>

      {/* Filtros (modo Banco) – painel estruturado, sempre visível no modo Banco */}
      {!onlineMode && (
        <div className="bg-white border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-gray-800">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros do Banco</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={clearDbFilters}
                className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 inline-flex items-center shadow-sm transition-colors"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Limpar
              </button>
              {/* Botão de ocultar removido conforme solicitado */}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="db-server-select" className="block text-sm font-medium text-gray-700">Servidor</label>
              <select
                id="db-server-select"
                ref={dbServerSelectRef}
                value={dbServerFilter}
                onChange={e => {
                  setDbServerFilter(e.target.value);
                  setDbBatchFilter('');
                }}
                className="w-full border rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
              >
                <option value="">Selecione</option>
                {servers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Obrigatório: selecione um servidor.</p>
            </div>
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">Data de exportação</label>
              <select
                value={dbBatchFilter}
                onChange={e => setDbBatchFilter(e.target.value)}
                className="w-full border rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed disabled:border-gray-200"
                disabled={!dbServerFilter || dbSnapshots.length === 0}
              >
                <option value="">Selecione</option>
                {dbSnapshots.map(s => (
                  <option key={s.id} value={s.batchId}>{new Date(s.exportedAt).toLocaleString('pt-BR')}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500">Obrigatório: selecione a data de exportação.</p>
            </div>
          </div>
        </div>
      )}

      {/* MODO ONLINE */}
      {onlineMode && (
        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="bg-white border rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full space-y-2">
              <ServerFilter
                defaultType="evolution"
                defaultSelectedIds={[]}
                mode="list"
                onSelectionChange={({ type, serverIds, all }) => {
                  setCurrentFilterType(type);
                  if (type === 'evolution') {
                    setSelectedServerIds(serverIds);
                    setSelectAllEvolution(!!all);
                    setSelectedWuServerIds([]);
                    setSelectAllWu(false);
                  } else {
                    setSelectedWuServerIds(serverIds);
                    setSelectAllWu(!!all);
                    setSelectedServerIds([]);
                    setSelectAllEvolution(false);
                  }
                  // Limpar resultados sempre que filtros/seleções mudarem
                  setInstancesByServer({});
                  setWuUsersByServer({});
                  setLastUpdate('');
                  setOnlineError(null);
                }}
              />
              {currentFilterType === 'evolution' && (
                <button
                  onClick={() => loadOnlineInstances()}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
                </button>
              )}
              {currentFilterType === 'wuzapi' && (
                <button
                  onClick={() => loadOnlineWuUsers()}
                  className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Atualizar WU
                </button>
              )}
              {currentFilterType === 'evolution' && (
                <button
                  onClick={exportEvolutionToDatabase}
                  disabled={exporting || Object.values(instancesByServer).every((g) => !g.success || (g.instances || []).length === 0)}
                  className="ml-2 inline-flex items-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Exportando...
                    </>
                  ) : (
                    'Exportar'
                  )}
                </button>
              )}
              {currentFilterType === 'wuzapi' && (
                <button
                  onClick={exportWuUsersToDatabase}
                  disabled={exporting || Object.values(wuUsersByServer).every((g) => !g.success || (g.users || []).length === 0)}
                  className="ml-2 inline-flex items-center px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {exporting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Exportando...
                    </>
                  ) : (
                    'Exportar'
                  )}
                </button>
              )}
            </div>
            <div className="w-full space-y-2">
              <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setOnlineFilter('all')}
                className={`filter-button px-3 py-2 rounded ${onlineFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Todos
              </button>
              <button
                onClick={() => setOnlineFilter('connected')}
                className={`filter-button px-3 py-2 rounded ${onlineFilter === 'connected' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Conectadas
              </button>
              <button
                onClick={() => setOnlineFilter('connecting')}
                className={`filter-button px-3 py-2 rounded ${onlineFilter === 'connecting' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Conectando
              </button>
              <button
                onClick={() => setOnlineFilter('disconnected')}
                className={`filter-button px-3 py-2 rounded ${onlineFilter === 'disconnected' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                Desconectadas
              </button>
              </div>
              {currentFilterType === 'evolution' && (
                <button
                  onClick={disconnectAllConnectingInstances}
                  className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  disabled={counts.connecting === 0}
                >
                  Desconectar todos (Conectando)
                </button>
              )}
            </div>
          </div>

          {/* Contadores */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <div className="text-blue-700 text-sm">Servidores</div>
              <div className="text-2xl font-bold text-blue-900">{counts.servers}</div>
            </div>
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 text-center">
              <div className="text-sky-700 text-sm">{currentFilterType === 'wuzapi' ? 'Usuários' : 'Instâncias'}</div>
              <div className="text-2xl font-bold text-sky-900">{counts.instances}</div>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <div className="text-emerald-700 text-sm">Conectadas</div>
              <div className="text-2xl font-bold text-emerald-900">{counts.connected}</div>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-red-700 text-sm">Desconectadas</div>
              <div className="text-2xl font-bold text-red-900">{counts.disconnected}</div>
            </div>
          </div>

          {/* Erros / Loading */}
          {onlineError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <XCircle className="h-5 w-5 text-red-500 mr-2" />
                <span className="text-red-700">{onlineError}</span>
              </div>
            </div>
          )}
          {onlineLoading && (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
              <span className="text-gray-600">Carregando instâncias...</span>
            </div>
          )}

          {/* Lista por servidor */}
          <div className="space-y-6">
            {Object.values(instancesByServer).map(({ server, instances, success, error }) => (
              <div key={server.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mr-3">
                      <Zap className="h-5 w-5 text-blue-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-blue-900">{server.name}</h3>
                      <p className="text-blue-600 text-sm">{success ? instances.length : 0} instância(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className={`text-sm font-medium ${success ? 'text-green-600' : 'text-red-600'}`}>
                      {success ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {!success && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700">
                    {error || 'Servidor offline'}
                  </div>
                )}

                {success && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {instances.filter(shouldShowInstance).map((inst) => {
                      const st = normalizeInstanceStatus(inst);
                      const isConnected = st === 'connected';
                      const isConnecting = st === 'connecting';
                      let cardBg = 'bg-red-50 border-red-200 text-red-900';
                      if (isConnected) cardBg = 'bg-green-50 border-green-200 text-green-900';
                      else if (isConnecting) cardBg = 'bg-yellow-50 border-yellow-200 text-yellow-900';

                      // telefone
                      let phoneNumber = 'N/A';
                      if (inst.ownerJid) {
                        const m = inst.ownerJid.match(/(\d+)@/);
                        if (m) phoneNumber = '+' + m[1];
                      } else if (inst.name) {
                        const m = inst.name.match(/(\d{10,15})/);
                        if (m) phoneNumber = '+' + m[1];
                      }

                      return (
                        <div key={inst.id} className={`${cardBg} rounded-xl p-4 card-hover border overflow-hidden`}>
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 gap-3">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-lg font-semibold mb-1 break-all leading-snug">{inst.name}</h4>
                              <p className="text-sm font-medium break-all">{phoneNumber}</p>
                            </div>
                            <span className={`flex-shrink-0 px-3 py-1 rounded-full text-sm font-medium shadow-sm ${isConnected ? 'bg-green-600 text-white' : isConnecting ? 'bg-yellow-500 text-white' : 'bg-red-600 text-white'}`}>{statusLabelPt(st)}</span>
                          </div>

                          {isConnecting && (
                            <button
                              onClick={() => logoutInstance(server, inst.name)}
                              className="mt-3 w-full bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                            >
                              Desconectar
                            </button>
                          )}

                          {!isConnected && !isConnecting && (
                            <button
                              onClick={() => openOnlineQRModal(server, inst)}
                              className="mt-3 w-full bg-blue-500 hover:bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                            >
                              <div className="flex items-center justify-center"><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
            {/* WUZAPI por servidor */}
            {Object.values(wuUsersByServer).map(({ server, users, success, error }) => (
              <div key={`wu-${server.id}`} className="bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-2xl shadow-sm border border-purple-200 p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center mr-3">
                      <Zap className="h-5 w-5 text-purple-700" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-purple-900">{server.name} (WU)</h3>
                      <p className="text-purple-600 text-sm">{success ? users.length : 0} usuário(s)</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${success ? 'bg-green-400' : 'bg-red-400'}`}></div>
                    <span className={`text-sm font-medium ${success ? 'text-green-600' : 'text-red-600'}`}>
                      {success ? 'Online' : 'Offline'}
                    </span>
                  </div>
                </div>

                {!success && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center text-red-700">
                    {error || 'Servidor offline'}
                  </div>
                )}

                {success && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {users.filter(shouldShowWuUser).map((u) => {
                      const st = normalizeWuStatus(u);
                      const isConnected = st === 'connected';
                      const isConnecting = st === 'connecting';
                      return (
                        <div key={u.id} className="bg-white rounded-xl shadow border border-purple-200 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <div className="text-sm font-semibold text-gray-900 truncate">{u.name}</div>
                              <div className="text-xs text-gray-500 font-mono truncate">{u.token}</div>
                            </div>
                            <div className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : isConnecting ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>{isConnected ? 'Conectada' : isConnecting ? 'Conectando' : 'Desconectada'}</div>
                          </div>
                          <div className="text-xs text-gray-600 mb-3">{u.jid || '-'}</div>
                          {!isConnected && (
                            <button
                              onClick={() => openWuQRModal(server, u)}
                              className="mt-1 w-full bg-purple-500 hover:bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                            >
                              <div className="flex items-center justify-center"><QrCode className="h-4 w-4 mr-2" /> Gerar QR Code</div>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error Message (modo banco) */}
      {!onlineMode && error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <XCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* Loading State (modo banco) */}
      {!onlineMode && isLoading && (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-blue-500 mr-2" />
          <span className="text-gray-600">Carregando conexões...</span>
        </div>
      )}

      {/* Lista banco: exibir apenas quando ambos filtros estiverem selecionados */}
      {!onlineMode && !isLoading && (dbServerFilter && dbBatchFilter) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {connections.length === 0 ? (
            <div className="text-center py-12">
              <Smartphone className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão encontrada</h3>
              <p className="text-gray-500 mb-4">Crie sua primeira conexão WhatsApp para começar</p>
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeira Conexão
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Conexão
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefone
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Última Atividade
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
          {filteredConnections
            .filter(c => (!dbServerFilter || c.serverId === dbServerFilter) && (!dbBatchFilter || c.exportBatchId === dbBatchFilter))
            .map((connection) => (
                    <tr key={connection.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                              {connection.type === 'evolution' ? (
                                <Zap className="h-5 w-5 text-blue-500" />
                              ) : (
                                <Smartphone className="h-5 w-5 text-green-500" />
                              )}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{connection.name}</div>
                            <div className="text-sm text-gray-500">{connection.instanceName || connection.token}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {connection.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getStatusIcon(connection.status)}
                          <span className={`ml-2 ${getStatusBadge(connection.status)}`}>
                            {getStatusText(connection.status)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {connection.phone || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {connection.lastActivity ? new Date(connection.lastActivity).toLocaleString('pt-BR') : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {connection.type === 'evolution' && (
                            <button
                              onClick={() => openQRModal(connection)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Gerar/Ver QR Code"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(connection)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Editar"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(connection.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal de QR Code - Banco de dados */}
      {qrModalOpen && !onlineMode && qrModalConnection && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black bg-opacity-40"
            onClick={() => {
              setQrModalOpen(false);
              setQrModalConnection(null);
              setQrOnlineServer(null);
              setQrOnlineInstance(null);
              setQrWuServer(null);
              setQrWuUser(null);
              setQrCodeData(null);
            }}
          />
          <div className="absolute inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-lg sm:max-w-xl md:max-w-2xl lg:max-w-3xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold text-gray-900">QR Code - {qrModalConnection?.name || ''}</h2>
                <button
                  onClick={() => {
                    setQrModalOpen(false);
                    setQrModalConnection(null);
                    setQrOnlineServer(null);
                    setQrOnlineInstance(null);
                    setQrWuServer(null);
                    setQrWuUser(null);
                    setQrCodeData(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <QRCodeDisplay
                  qrCode={qrCodeData ?? undefined}
                  isLoading={qrLoading}
                  onRefresh={refreshQRCode}
                  connectionStatus={((qrModalConnection?.status as any) || 'connecting')}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de QR Code - Online (Evolution) replicando 100% do HTML */}
      {qrModalOpen && onlineMode && qrOnlineServer && qrOnlineInstance && (
        <EvoQrModal
          isOpen={true}
          onClose={() => {
            setQrModalOpen(false);
            setQrOnlineServer(null);
            setQrOnlineInstance(null);
            setQrCodeData(null);
          }}
          server={qrOnlineServer}
          instance={qrOnlineInstance}
        />
      )}

      {/* Modal de QR Code - Online (WUZAPI) */}
      {qrModalOpen && onlineMode && qrWuServer && qrWuUser && (
        <WuQrModal
          isOpen={true}
          onClose={() => {
            setQrModalOpen(false);
            setQrWuServer(null);
            setQrWuUser(null);
            setQrCodeData(null);
          }}
          server={qrWuServer}
          user={qrWuUser}
        />
      )}
    </div>
  );
}