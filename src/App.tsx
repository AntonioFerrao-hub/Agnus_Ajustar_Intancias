import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout/Layout';
import { Dashboard } from './pages/Dashboard';
import Connections from './pages/Connections';
import { Users } from './pages/Users';
import { Webhooks } from './pages/Webhooks';
import { Logs } from './pages/Logs';
import { Monitoring } from './pages/Monitoring';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import Unauthorized from './pages/Unauthorized';
import { authService } from './services/authService';
import PublicQR from './pages/PublicQR';

function RequireAuth({ children }: { children: JSX.Element }) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function RequirePermission({ perm, children }: { perm: string; children: JSX.Element }) {
  const user = authService.getUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'admin') return children;
  const perms = user.permissions || null;
  if (!perms || !Array.isArray(perms) || perms.length === 0) {
    // Default allow if no explicit permissions set
    return children;
  }
  if (perms.includes(perm)) return children;
  // Redireciona para página segura sem loop
  return <Navigate to="/unauthorized" replace />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        {/* Rota pública para link temporário de QR */}
        <Route path="/qr" element={<PublicQR />} />
        <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}> 
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<RequirePermission perm="dashboard"><Dashboard /></RequirePermission>} />
          <Route path="connections" element={<RequirePermission perm="connections"><Connections /></RequirePermission>} />
          <Route path="users" element={<RequirePermission perm="users"><Users /></RequirePermission>} />
          <Route path="webhooks" element={<RequirePermission perm="webhooks"><Webhooks /></RequirePermission>} />
          <Route path="logs" element={<RequirePermission perm="logs"><Logs /></RequirePermission>} />
          <Route path="monitoring" element={<RequirePermission perm="monitoring"><Monitoring /></RequirePermission>} />
          <Route path="settings" element={<RequirePermission perm="settings"><Settings /></RequirePermission>} />
          <Route path="unauthorized" element={<Unauthorized />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
