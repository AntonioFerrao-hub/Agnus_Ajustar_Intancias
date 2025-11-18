import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const brandLogo = 'https://webferraogroup.com.br/logos/cenexazap.png';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string>((import.meta.env.VITE_APP_VERSION as string) || 'dev');

  useEffect(() => {
    // Busca versão do backend em tempo de execução
    fetch('/api/version')
      .then((res) => res.json())
      .then((data) => {
        if (data?.version) setVersion(data.version);
      })
      .catch(() => {
        // mantém fallback
      });
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      await authService.login(email.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Erro ao efetuar login';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-xl ring-1 ring-gray-200 p-8" data-version={version}>
          <div className="flex items-center gap-3 mb-6">
            <img src={brandLogo} alt="CenexaZap" className="h-10 w-auto" loading="lazy" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Entrar</h2>
              <p className="text-sm text-gray-500">Acesse o sistema</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded">
              {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="voce@exemplo.com"
                required
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg shadow hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <div className="text-xs text-gray-400">{version}</div>
            <div className="text-xs text-gray-400">© {new Date().getFullYear()}</div>
          </div>
        </div>
      </div>
    </div>
  );
}