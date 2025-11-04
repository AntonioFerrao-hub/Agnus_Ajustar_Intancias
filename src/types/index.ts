// Common Types
export interface Connection {
  id: string;
  name: string;
  type: 'evolution' | 'wuzapi';
  status: 'connected' | 'disconnected' | 'connecting' | 'error';
  phone?: string;
  profileName?: string;
  profilePicture?: string;
  qrCode?: string;
  token?: string;
  instanceName?: string;
  createdAt: string;
  lastActivity?: string;
  webhook?: string;
}

// Payload para criação/atualização de conexão com suporte a Evolution flags
export interface CreateConnectionPayload {
  name: string;
  type: 'evolution' | 'wuzapi';
  status?: 'connected' | 'disconnected' | 'connecting' | 'error';
  phone?: string; // mapeado para number na Evolution
  webhook?: string | {
    url: string;
    byEvents?: boolean;
    base64?: boolean;
    headers?: Record<string, string>;
    events?: string[];
  };
  token?: string; // usado para WUZAPI
  instanceName?: string; // usado para Evolution
  serverId?: string; // servidor alvo

  // Flags específicas Evolution (top-level conforme API /instance/create)
  qrcode?: boolean; // default true
  integration?: string; // default 'WHATSAPP-BAILEYS'
  rejectCall?: boolean;
  msgCall?: string;
  groupsIgnore?: boolean;
  alwaysOnline?: boolean;
  readMessages?: boolean;
  readStatus?: boolean;
  syncFullHistory?: boolean;
  proxyHost?: string;
  proxyPort?: string;
  proxyProtocol?: string;
  proxyUsername?: string;
  proxyPassword?: string;
}

export interface Server {
  id: string;
  name: string;
  type: 'evolution' | 'wuzapi';
  url: string;
  apiKey: string;
  isDefault: boolean;
  isActive: boolean;
  status: 'online' | 'offline' | 'testing' | 'error';
  lastTested?: string;
  createdAt: string;
  updatedAt: string;
  description?: string;
}

export interface ServerFormData {
  name: string;
  type: 'evolution' | 'wuzapi';
  url: string;
  apiKey: string;
  description?: string;
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  token?: string;
  createdAt: string;
  lastLogin?: string;
  active: boolean;
}

export interface Webhook {
  id: string;
  connectionId: string;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
  lastTriggered?: string;
}

export interface LogEntry {
  id: string;
  connectionId?: string;
  userId?: string;
  type: 'info' | 'warning' | 'error' | 'success';
  action: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalConnections: number;
  activeConnections: number;
  totalUsers: number;
  totalWebhooks: number;
  messagesLastHour: number;
  messagesLast24h: number;
  uptime: string;
}

// Evolution API specific types
export interface EvolutionConnection extends Connection {
  type: 'evolution';
  instanceName: string;
  whatsappWebVersion?: string;
}

// WUZAPI specific types
export interface WuzapiConnection extends Connection {
  type: 'wuzapi';
  token: string;
  userId?: string;
}

// WUZAPI Real Data Structures
export interface WuzapiChatwootConfig {
  enabled: boolean;
  webhook_url: string;
}

export interface WuzapiProxyConfig {
  enabled: boolean;
  proxy_url: string;
}

export interface WuzapiS3Config {
  access_key: string;
  bucket: string;
  enabled: boolean;
  endpoint: string;
  media_delivery: string;
  path_style: boolean;
  public_url: string;
  region: string;
  retention_days: number;
}

export interface WuzapiUser {
  id: string;
  name: string;
  token: string;
  connected: boolean;
  loggedIn: boolean;
  jid: string;
  chatwoot_config: WuzapiChatwootConfig;
  proxy_config: WuzapiProxyConfig;
  s3_config: WuzapiS3Config;
  events: any[];
  expiration: number;
  folder_id: string | null;
  proxy_url: string;
  qrcode: string;
  webhooks: any[];
}

export interface WuzapiUsersResponse {
  code: number;
  data: WuzapiUser[];
}

// Evolution API Types
export type ConnectionStatus = 'open' | 'close' | 'connecting' | 'disconnected';

export interface EvolutionChatwootConfig {
  id: string;
  enabled: boolean;
  accountId: string;
  token: string;
  url: string;
  nameInbox: string;
  signMsg: boolean;
  signDelimiter: string | null;
  number: string | null;
  reopenConversation: boolean;
  conversationPending: boolean;
  mergeBrazilContacts: boolean;
  importContacts: boolean;
  importMessages: boolean;
  daysLimitImportMessages: number;
  organization: string;
  logo: string;
  ignoreJids: string[];
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

export interface EvolutionSetting {
  id: string;
  rejectCall: boolean;
  msgCall: string;
  groupsIgnore: boolean;
  alwaysOnline: boolean;
  readMessages: boolean;
  readStatus: boolean;
  syncFullHistory: boolean;
  wavoipToken: string;
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

export interface EvolutionInstanceCount {
  Message: number;
  Contact: number;
  Chat: number;
}

export interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: ConnectionStatus;
  ownerJid: string;
  profileName: string;
  profilePicUrl: string;
  integration: string;
  number: string | null;
  businessId: string | null;
  token: string;
  clientName: string;
  disconnectionReasonCode?: number;
  disconnectionObject?: string;
  disconnectionAt?: string;
  createdAt: string;
  updatedAt: string;
  Chatwoot: EvolutionChatwootConfig;
  Proxy: any | null;
  Rabbitmq: any | null;
  Nats: any | null;
  Sqs: any | null;
  Websocket: any | null;
  Setting: EvolutionSetting;
  _count: EvolutionInstanceCount;
}