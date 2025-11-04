import React, { useState } from 'react';
import { authService } from '../services/authService';
import { 
  Settings as SettingsIcon, 
  Save, 
  RefreshCw, 
  Bell, 
  Shield, 
  Database, 
  Globe,
  User,
  Key,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  TestTube,
  Server,
  Plus,
  Edit,
  Check,
  X,
  Zap,
  MessageSquare
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import ServerForm from '../components/ServerForm';
import ServerList from '../components/ServerList';
import { Server as ServerType } from '../types';

interface TestResult {
  service: string;
  endpoint: string;
  status: 'success' | 'error' | 'loading';
  message: string;
  data?: any;
}

interface AppSettings {
  general: {
    appName: string;
    language: string;
    timezone: string;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  notifications: {
    enabled: boolean;
    email: boolean;
    webhook: boolean;
    desktop: boolean;
    sound: boolean;
  };
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    requireStrongPassword: boolean;
    twoFactorAuth: boolean;
  };
  api: {
    timeout: number;
    retryAttempts: number;
  };
  logs: {
    level: string;
    retention: number;
    maxSize: number;
    autoCleanup: boolean;
  };
}

export function Settings() {
  const { addLog, clearLogs } = useConnectionStore();
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);
  
  // Server management states
  const [showServerForm, setShowServerForm] = useState(false);
  const [editingServer, setEditingServer] = useState<ServerType | undefined>(undefined);
  
  const [settings, setSettings] = useState<AppSettings>({
    general: {
      appName: 'WhatsApp Manager',
      language: 'pt-BR',
      timezone: 'America/Sao_Paulo',
      autoRefresh: true,
      refreshInterval: 30
    },
    notifications: {
      enabled: true,
      email: true,
      webhook: true,
      desktop: false,
      sound: true
    },
    security: {
      sessionTimeout: 60,
      maxLoginAttempts: 5,
      requireStrongPassword: true,
      twoFactorAuth: false
    },
    api: {
      timeout: 30000,
      retryAttempts: 3
    },
    logs: {
      level: 'info',
      retention: 2,
      maxSize: 100,
      autoCleanup: true
    }
  });

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      addLog({
        id: Date.now().toString(),
        type: 'success',
        action: 'Configurações Salvas',
        message: 'Todas as configurações foram salvas com sucesso',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      addLog({
        id: Date.now().toString(),
        type: 'error',
        action: 'Erro ao Salvar',
        message: `Falha ao salvar configurações: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const clearTestResults = () => {
    setTestResults([]);
  };

  const runAllTests = async () => {
    setIsTesting(true);
    clearTestResults();
    
    // TODO: Implement test all connections
    
    setIsTesting(false);
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `whatsapp-manager-settings-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);

    addLog({
      id: Date.now().toString(),
      type: 'info',
      action: 'Configurações Exportadas',
      message: 'Configurações exportadas com sucesso',
      timestamp: new Date().toISOString(),
    });
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        setSettings(importedSettings);
        
        addLog({
          id: Date.now().toString(),
          type: 'success',
          action: 'Configurações Importadas',
          message: 'Configurações importadas com sucesso',
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        addLog({
          id: Date.now().toString(),
          type: 'error',
          action: 'Erro na Importação',
          message: 'Arquivo de configuração inválido',
          timestamp: new Date().toISOString(),
        });
      }
    };
    reader.readAsText(file);
  };

  const tabs = [
    { id: 'general', name: 'Geral', icon: SettingsIcon },
    { id: 'notifications', name: 'Notificações', icon: Bell },
    { id: 'security', name: 'Segurança', icon: Shield },
    { id: 'servers', name: 'Servidores', icon: Server },
    { id: 'test', name: 'Teste APIs', icon: TestTube },
    { id: 'logs', name: 'Logs', icon: Database }
  ];

  // Alterar Senha (autenticado)
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    try {
      await authService.changePassword(currentPassword, newPassword);
      setPasswordMsg('Senha alterada com sucesso');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao alterar senha';
      setPasswordMsg(msg);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Configurações</h2>
          <p className="text-gray-600">Gerencie as configurações do sistema</p>
        </div>
        <div className="flex items-center space-x-3">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              className="hidden"
            />
            <div className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Importar</span>
            </div>
          </label>
          <button
            onClick={handleExportSettings}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Exportar</span>
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Salvando...' : 'Salvar'}</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex border-b border-gray-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-blue-50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* General Settings */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações Gerais</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="appName" className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Aplicação
                    </label>
                    <input
                      type="text"
                      id="appName"
                      value={settings.general.appName}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, appName: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                      Idioma
                    </label>
                    <select
                      id="language"
                      value={settings.general.language}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, language: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="pt-BR">Português (Brasil)</option>
                      <option value="en-US">English (US)</option>
                      <option value="es-ES">Español</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
                      Fuso Horário
                    </label>
                    <select
                      id="timezone"
                      value={settings.general.timezone}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, timezone: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="America/Sao_Paulo">São Paulo (GMT-3)</option>
                      <option value="America/New_York">New York (GMT-5)</option>
                      <option value="Europe/London">London (GMT+0)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-1">
                      Intervalo de Atualização (segundos)
                    </label>
                    <input
                      type="number"
                      id="refreshInterval"
                      min="10"
                      max="300"
                      value={settings.general.refreshInterval}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, refreshInterval: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.general.autoRefresh}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        general: { ...prev.general, autoRefresh: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">Atualização automática</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Settings */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Notificações</h3>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notificações Habilitadas</span>
                      <p className="text-xs text-gray-500">Ativar/desativar todas as notificações</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.enabled}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, enabled: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notificações por Email</span>
                      <p className="text-xs text-gray-500">Receber alertas por email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.email}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, email: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Webhooks</span>
                      <p className="text-xs text-gray-500">Enviar notificações via webhook</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.webhook}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, webhook: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Notificações Desktop</span>
                      <p className="text-xs text-gray-500">Mostrar notificações no desktop</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.desktop}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, desktop: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Sons de Notificação</span>
                      <p className="text-xs text-gray-500">Reproduzir som nas notificações</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.notifications.sound}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        notifications: { ...prev.notifications, sound: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Security Settings */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Segurança</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                      Timeout da Sessão (minutos)
                    </label>
                    <input
                      type="number"
                      id="sessionTimeout"
                      min="5"
                      max="480"
                      value={settings.security.sessionTimeout}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, sessionTimeout: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="maxLoginAttempts" className="block text-sm font-medium text-gray-700 mb-1">
                      Máximo de Tentativas de Login
                    </label>
                    <input
                      type="number"
                      id="maxLoginAttempts"
                      min="3"
                      max="10"
                      value={settings.security.maxLoginAttempts}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, maxLoginAttempts: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Exigir Senha Forte</span>
                      <p className="text-xs text-gray-500">Senhas devem ter pelo menos 8 caracteres com números e símbolos</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.requireStrongPassword}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, requireStrongPassword: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Autenticação de Dois Fatores</span>
                      <p className="text-xs text-gray-500">Adicionar uma camada extra de segurança</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.security.twoFactorAuth}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        security: { ...prev.security, twoFactorAuth: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              {/* Alterar Senha */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Alterar Senha</h3>
                  {passwordMsg && (
                    <div className={`mb-4 p-3 rounded border ${passwordMsg.includes('sucesso') ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>{passwordMsg}</div>
                  )}
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                      Alterar Senha
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Servers Tab */}
          {activeTab === 'servers' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Gerenciar Servidores</h3>
                  <p className="text-gray-600">
                    Configure e gerencie seus servidores.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingServer(undefined);
                    setShowServerForm(true);
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Server className="h-4 w-4" />
                  <span>Novo Servidor</span>
                </button>
              </div>

              <ServerList
                onEditServer={(server) => {
                  setEditingServer(server);
                  setShowServerForm(true);
                }}
              />

              {showServerForm && (
                <ServerForm
                  server={editingServer}
                  onClose={() => {
                    setShowServerForm(false);
                    setEditingServer(undefined);
                  }}
                  onSave={() => {
                    setShowServerForm(false);
                    setEditingServer(undefined);
                  }}
                />
              )}
            </div>
          )}

          {/* API Test Tab */}
          {activeTab === 'test' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Teste de Conectividade das APIs</h3>
                <p className="text-gray-600 mb-6">
                  Teste as conexões com as APIs.
                </p>

                <div className="mb-6 flex gap-4">
                  <button
                    onClick={runAllTests}
                    disabled={isTesting}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isTesting && <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>}
                    {isTesting ? 'Testando...' : 'Executar Todos os Testes'}
                  </button>
                  
                  <button
                    onClick={clearTestResults}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                  >
                    Limpar Resultados
                  </button>
                </div>

                <div className="space-y-4">
                  {testResults.map((result, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{result.service}</span>
                          <span className="text-sm font-mono bg-white px-2 py-1 rounded">
                            {result.endpoint}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {result.status === 'loading' && (
                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full"></div>
                          )}
                          <span className="text-sm font-medium capitalize">
                            {result.status}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm mb-2">{result.message}</p>
                      
                      {result.data && (
                        <details className="mt-2">
                          <summary className="cursor-pointer text-sm font-medium">
                            Ver dados da resposta
                          </summary>
                          <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))}
                  
                  {testResults.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      Clique em um dos botões acima para testar as APIs
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Logs Settings */}
          {activeTab === 'logs' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurações de Logs</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="logLevel" className="block text-sm font-medium text-gray-700 mb-1">
                      Nível de Log
                    </label>
                    <select
                      id="logLevel"
                      value={settings.logs.level}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        logs: { ...prev.logs, level: e.target.value }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="retention" className="block text-sm font-medium text-gray-700 mb-1">
                      Retenção (dias)
                    </label>
                    <input
                      type="number"
                      id="retention"
                      min="1"
                      max="365"
                      value={settings.logs.retention}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        logs: { ...prev.logs, retention: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label htmlFor="maxSize" className="block text-sm font-medium text-gray-700 mb-1">
                      Tamanho Máximo (MB)
                    </label>
                    <input
                      type="number"
                      id="maxSize"
                      min="10"
                      max="1000"
                      value={settings.logs.maxSize}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        logs: { ...prev.logs, maxSize: parseInt(e.target.value) }
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <label className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-gray-700">Limpeza Automática</span>
                      <p className="text-xs text-gray-500">Remover logs antigos automaticamente</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.logs.autoCleanup}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        logs: { ...prev.logs, autoCleanup: e.target.checked }
                      }))}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>
                </div>

                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800">Ações Perigosas</h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Use estas ações com cuidado, pois não podem ser desfeitas.
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={() => {
                            if (confirm('Tem certeza que deseja limpar todos os logs? Esta ação não pode ser desfeita.')) {
                              clearLogs();
                            }
                          }}
                          className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:red-700 flex items-center space-x-1"
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>Limpar Todos os Logs</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}