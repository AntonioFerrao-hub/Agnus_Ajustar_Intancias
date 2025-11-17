import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveQrLink } from '../services/linkService';
import { getServers } from '../api';
import { Server, WuzapiUser, EvolutionInstance } from '../types';
import { WuQrModal } from '../components/Connection/WuQrModal';
import { EvoQrModal } from '../components/Connection/EvoQrModal';

export default function PublicQR() {
  const location = useLocation();
  const tokenParam = new URLSearchParams(location.search).get('token');
  const [status, setStatus] = useState<'idle'|'loading'|'error'|'ready'|'closed'>('idle');
  const [message, setMessage] = useState<string>('');
  const [server, setServer] = useState<Server | null>(null);
  const [type, setType] = useState<'wuz'|'evolution'|null>(null);
  const [user, setUser] = useState<WuzapiUser | null>(null);
  const [instance, setInstance] = useState<EvolutionInstance | null>(null);

  useEffect(() => {
    const token = tokenParam;
    if (!token) {
      setStatus('error');
      setMessage('Token não informado');
      return;
    }
    setStatus('loading');
    (async () => {
      try {
        // Primeiro apenas resolve o token para descobrir tipo e server
        const res = await resolveQrLink(token, false);
        if (!res?.valid) {
          setStatus('error');
          setMessage('Link inválido');
          return;
        }
        const payload = res.payload as any;
        const srvId = payload.serverId as string;
        const rawType = payload.type as string | undefined;
        const kind = (rawType === 'wuzapi' ? 'wuz' : rawType) as 'wuz'|'evolution'|null;
        if (!srvId || !kind) {
          setStatus('error');
          setMessage('Link incompleto: servidor ou tipo ausente');
          return;
        }
        const servers = await getServers();
        const srv = servers.find((s) => s.id === srvId) || null;
        if (!srv) {
          setStatus('error');
          setMessage('Servidor não encontrado para este link');
          return;
        }
        setServer(srv);
        setType(kind);
        if (kind === 'wuz') {
          const minimal: Partial<WuzapiUser> = {
            name: payload.name || payload.token || 'Usuário WU',
            token: payload.token,
            jid: payload.jid || '',
            connected: false,
            loggedIn: false,
          };
          // Força tipo para evitar exigência de todas as props
          setUser(minimal as WuzapiUser);
        } else if (kind === 'evolution') {
          const minimal: Partial<EvolutionInstance> = {
            name: payload.instanceName,
            ownerJid: '',
            profileName: payload.name || payload.instanceName,
            profilePicUrl: '',
            integration: 'WHATSAPP-BAILEYS',
            number: null,
            token: '',
            clientName: 'QR Link',
            connectionStatus: 'disconnected',
          };
          setInstance(minimal as EvolutionInstance);
        }
        setStatus('ready');
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao validar link';
        setMessage(msg.includes('expirado') ? 'Link expirado (5 min).' : msg);
        setStatus('error');
      }
    })();
  }, [tokenParam]);

  const onClose = () => setStatus('closed');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      {status === 'loading' && (
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900 mb-4">Abrindo modal de QR...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto" />
        </div>
      )}
      {status === 'ready' && server && type === 'wuz' && user && (
        <WuQrModal isOpen={true} onClose={onClose} server={server} user={user} showIcons={false} showCopyLink={false} />
      )}
      {status === 'ready' && server && type === 'evolution' && instance && (
        <EvoQrModal isOpen={true} onClose={onClose} server={server} instance={instance} showIcons={false} showCopyLink={false} />
      )}
      {status === 'error' && (
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-red-600 text-2xl">×</span>
          </div>
          <p className="text-red-600">{message}</p>
          <p className="text-gray-600 mt-2">Se o link expirou, solicite um novo.</p>
        </div>
      )}
      {status === 'closed' && (
        <div className="bg-white rounded-lg shadow p-6 w-full max-w-md text-center">
          <h1 className="text-xl font-semibold text-gray-900">Modal fechado</h1>
          <p className="text-gray-600 mt-2">Você pode fechar esta aba agora.</p>
        </div>
      )}
    </div>
  );
}