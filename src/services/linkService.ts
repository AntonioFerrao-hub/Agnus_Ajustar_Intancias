import api from '../api';

export type QrLinkPayload = {
  kind: 'qr';
  via: 'connection' | 'direct';
  type?: 'wuz' | 'evolution';
  connectionId?: string;
  serverId?: string;
  token?: string;
  instanceName?: string;
  name?: string;
};

export async function createQrLinkFromConnection(connectionId: string) {
  const res = await api.post('/links/qr', { connectionId });
  return res.data as { path: string; token: string; expiresInSeconds: number };
}

export async function createQrLinkForWuz(serverId: string, token: string) {
  const res = await api.post('/links/qr', { type: 'wuz', serverId, token });
  return res.data as { path: string; token: string; expiresInSeconds: number };
}

export async function createQrLinkForEvolution(serverId: string, instanceName: string) {
  const res = await api.post('/links/qr', { type: 'evolution', serverId, instanceName });
  return res.data as { path: string; token: string; expiresInSeconds: number };
}

export async function resolveQrLink(token: string, includeQr = true) {
  const res = await api.post('/links/qr/resolve', { token, includeQr });
  return res.data as { valid: boolean; payload: QrLinkPayload; qrCode?: string };
}