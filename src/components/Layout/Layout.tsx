import { Outlet, useLocation } from 'react-router-dom';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

const pageTitle: Record<string, string> = {
  '/': 'Dashboard',
  '/connections': 'Gerenciar Conexões',
  '/users': 'Gerenciar Usuários',
  '/webhooks': 'Configurar Webhooks',
  '/logs': 'Logs do Sistema',
  '/monitoring': 'Monitoramento',
  '/settings': 'Configurações',
};

export function Layout() {
  const location = useLocation();
  const title = pageTitle[location.pathname] || 'WhatsApp Manager';

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 w-full overflow-y-auto overflow-x-hidden p-2 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}