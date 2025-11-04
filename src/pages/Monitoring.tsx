import { useState, useEffect } from 'react';
import { 
  Activity, 
  Cpu, 
  HardDrive, 
  Wifi, 
  Users, 
  MessageSquare,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { evolutionApiService } from '../services/evolutionApi';
import { wuzApiService } from '../services/wuzApi';

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  uptime: number;
  timestamp: string;
}

interface ConnectionMetrics {
  id: string;
  name: string;
  type: 'evolution' | 'wuzapi';
  status: 'connected' | 'disconnected' | 'error';
  messagesCount: number;
  lastActivity: string;
  responseTime: number;
  errorRate: number;
}

export function Monitoring() {
  const { connections, logs } = useConnectionStore();
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics[]>([]);
  const [connectionMetrics, setConnectionMetrics] = useState<ConnectionMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(loadMetrics, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      // Generate mock system metrics
      const newSystemMetric: SystemMetrics = {
        cpu: Math.random() * 100,
        memory: Math.random() * 100,
        disk: Math.random() * 100,
        network: Math.random() * 100,
        uptime: Date.now() - (Math.random() * 86400000), // Random uptime up to 24 hours
        timestamp: new Date().toISOString()
      };

      setSystemMetrics(prev => [...prev.slice(-19), newSystemMetric]); // Keep last 20 metrics

      // Generate connection metrics
      const connectionMetricsData: ConnectionMetrics[] = connections.map(connection => ({
        id: connection.id,
        name: connection.name,
        type: connection.type,
        status: connection.status,
        messagesCount: Math.floor(Math.random() * 1000),
        lastActivity: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        responseTime: Math.random() * 1000,
        errorRate: Math.random() * 10
      }));

      setConnectionMetrics(connectionMetricsData);

    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'connected': return 'bg-green-100';
      case 'error': return 'bg-red-100';
      default: return 'bg-gray-100';
    }
  };

  const formatUptime = (uptime: number) => {
    const seconds = Math.floor((Date.now() - uptime) / 1000);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const getMetricTrend = (current: number, previous: number) => {
    if (current > previous) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (current < previous) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    }
    return null;
  };

  const currentMetrics = systemMetrics[systemMetrics.length - 1];
  const previousMetrics = systemMetrics[systemMetrics.length - 2];

  const recentErrors = logs.filter(log => 
    log.type === 'error' && 
    new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length;

  const totalMessages = connectionMetrics.reduce((sum, conn) => sum + conn.messagesCount, 0);
  const avgResponseTime = connectionMetrics.length > 0 
    ? connectionMetrics.reduce((sum, conn) => sum + conn.responseTime, 0) / connectionMetrics.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Monitoramento do Sistema</h2>
          <p className="text-gray-600">Acompanhe o desempenho e status das conexões em tempo real</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Auto-refresh</span>
          </label>
          <button
            onClick={loadMetrics}
            disabled={isLoading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">CPU</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMetrics ? `${currentMetrics.cpu.toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Cpu className="h-8 w-8 text-blue-600" />
              {currentMetrics && previousMetrics && getMetricTrend(currentMetrics.cpu, previousMetrics.cpu)}
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentMetrics?.cpu || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Memória</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMetrics ? `${currentMetrics.memory.toFixed(1)}%` : '0%'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <HardDrive className="h-8 w-8 text-green-600" />
              {currentMetrics && previousMetrics && getMetricTrend(currentMetrics.memory, previousMetrics.memory)}
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${currentMetrics?.memory || 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rede</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMetrics ? `${currentMetrics.network.toFixed(1)} MB/s` : '0 MB/s'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Wifi className="h-8 w-8 text-purple-600" />
              {currentMetrics && previousMetrics && getMetricTrend(currentMetrics.network, previousMetrics.network)}
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min((currentMetrics?.network || 0) * 10, 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Uptime</p>
              <p className="text-2xl font-bold text-gray-900">
                {currentMetrics ? formatUptime(currentMetrics.uptime) : '0h 0m'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-600" />
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
          </div>
          <div className="mt-4">
            <p className="text-xs text-gray-500">Sistema operacional</p>
          </div>
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <MessageSquare className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Mensagens (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{totalMessages.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Activity className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tempo de Resposta</p>
              <p className="text-2xl font-bold text-gray-900">{avgResponseTime.toFixed(0)}ms</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Erros (24h)</p>
              <p className="text-2xl font-bold text-gray-900">{recentErrors}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Status das Conexões</h3>
        </div>

        {connectionMetrics.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Conexão
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Mensagens
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Resposta
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Taxa de Erro
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Última Atividade
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {connectionMetrics.map((connection) => (
                  <tr key={connection.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className={`h-10 w-10 rounded-full ${getStatusBg(connection.status)} flex items-center justify-center`}>
                            <Wifi className={`h-5 w-5 ${getStatusColor(connection.status)}`} />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{connection.name}</div>
                          <div className="text-sm text-gray-500">{connection.type.toUpperCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        connection.status === 'connected' ? 'bg-green-100 text-green-800' :
                        connection.status === 'error' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {connection.status === 'connected' ? 'Conectado' : 
                         connection.status === 'error' ? 'Erro' : 'Desconectado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {connection.messagesCount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {connection.responseTime.toFixed(0)}ms
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className={`${connection.errorRate > 5 ? 'text-red-600' : 'text-green-600'}`}>
                        {connection.errorRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(connection.lastActivity).toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhuma conexão para monitorar</h3>
            <p className="text-gray-500">Crie conexões para ver métricas de desempenho.</p>
          </div>
        )}
      </div>

      {/* System Health */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Saúde do Sistema</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">APIs Externas</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">Evolution API</span>
                </div>
                <span className="text-xs text-green-600">Operacional</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-gray-900">WUZAPI</span>
                </div>
                <span className="text-xs text-green-600">Operacional</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Alertas Recentes</h4>
            <div className="space-y-2">
              {recentErrors > 0 ? (
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">
                      {recentErrors} erro(s) nas últimas 24h
                    </span>
                  </div>
                  <span className="text-xs text-yellow-600">Atenção</span>
                </div>
              ) : (
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Nenhum alerta</span>
                  </div>
                  <span className="text-xs text-green-600">Tudo OK</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Auto-refresh indicator */}
      {autoRefresh && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-800">Monitoramento automático ativo</p>
              <p className="text-xs text-blue-600">
                As métricas são atualizadas automaticamente a cada 30 segundos.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}