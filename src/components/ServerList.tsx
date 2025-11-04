import { useEffect, useState } from 'react';
import { useServerStore } from '../store/useServerStore';
import ServerForm from './ServerForm';
import { Server } from '../types';

export default function ServerList() {
  const { servers, fetchServers, deleteServer } = useServerStore();
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  const handleEdit = (server: Server) => {
    setEditingServer(server);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Tem certeza que deseja remover este servidor?')) {
      deleteServer(id);
    }
  };

  const handleCloseForm = () => {
    setEditingServer(null);
    setIsFormOpen(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={() => setIsFormOpen(true)} className="w-full sm:w-auto bg-blue-500 text-white px-4 py-2 rounded-md">Adicionar Servidor</button>
      {isFormOpen && <ServerForm server={editingServer} onClose={handleCloseForm} />}
      <div className="divide-y divide-gray-200">
        {servers.map((server) => (
          <div key={server.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h3 className="font-bold">{server.name}</h3>
              <p className="text-sm text-gray-500">{server.url}</p>
            </div>
            <div className="flex items-center space-x-2">
              <button onClick={() => handleEdit(server)} className="text-blue-500 hover:text-blue-700">Editar</button>
              <button onClick={() => handleDelete(server.id)} className="text-red-500 hover:text-red-700">Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}