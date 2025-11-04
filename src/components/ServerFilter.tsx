import { useEffect, useMemo, useState } from 'react';
import { useServerStore } from '../store/useServerStore';

type ServerType = 'evolution' | 'wuzapi';

interface ServerFilterProps {
  onSelectionChange: (payload: { type: ServerType; serverIds: string[]; all?: boolean }) => void;
  defaultType?: ServerType;
  defaultSelectedIds?: string[];
  mode?: 'select' | 'list';
}

export default function ServerFilter({ onSelectionChange, defaultType = 'evolution', defaultSelectedIds = [], mode = 'list' }: ServerFilterProps) {
  const { servers, fetchServers } = useServerStore();
  const [typeFilter, setTypeFilter] = useState<ServerType>(defaultType);
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedIds);
  const [allSelected, setAllSelected] = useState<boolean>(false);

  useEffect(() => {
    fetchServers();
  }, [fetchServers]);

  useEffect(() => {
    onSelectionChange({ type: typeFilter, serverIds: selectedIds, all: allSelected });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeFilter, selectedIds, allSelected]);

  const filteredServers = useMemo(() => servers.filter((s) => s.isActive && s.type === typeFilter), [servers, typeFilter]);

  useEffect(() => {
    if (allSelected) {
      setSelectedIds(filteredServers.map((s) => s.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredServers.length, typeFilter]);

  return (
    <div className="w-full grid grid-cols-1 gap-3">
      <div className="w-full">
        <div className="text-sm text-gray-700 mb-1">Tipo</div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTypeFilter('evolution')}
            className={`px-3 py-2 rounded-md text-sm ${typeFilter === 'evolution' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            Evolution
          </button>
          <button
            type="button"
            onClick={() => setTypeFilter('wuzapi')}
            className={`px-3 py-2 rounded-md text-sm ${typeFilter === 'wuzapi' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-700'}`}
          >
            WUZAPI
          </button>
        </div>
      </div>

      {/* Campo de busca removido para simplificar o layout */}

      {mode === 'select' ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:space-x-2 w-full sm:w-auto">
          <span className="text-sm text-gray-700">Servidor:</span>
          <select
            value={selectedIds[0] || ''}
            onChange={(e) => setSelectedIds(e.target.value ? [e.target.value] : [])}
            className="px-3 py-2 border rounded bg-white text-gray-800 text-sm w-full sm:w-auto"
          >
            <option value="">Selecione...</option>
            {filteredServers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="w-full">
          <div className="text-sm text-gray-700 mb-1">Servidor:</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 w-full">
            <button
              type="button"
              onClick={() => {
                const next = !allSelected;
                setAllSelected(next);
                setSelectedIds(next ? filteredServers.map((s) => s.id) : []);
              }}
              className={`px-3 py-2 rounded-md text-sm w-full text-left ${allSelected ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Todos
            </button>
            {filteredServers.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setAllSelected(false);
                  setSelectedIds((prev) => (prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]));
                }}
                className={`px-3 py-2 rounded-md text-sm w-full text-left ${selectedIds.includes(s.id) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}