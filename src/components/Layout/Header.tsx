import { Bell, User, Settings, LogOut } from 'lucide-react';
import { authService } from '../../services/authService';
import { userService } from '../../services/userService';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

const brandLogo = 'https://webferraogroup.com.br/logos/cenexazap.png';

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const [showProfile, setShowProfile] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name || '');
  const [profileEmail, setProfileEmail] = useState(currentUser?.email || '');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const canAccess = (perm: string) => {
    if (!currentUser) return false;
    if (currentUser.role === 'admin') return true;
    const perms = currentUser.permissions || null;
    if (!perms || !Array.isArray(perms) || perms.length === 0) return true;
    return perms.includes(perm);
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };
  return (
    <header className="bg-white border-b border-gray-200 px-3 sm:px-4 md:px-6 py-3 sm:py-4">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center space-x-3 sm:space-x-4">
          <div className="flex items-center space-x-3">
            <img src={brandLogo} alt="Conexão Zap" className="h-8 w-auto" loading="lazy" />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Conexão Zap</h1>
          </div>
        </div>
        
        <div className="flex items-center space-x-3 sm:space-x-4">
          <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>
          
          {canAccess('settings') && (
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </button>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors" onClick={handleLogout} title="Sair">
            <LogOut className="h-5 w-5" />
          </button>
          
          <button
            className="flex items-center space-x-2 group"
            onClick={() => {
              setProfileName(currentUser?.name || '');
              setProfileEmail(currentUser?.email || '');
              setShowProfile(true);
              setProfileMsg(null);
              setProfileError(null);
            }}
            title="Meu Perfil"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center group-hover:bg-green-700 transition-colors">
              <User className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">{currentUser?.name || 'Usuário'}</span>
          </button>
        </div>
      </div>

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Meu Perfil</h3>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setProfileMsg(null);
                setProfileError(null);
                try {
                  if (!currentUser) throw new Error('Usuário não autenticado');
                  const updated = await userService.updateUser(currentUser.id, {
                    name: profileName,
                    email: profileEmail,
                  });
                  try { localStorage.setItem('auth_user', JSON.stringify(updated)); } catch {}
                  setProfileMsg('Perfil atualizado com sucesso');
                } catch (err: any) {
                  const msg = err?.response?.data?.error || 'Erro ao atualizar perfil';
                  setProfileError(msg);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profileEmail}
                  onChange={(e) => setProfileEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {profileError && <div className="text-sm text-red-600">{profileError}</div>}
              {profileMsg && <div className="text-sm text-green-600">{profileMsg}</div>}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowProfile(false); setProfileMsg(null); setProfileError(null); }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>

            <div className="mt-6 border-t pt-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-2">Alterar Senha</h4>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setPasswordMsg(null);
                  setProfileError(null);
                  if (newPassword !== newPasswordConfirm) {
                    setProfileError('Senha e confirmação não coincidem');
                    return;
                  }
                  try {
                    await authService.changePassword(currentPassword, newPassword);
                    setPasswordMsg('Senha alterada com sucesso');
                    setCurrentPassword('');
                    setNewPassword('');
                    setNewPasswordConfirm('');
                  } catch (err: any) {
                    const msg = err?.response?.data?.error || 'Erro ao alterar senha';
                    setProfileError(msg);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Senha Atual</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                  <input
                    type="password"
                    value={newPasswordConfirm}
                    onChange={(e) => setNewPasswordConfirm(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {passwordMsg && <div className="text-sm text-green-600">{passwordMsg}</div>}

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-green-300"
                    disabled={!currentPassword || !newPassword || newPassword !== newPasswordConfirm}
                  >
                    Alterar Senha
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}