import { useState, useEffect } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Trash2,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  Calendar,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { LogEntry } from '../types';

type LogLevel = 'all' | 'info' | 'success' | 'warning' | 'error';
type TimeFilter = 'all' | 'today' | 'week' | 'month';

export function Logs() {
  const { logs, clearLogs } = useConnectionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [logLevel, setLogLevel] = useState<LogLevel>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [selectedConnection, setSelectedConnection] = useState<string>('all');

  const filteredLogs = logs.filter(log => {
    // Search filter
    if (searchTerm && !log.message.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !log.action.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }

    // Log level filter
    if (logLevel !== 'all' && log.type !== logLevel) {
      return false;
    }

    // Connection filter
    if (selectedConnection !== 'all' && log.connectionId !== selectedConnection) {
      return false;
    }

    // Time filter
    if (timeFilter !== 'all') {
      const logDate = new Date(log.timestamp);
      const now = new Date();
      
      switch (timeFilter) {
        case 'today':
          return logDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return logDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return logDate >= monthAgo;
        default:
          return true;
      }
    }

    return true;
  });

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      default: return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  const getLogColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      default: return 'bg-blue-50 border-blue-200';
    }
  };

  const getLogTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'success': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-blue-100 text-blue-800';
    }
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'Tipo', 'Ação', 'Mensagem', 'Conexão'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp,
        log.type,
        log.action,
        `"${log.message.replace(/"/g, '""')}"`,
        log.connectionId || 'Sistema'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getLogStats = () => {
    return {
      total: logs.length,
      success: logs.filter(l => l.type === 'success').length,
      error: logs.filter(l => l.type === 'error').length,
      warning: logs.filter(l => l.type === 'warning').length,
      info: logs.filter(l => l.type === 'info').length,
    };
  };

  const stats = getLogStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Logs do Sistema</h2>
          <p className="text-gray-600">Monitore atividades e eventos do sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={exportLogs}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
          <button
            onClick={() => {
              if (confirm('Tem certeza que deseja limpar todos os logs?')) {
                clearLogs();
              }
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Limpar</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <FileText className="h-6 w-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sucesso</p>
              <p className="text-2xl font-bold text-gray-900">{stats.success}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Erros</p>
              <p className="text-2xl font-bold text-gray-900">{stats.error}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Avisos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.warning}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Info className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Info</p>
              <p className="text-2xl font-bold text-gray-900">{stats.info}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                id="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Buscar logs..."
              />
            </div>
          </div>

          <div>
            <label htmlFor="logLevel" className="block text-sm font-medium text-gray-700 mb-1">
              Nível
            </label>
            <select
              id="logLevel"
              value={logLevel}
              onChange={(e) => setLogLevel(e.target.value as LogLevel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="info">Info</option>
              <option value="success">Sucesso</option>
              <option value="warning">Aviso</option>
              <option value="error">Erro</option>
            </select>
          </div>

          <div>
            <label htmlFor="timeFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Período
            </label>
            <select
              id="timeFilter"
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as TimeFilter)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="today">Hoje</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
            </select>
          </div>

          <div>
            <label htmlFor="connection" className="block text-sm font-medium text-gray-700 mb-1">
              Conexão
            </label>
            <select
              id="connection"
              value={selectedConnection}
              onChange={(e) => setSelectedConnection(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              {/* Add connection options here */}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Mostrando {filteredLogs.length} de {logs.length} logs
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setLogLevel('all');
              setTimeFilter('all');
              setSelectedConnection('all');
            }}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Logs Recentes ({filteredLogs.length})
          </h3>
        </div>

        {filteredLogs.length > 0 ? (
          <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
            {filteredLogs
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .map((log) => (
                <div key={log.id} className={`p-4 border-l-4 ${getLogColor(log.type)}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="flex-shrink-0 mt-0.5">
                        {getLogIcon(log.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLogTypeColor(log.type)}`}>
                            {log.type.toUpperCase()}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{log.action}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-2">{log.message}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                          </span>
                          {log.connectionId && (
                            <span className="flex items-center space-x-1">
                              <Activity className="h-3 w-3" />
                              <span>Conexão: {log.connectionId}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {logs.length === 0 ? 'Nenhum log encontrado' : 'Nenhum log corresponde aos filtros'}
            </h3>
            <p className="text-gray-500">
              {logs.length === 0 
                ? 'Os logs aparecerão aqui conforme as atividades do sistema.'
                : 'Tente ajustar os filtros para ver mais resultados.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Real-time indicator */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          </div>
          <div>
            <p className="text-sm font-medium text-green-800">Monitoramento em tempo real ativo</p>
            <p className="text-xs text-green-600">
              Os logs são atualizados automaticamente conforme as atividades do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}