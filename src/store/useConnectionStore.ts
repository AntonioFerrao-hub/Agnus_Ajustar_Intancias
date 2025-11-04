import { create } from 'zustand';
import { Connection, LogEntry } from '../types';

interface ConnectionStore {
  connections: Connection[];
  selectedConnection: Connection | null;
  logs: LogEntry[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setConnections: (connections: Connection[]) => void;
  addConnection: (connection: Connection) => void;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  removeConnection: (id: string) => void;
  setSelectedConnection: (connection: Connection | null) => void;
  addLog: (log: LogEntry) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearLogs: () => void;
}

export const useConnectionStore = create<ConnectionStore>((set, get) => ({
  connections: [],
  selectedConnection: null,
  logs: [],
  isLoading: false,
  error: null,

  setConnections: (connections) => set({ connections }),
  
  addConnection: (connection) => set((state) => ({
    connections: [...state.connections, connection],
  })),
  
  updateConnection: (id, updates) => set((state) => ({
    connections: state.connections.map((conn) =>
      conn.id === id ? { ...conn, ...updates } : conn
    ),
    selectedConnection: state.selectedConnection?.id === id 
      ? { ...state.selectedConnection, ...updates }
      : state.selectedConnection,
  })),
  
  removeConnection: (id) => set((state) => ({
    connections: state.connections.filter((conn) => conn.id !== id),
    selectedConnection: state.selectedConnection?.id === id ? null : state.selectedConnection,
  })),
  
  setSelectedConnection: (connection) => set({ selectedConnection: connection }),
  
  addLog: (log) => set((state) => ({
    logs: [log, ...state.logs].slice(0, 1000), // Keep only last 1000 logs
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearLogs: () => set({ logs: [] }),
}));