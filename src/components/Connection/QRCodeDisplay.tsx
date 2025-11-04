import { useEffect, useState } from 'react';
import { RefreshCw, Smartphone, Wifi } from 'lucide-react';

interface QRCodeDisplayProps {
  qrCode?: string;
  isLoading?: boolean;
  onRefresh?: () => void;
  connectionStatus?: 'connecting' | 'connected' | 'disconnected';
}

export function QRCodeDisplay({ 
  qrCode, 
  isLoading = false, 
  onRefresh,
  connectionStatus = 'disconnected' 
}: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    if (qrCode && connectionStatus === 'connecting') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            onRefresh?.();
            return 60;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [qrCode, connectionStatus, onRefresh]);

  if (connectionStatus === 'connected') {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Wifi className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Conectado com Sucesso!</h3>
          <p className="text-gray-600">Sua conexão WhatsApp está ativa e funcionando.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="text-center">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Conectar WhatsApp</h3>
          {qrCode && (
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
            <p className="text-gray-600">Gerando QR Code...</p>
          </div>
        ) : qrCode ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-white border-2 border-gray-200 rounded-lg p-4">
              <img 
                src={qrCode} 
                alt="QR Code WhatsApp" 
                className="w-full h-full object-contain"
              />
            </div>
            
            <div className="text-center space-y-2">
              <p className="text-gray-600">
                Escaneie o QR Code com seu WhatsApp
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <span>Expira em:</span>
                <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </span>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
              <div className="flex items-start space-x-3">
                <Smartphone className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Como conectar:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Abra o WhatsApp no seu celular</li>
                    <li>Toque em Menu (⋮) &gt; Dispositivos conectados</li>
                    <li>Toque em "Conectar um dispositivo"</li>
                    <li>Aponte a câmera para este QR code</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="w-64 h-64 bg-gray-100 rounded-lg flex items-center justify-center">
              <Smartphone className="h-16 w-16 text-gray-400" />
            </div>
            <p className="text-gray-600">Clique em "Gerar QR Code" para começar</p>
          </div>
        )}
      </div>
    </div>
  );
}