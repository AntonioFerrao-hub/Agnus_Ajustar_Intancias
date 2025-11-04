import { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, 
  UserPlus, 
  Trash2, 
  Edit3, 
  Search,
  Shield,
  User,
  Mail,
  Calendar
} from 'lucide-react';
import { useConnectionStore } from '../store/useConnectionStore';
import { authService } from '../services/authService';

interface User {
  id: string;
  name: string;
  email?: string;
  role: 'admin' | 'user';
  permissions?: string[] | null;
  createdAt: string;
  lastActive?: string;
  status: 'active' | 'inactive';
}

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editPasswordConfirm, setEditPasswordConfirm] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [permUser, setPermUser] = useState<User | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const { addLog } = useConnectionStore();
  const currentUser = authService.getUser();
  const isAdmin = currentUser?.role === 'admin';

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'user' as 'admin' | 'user',
    password: '',
    passwordConfirm: ''
  });
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers() {
    try {
      const { userService } = await import('../services/userService');
      const data = await userService.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Erro ao carregar usuários', e);
      setUsers([]);
    } finally {
      setIsLoading(false);
    }
  }

  const filteredUsers = Array.isArray(users)
    ? users.filter(user =>
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800';
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800';
  };

  const MENU_OPTIONS: { key: string; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'connections', label: 'Conexões' },
    { key: 'users', label: 'Usuários' },
    { key: 'webhooks', label: 'Webhooks' },
    { key: 'logs', label: 'Logs' },
    { key: 'monitoring', label: 'Monitoramento' },
    { key: 'settings', label: 'Configurações' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
          <p className="text-gray-600">Gerencie usuários e suas permissões no sistema</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <UserPlus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UsersIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total de Usuários</p>
              <p className="text-2xl font-bold text-gray-900">{users.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Shield className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Administradores</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.role === 'admin').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <User className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Usuários Ativos</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => u.status === 'active').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Novos (30 dias)</p>
              <p className="text-2xl font-bold text-gray-900">
                {users.filter(u => {
                  const thirtyDaysAgo = new Date();
                  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                  return new Date(u.createdAt) > thirtyDaysAgo;
                }).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Usuários ({filteredUsers.length})
          </h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-4">Carregando usuários...</p>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuário
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Função
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Criado em
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <User className="h-5 w-5 text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{user.name}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                        {user.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user.status)}`}>
                        {user.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {isAdmin && (
                          <button
                            onClick={() => {
                              setPermUser(user);
                              setSelectedPerms(Array.isArray(user.permissions) ? user.permissions : []);
                            }}
                            className="text-purple-600 hover:text-purple-900"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Deseja excluir este usuário?')) return;
                            try {
                              const { userService } = await import('../services/userService');
                              await userService.deleteUser(user.id);
                              await loadUsers();
                            } catch (e) {
                              console.error('Erro ao excluir usuário', e);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <UsersIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum usuário encontrado</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Tente ajustar os filtros de busca.' : 'Crie seu primeiro usuário para começar.'}
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Criar Novo Usuário</h3>
            
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setFormError(null);
                if (formData.password !== formData.passwordConfirm) {
                  setFormError('Senha e confirmação não coincidem');
                  return;
                }
                try {
                  const { userService } = await import('../services/userService');
                  await userService.createUser({
                    name: formData.name,
                    email: formData.email,
                    role: formData.role,
                    password: formData.password,
                    passwordConfirm: formData.passwordConfirm,
                  });
                  setShowCreateForm(false);
                  setFormData({ name: '', email: '', role: 'user', password: '', passwordConfirm: '' });
                  await loadUsers();
                } catch (err) {
                  console.error('Erro ao criar usuário', err);
                  setFormError((err as any)?.response?.data?.error || 'Erro ao criar usuário');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nome
                </label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="passwordConfirm" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Senha
                </label>
                <input
                  type="password"
                  id="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={(e) => setFormData(prev => ({ ...prev, passwordConfirm: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {formError && (
                <div className="text-sm text-red-600">{formError}</div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                <input
                  type="password"
                  id="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Função
                </label>
                <select
                  id="role"
                  value={formData.role}
                  onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as 'admin' | 'user' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setFormData({ name: '', email: '', role: 'user', password: '', passwordConfirm: '' });
                    setFormError(null);
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={!formData.password || !formData.passwordConfirm || formData.password !== formData.passwordConfirm}
                >
                  Criar Usuário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Usuário</h3>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setEditError(null);
                if (editPassword || editPasswordConfirm) {
                  if (editPassword !== editPasswordConfirm) {
                    setEditError('Senha e confirmação não coincidem');
                    return;
                  }
                }
                try {
                  const { userService } = await import('../services/userService');
                  await userService.updateUser(editingUser.id, {
                    name: editingUser.name,
                    email: editingUser.email || '',
                    role: editingUser.role,
                    ...(editPassword ? { password: editPassword, passwordConfirm: editPasswordConfirm } : {}),
                  });
                  setEditingUser(null);
                  setEditPassword('');
                  setEditPasswordConfirm('');
                  await loadUsers();
                } catch (err) {
                  console.error('Erro ao atualizar usuário', err);
                  setEditError((err as any)?.response?.data?.error || 'Erro ao atualizar usuário');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser!, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email || ''}
                  onChange={(e) => setEditingUser({ ...editingUser!, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Função</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser!, role: e.target.value as 'admin' | 'user' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nova Senha (opcional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar Nova Senha</label>
                <input
                  type="password"
                  value={editPasswordConfirm}
                  onChange={(e) => setEditPasswordConfirm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {editError && (
                <div className="text-sm text-red-600">{editError}</div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setEditingUser(null); setEditPassword(''); setEditPasswordConfirm(''); setEditError(null); }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
                  disabled={(editPassword || editPasswordConfirm) && editPassword !== editPasswordConfirm}
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {permUser && isAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Permissões de Menu</h3>
            <p className="text-sm text-gray-600 mb-2">Usuário: <span className="font-medium">{permUser.name}</span></p>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const { userService } = await import('../services/userService');
                  await userService.updateUser(permUser.id, { permissions: selectedPerms });
                  setPermUser(null);
                  setSelectedPerms([]);
                  await loadUsers();
                } catch (err) {
                  console.error('Erro ao atualizar permissões', err);
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                {MENU_OPTIONS.map((opt) => {
                  const checked = selectedPerms.includes(opt.key);
                  return (
                    <label key={opt.key} className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-blue-600"
                        checked={checked}
                        onChange={(e) => {
                          setSelectedPerms((prev) => {
                            const set = new Set(prev);
                            if (e.target.checked) set.add(opt.key); else set.delete(opt.key);
                            return Array.from(set);
                          });
                        }}
                      />
                      <span className="text-sm text-gray-700">{opt.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setPermUser(null); setSelectedPerms([]); }}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}