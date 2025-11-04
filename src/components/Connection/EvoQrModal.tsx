import { useEffect, useMemo, useState } from 'react';
import { Server, EvolutionInstance } from '../../types';

interface EvoQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: Server;
  instance: EvolutionInstance;
}

type LogType = 'info' | 'success' | 'warning' | 'error';

export function EvoQrModal({ isOpen, onClose, server, instance }: EvoQrModalProps) {
  const [loading, setLoading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ msg: string; type: LogType }[]>([]);

  const phoneCandidate = useMemo(() => {
    // Replicar a lógica do HTML para tentar extrair o número
    if (instance.number && instance.number.trim()) {
      const n = instance.number.replace(/[^\d]/g, '');
      return n ? `+${n}` : '';
    }
    if (instance.ownerJid) {
      const m = instance.ownerJid.match(/(\d+)@/);
      if (m && m[1]) return `+${m[1]}`;
    }
    if (instance.name) {
      const m = instance.name.match(/(\d{10,15})/);
      if (m && m[1]) return `+${m[1]}`;
    }
    return '';
  }, [instance]);

  const log = (msg: string, type: LogType = 'info') => {
    setLogs((prev) => [...prev, { msg, type }]);
  };

  const normalizeBaseUrl = (url: string) => {
    let base = (url || '').trim();
    if (!base.endsWith('/')) base += '/';
    return base;
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
      log(`📋 Instância: ${instance.name}`, 'info');

      const base = normalizeBaseUrl(server.url);
      const endpoint = `instance/connect/${encodeURIComponent(instance.name)}`;

      let phoneToUse = '';
      if (phoneCandidate) {
        log(`📞 Usando número do display: ${phoneCandidate}`, 'info');
        phoneToUse = phoneCandidate;
      } else {
        log('⚠️ Número não identificado, tentando sem parâmetro', 'warning');
      }

      const numberParam = phoneToUse ? `?number=${encodeURIComponent(phoneToUse)}` : '';
      const connectUrl = `${base}${endpoint}${numberParam}`;
      log(`🔗 URL final: ${connectUrl}`, 'info');

      const response = await fetch(connectUrl, {
        method: 'GET',
        mode: 'cors',
        headers: {
          'apikey': server.apiKey,
          'Accept': 'application/json, text/plain, */*',
        },
      });
      log(`✅ Resposta: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'warning');

      const text = await response.text();
      log(`📄 Dados recebidos (${text.length} caracteres)`, 'success');

      let data: any = null;
      try {
        data = JSON.parse(text);
        log('✅ JSON processado com sucesso', 'success');
      } catch (e: any) {
        log('❌ Erro ao processar JSON: ' + e.message, 'error');
        throw new Error('Resposta inválida do servidor');
      }

      let imgSrc: string | null = null;
      if (data && typeof data.base64 === 'string') {
        log('🖼️ Usando campo "base64"', 'info');
        imgSrc = data.base64.startsWith('data:image') ? data.base64 : `data:image/png;base64,${data.base64}`;
      } else if (data && typeof data.code === 'string') {
        log('🖼️ Usando campo "code" como base64', 'warning');
        imgSrc = data.code.startsWith('data:image') ? data.code : `data:image/png;base64,${data.code}`;
      } else {
        log('❌ Nenhum campo de imagem encontrado', 'error');
        throw new Error('Resposta sem imagem do QR');
      }

      log('🎨 Carregando imagem do QR Code...', 'info');
      setImageSrc(imgSrc);
      log('✅ QR Code carregado com sucesso!', 'success');
      log('📱 Escaneie o QR Code com seu WhatsApp', 'success');
    } catch (err: any) {
      log('❌ ' + (err?.message || 'Falha ao gerar QR Code'), 'error');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 modal-backdrop flex items-center justify-center z-50 p-4" onClick={closeModal}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full qr-code-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="text-2xl mr-3">💬</div>
              <div>
                <h2 className="text-xl font-bold">Conectar WhatsApp</h2>
                <p className="text-green-100 text-sm">{instance.name}</p>
              </div>
            </div>
            <button onClick={closeModal} className="text-white hover:text-gray-200 transition">✕</button>
          </div>
        </div>

        <div className="p-6">
          <div className="text-center mb-6">
            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl p-6 min-h-[280px] flex items-center justify-center">
              {!imageSrc && !loading && (
                <div className="text-gray-500">
                  <div className="text-4xl mb-3">▦</div>
                  <p>Clique em "Gerar QR Code" para começar</p>
                </div>
              )}
              {imageSrc && (
                <img src={imageSrc} alt="QR Code WhatsApp" className="max-w-[240px] max-h-[240px] rounded-lg shadow-lg" />
              )}
              {loading && (
                <div className="flex-col items-center">
                  <div className="loading-spinner mb-4" />
                  <p className="text-gray-600">Gerando QR Code...</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex space-x-3">
            <button onClick={generateQRCode} disabled={loading} className="flex-1 bg-green-500 hover:bg-green-600 disabled:opacity-50 text-white px-4 py-3 rounded-lg font-medium transition flex items-center justify-center">
              <span className="mr-2">🧾</span>
              Gerar QR Code
            </button>
            <button onClick={closeModal} className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-3 rounded-lg font-medium transition">
              Fechar
            </button>
          </div>

          <div className={`mt-4 bg-gray-900 text-gray-100 rounded-lg p-4 font-mono text-sm max-h-32 overflow-y-auto ${logs.length === 0 ? 'hidden' : ''}`}>
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