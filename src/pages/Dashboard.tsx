import { useEffect, useState } from 'react';
import { 
  Smartphone, 
  Users, 
  Webhook, 
  Activity, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { DashboardStats } from '../types';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  trend?: string;
}

function StatCard({ title, value, icon: Icon, color, trend }: StatCardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {trend && (
            <p className="text-sm text-green-600 flex items-center mt-1">
              <TrendingUp className="h-4 w-4 mr-1" />
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const { connections, logs } = useConnectionStore();
  const [stats, setStats] = useState<DashboardStats>({
    totalConnections: 0,
    activeConnections: 0,
    totalUsers: 0,
    totalWebhooks: 0,
    messagesLastHour: 0,
    messagesLast24h: 0,
    uptime: '0h 0m',
  });
  useEffect(() => {
    updateStats();
  }, [connections, logs]);

  const updateStats = () => {
    const activeConnections = connections.filter(c => c.status === 'connected').length;
    const messagesLast24h = logs.filter(log => 
      log.type === 'info' && 
      new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ).length;

    setStats({
      totalConnections: connections.length,
      activeConnections,
      totalUsers: 5, // Mock data
      totalWebhooks: 3, // Mock data
      messagesLastHour: Math.floor(messagesLast24h / 24),
      messagesLast24h,
      uptime: '2h 15m',
    });
  };

  const recentConnections = connections.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total de Conexões"
          value={stats.totalConnections}
          icon={Smartphone}
          color="bg-blue-500"
          trend="+12% este mês"
        />
        <StatCard
          title="Conexões Ativas"
          value={stats.activeConnections}
          icon={CheckCircle}
          color="bg-green-500"
        />
        <StatCard
          title="Usuários"
          value={stats.totalUsers}
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          title="Webhooks"
          value={stats.totalWebhooks}
          icon={Webhook}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Connections */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Conexões Recentes</h3>
          <div className="space-y-3">
            {recentConnections.length > 0 ? (
              recentConnections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      connection.status === 'connected' ? 'bg-green-500' :
                      connection.status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium text-gray-900">{connection.name}</p>
                      <p className="text-sm text-gray-500">{connection.type.toUpperCase()}</p>
                    </div>
                  </div>
                  <span className={`text-sm px-2 py-1 rounded-full ${
                    connection.status === 'connected' ? 'bg-green-100 text-green-800' :
                    connection.status === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {connection.status === 'connected' ? 'Conectado' :
                     connection.status === 'connecting' ? 'Conectando' : 'Desconectado'}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Smartphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma conexão encontrada</p>
                <p className="text-sm">Crie sua primeira conexão para começar</p>
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Atividade Recente</h3>
          <div className="space-y-3">
            {logs.slice(0, 5).length > 0 ? (
              logs.slice(0, 5).map((log) => (
                <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className={`p-1 rounded-full ${
                    log.type === 'success' ? 'bg-green-100' :
                    log.type === 'warning' ? 'bg-yellow-100' :
                    log.type === 'error' ? 'bg-red-100' : 'bg-blue-100'
                  }`}>
                    {log.type === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                     log.type === 'warning' ? <AlertCircle className="h-4 w-4 text-yellow-600" /> :
                     log.type === 'error' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                     <Activity className="h-4 w-4 text-blue-600" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{log.action}</p>
                    <p className="text-sm text-gray-500">{log.message}</p>
                    <p className="text-xs text-gray-400 flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>Nenhuma atividade recente</p>
                <p className="text-sm">As atividades aparecerão aqui</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}