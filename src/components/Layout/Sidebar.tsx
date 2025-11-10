import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Smartphone, 
  Users, 
  Webhook, 
  FileText, 
  Settings,
  Activity,
  User as UserIcon,
  LogOut
} from 'lucide-react';
import clsx from 'clsx';
import { authService } from '../../services/authService';

const navigation = [
  { key: 'dashboard', name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { key: 'connections', name: 'Conexões', href: '/connections', icon: Smartphone },
  { key: 'users', name: 'Usuários', href: '/users', icon: Users },
  { key: 'webhooks', name: 'Webhooks', href: '/webhooks', icon: Webhook },
  { key: 'logs', name: 'Logs', href: '/logs', icon: FileText },
  { key: 'monitoring', name: 'Monitoramento', href: '/monitoring', icon: Activity },
  { key: 'settings', name: 'Configurações', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const navigate = useNavigate();
  const currentUser = authService.getUser();
  const initials = (currentUser?.name || currentUser?.email || 'U')
    .trim()
    .charAt(0)
    .toUpperCase();

  const handleLogout = () => {
    authService.logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex flex-col w-64 bg-gray-900">
      <div className="flex items-center justify-center h-16 px-4 bg-gray-800">
        <h2 className="text-lg font-semibold text-white">WhatsApp Manager</h2>
      </div>
      
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation
          .filter((item) => {
            if (!currentUser) return false;
            if (currentUser.role === 'admin') return true;
            const perms = currentUser.permissions || null;
            if (!perms || !Array.isArray(perms) || perms.length === 0) {
              // Default allow all if no explicit permissions set
              return true;
            }
            return perms.includes(item.key);
          })
          .map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              clsx(
                'flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                isActive
                  ? 'bg-green-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
          </NavLink>
        ))}
      </nav>
      
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-white">{initials}</span>
            </div>
            <div>
              <p className="text-sm font-medium text-white">{currentUser?.name || 'Usuário'}</p>
              <p className="text-xs text-gray-400">{currentUser?.role === 'admin' ? 'Administrador' : 'Usuário'}</p>
            </div>
          </div>
          <button
            className="p-2 text-gray-400 hover:text-gray-200 transition-colors"
            onClick={handleLogout}
            title="Sair"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}