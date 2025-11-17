import { useEffect, useMemo, useState } from 'react';
import { Server, WuzapiUser } from '../../types';
import { wuzApiService } from '../../services/wuzApi';
import { createQrLinkForWuz } from '../../services/linkService';

interface WuQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
  user: WuzapiUser;
  showIcons?: boolean;
  showCopyLink?: boolean;
}

type LogType = 'info' | 'success' | 'warning' | 'error';

export function WuQrModal({ isOpen, onClose, server, user, showIcons = true, showCopyLink = true }: WuQrModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ msg: string; type: LogType }[]>([]);

  const phoneCandidate = useMemo(() => {
    // Tentativa simples de extrair número do JID, se existir
    if (user.jid) {
      const m = user.jid.match(/(\d+)@/);
      if (m && m[1]) return `+${m[1]}`;
    }
    if (user.name) {
      const m = user.name.match(/(\d{10,15})/);
      if (m && m[1]) return `+${m[1]}`;
    }
    return '';
  }, [user]);

  const log = (msg: string, type: LogType = 'info') => {
    setLogs((prev) => [...prev, { msg, type }]);
  };

  const clearState = () => {
    setLoading(false);
    setImageSrc(null);
    setLogs([]);
  };

  const closeModal = () => {
    clearState();
    onClose();
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      setImageSrc(null);
      setLogs([]);
      log('🚀 Iniciando geração do QR Code...', 'info');
      log(`📡 Conectando ao servidor: ${server.name}`, 'info');
      log(`👤 Usuário: ${user.name}`, 'info');
      // Buscar QR via backend para evitar CORS e suportar chave `qr`
      const base64 = await wuzApiService.getQRCodeBackend(server.id, user.token);
      log('📄 QR recebido da API', 'success');

      const isDataImage = typeof base64 === 'string' && base64.startsWith('data:image');
      const imgSrc = isDataImage ? base64 : `data:image/png;base64,${base64}`;
      setImageSrc(imgSrc);
      log('✅ QR Code carregado com sucesso!', 'success');
      log('📱 Escaneie o QR Code com seu WhatsApp', 'success');
    } catch (err: any) {
      log('❌ ' + (err?.message || 'Falha ao gerar QR Code'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const connectUser = async () => {
    try {
      setLoading(true);
      setImageSrc(null);
      setLogs([]);
      log('🔌 Iniciando conexão da instância...', 'info');
      log(`📡 Servidor: ${server.name}`, 'info');
      log(`👤 Usuário: ${user.name}`, 'info');
      // Usar backend proxy para evitar CORS
      await wuzApiService.connectSessionBackend(server.id, user.token, { Subscribe: ['Message', 'ChatPresence'], Immediate: true });
      log('✅ Conexão solicitada com sucesso', 'success');
      log('ℹ️ Caso não apareça, tente gerar o QR novamente', 'info');
    } catch (err: any) {
      log('❌ ' + (err?.message || 'Falha ao conectar instância'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const copyTempLink = async () => {
    try {
      setLoading(true);
      log('🔗 Gerando link temporário (expira em 5 min)...', 'info');
      const res = await createQrLinkForWuz(server.id, user.token);
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      const fullUrl = `${origin}${res.path}`;
      await navigator.clipboard.writeText(fullUrl);
      log('✅ Link temporário copiado para a área de transferência', 'success');
      log(`🕒 Validade: ${Math.round(res.expiresInSeconds/60)} minuto(s)`, 'info');
    } catch (err: any) {
      log('❌ Falha ao gerar/copiar link temporário', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4 overflow-y-auto" onClick={closeModal}>
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] sm:w-full max-w-lg qr-code-modal max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💬</div>
              <div>
                <h2 className="text-xl font-bold">Conectar WhatsApp (WU)</h2>
                <p className="text-green-100 text-sm">{user.name}</p>
              </div>
            </div>
            <button onClick={closeModal} className="text-white hover:text-gray-200 transition">✕</button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="text-center mb-6">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-4 sm:p-6 min-h-[220px] sm:min-h-[280px] flex items-center justify-center">
              {!imageSrc && !loading && (
                <div className="text-gray-500">
                  <div className="text-4xl mb-3">▦</div>
                  <p>Clique em "Gerar QR Code" para começar</p>
                </div>
              )}
              {imageSrc && (
                <img src={imageSrc} alt="QR Code WhatsApp" className="max-w-[70vw] sm:max-w-[240px] max-h-[70vw] sm:max-h-[240px] rounded-lg shadow-lg" />
              )}
              {loading && (
                <div className="flex-col items-center">
                  <div className="loading-spinner mb-4" />
                  <p className="text-gray-600">Gerando QR Code...</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={connectUser} disabled={loading} className="w-full sm:w-auto bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center">
              {showIcons && <span className="mr-2">🔌</span>}
              Conectar
            </button>
            {showCopyLink && (
              <button onClick={copyTempLink} disabled={loading} className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center">
                {showIcons && <span className="mr-2">🔗</span>}
                Copiar Link (5 min)
              </button>
            )}
            <button onClick={generateQRCode} disabled={loading} className="w-full sm:flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center">
              {showIcons && <span className="mr-2">🧾</span>}
              Gerar QR Code
            </button>
            <button onClick={closeModal} className="w-full sm:w-auto bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition">
              Fechar
            </button>
          </div>
          <div className={`mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-40 sm:max-h-32 overflow-y-auto ${logs.length === 0 ? 'hidden' : ''}`}>
            {logs.map((l, idx) => (
              <div key={idx} className={l.type === 'error' ? 'text-red-400' : l.type === 'warning' ? 'text-yellow-300' : l.type === 'success' ? 'text-green-300' : 'text-gray-200'}>
                {l.msg}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}