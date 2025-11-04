import { create } from 'zustand';
import { Server, ServerFormData } from '../types';
import * as api from '../api';

interface ServerState {
  servers: Server[];
  loading: boolean;
  error: string | null;
  fetchServers: () => Promise<void>;
  addServer: (serverData: ServerFormData) => Promise<void>;
  updateServer: (id: string, serverData: ServerFormData) => Promise<void>;
  deleteServer: (id: string) => Promise<void>;
  setDefaultServer: (id: string) => void;
  toggleServerActive: (id: string) => void;
  updateServerStatus: (id: string, status: Server['status'], lastTested?: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useServerStore = create<ServerState>((set, get) => ({
  servers: [],
  loading: false,
  error: null,

  fetchServers: async () => {
    set({ loading: true, error: null });
    try {
      const servers = await api.getServers();
      set({ servers, loading: false });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch servers';
      set({ error: errorMessage, loading: false });
    }
  },

  addServer: async (serverData) => {
    try {
      const newServer = await api.addServer(serverData);
      set((state) => ({
        servers: [...state.servers, newServer],
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add server';
      set({ error: errorMessage });
      throw error;
    }
  },

  updateServer: async (id, serverData) => {
    try {
      const updatedServer = await api.updateServer(id, serverData);
      set((state) => ({
        servers: state.servers.map((server) =>
          server.id === id ? updatedServer : server
        ),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update server';
      set({ error: errorMessage });
      throw error;
    }
  },

  deleteServer: async (id) => {
    try {
      await api.deleteServer(id);
      set((state) => ({
        servers: state.servers.filter((server) => server.id !== id),
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete server';
      set({ error: errorMessage });
      throw error;
    }
  },

  setDefaultServer: (id) => {
    set((state) => ({
      servers: state.servers.map((server) => ({
        ...server,
        isDefault: server.id === id,
      })),
    }));
  },

  toggleServerActive: (id) => {
    set((state) => ({
      servers: state.servers.map((server) =>
        server.id === id ? { ...server, isActive: !server.isActive } : server
      ),
    }));
  },

  updateServerStatus: (id, status, lastTested) => {
    set((state) => ({
      servers: state.servers.map((server) =>
        server.id === id ? { ...server, status, lastTested } : server
      ),
    }));
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
}));