import React, { useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { validationService, WhatsappValidationItem, WhatsappValidationResponse } from '../services/validationService';
import { clientImportService, ClienteRow } from '../services/clientImportService';
import { useServerSelection } from '../hooks/useServerSelection';
import { authService } from '../services/authService';

type ColumnMap = {
  numero: string | null;
  nome: string | null;
  data: string | null;
  valor?: string | null;
  cpf?: string | null;
};

function detectColumns(headers: string[]): ColumnMap {
  const lower = headers.map(h => h.toLowerCase().trim());
  const pick = (...cands: string[]) => {
    for (const c of cands) {
      const idx = lower.indexOf(c);
      if (idx >= 0) return headers[idx];
    }
    return null;
  };
  return {
    numero: pick('número', 'numero', 'mobile', 'telefone', 'phone'),
    nome: pick('nome', 'name'),
    data: pick('data cadastro', 'data_cadastro', 'data', 'created_at', 'dt'),
    valor: pick('valor', 'value', 'price'),
    cpf: pick('cpf', 'cpf_disparo', 'documento'),
  };
}

function normalizeNumber(input: any): string {
  const digits = String(input || '').replace(/\D+/g, '');
  return digits.replace(/^0+/, '');
}

export default function ValidateWhatsApp() {
  const [rows, setRows] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [map, setMap] = useState<ColumnMap>({ numero: null, nome: null, data: null, valor: null, cpf: null });
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<WhatsappValidationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importInfo, setImportInfo] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [clientRows, setClientRows] = useState<any[]>([]);
  const [totalClients, setTotalClients] = useState(0);
  const [waFilter, setWaFilter] = useState<'1'|'0'|''>('');
  const [createdFrom, setCreatedFrom] = useState<string>('');
  const [createdTo, setCreatedTo] = useState<string>('');
  const [validatedFrom, setValidatedFrom] = useState<string>('');
  const [validatedTo, setValidatedTo] = useState<string>('');
  const [limit, setLimit] = useState(25);
  const [offset, setOffset] = useState(0);

  const { availableServers, selectedServerId, setSelectedServerId, selectedServer } = useServerSelection();
  const [wuToken, setWuToken] = useState('');
  const [evoInstance, setEvoInstance] = useState('');

  const currentUser = authService.getUser();

  const canValidate = useMemo(() => {
    return !!rows.length && !!map.numero && !!selectedServerId && ((selectedServer?.type === 'wuzapi' && wuToken) || (selectedServer?.type === 'evolution' && evoInstance));
  }, [rows.length, map.numero, selectedServerId, selectedServer?.type, wuToken, evoInstance]);

  const onFile = useCallback(async (file: File) => {
    setError(null);
    setResult(null);
    setImportInfo(null);
    setProgress(5);
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
      const cols = Object.keys(json[0] || {});
      const detected = detectColumns(cols);
      setRows(json);
      setHeaders(cols);
      setMap(detected);
      setProgress(30);
    } catch (e: any) {
      setError(e?.message || 'Falha ao ler arquivo');
    }
  }, []);

  const buildItems = (): WhatsappValidationItem[] => {
    const numeroKey = map.numero!;
    const nomeKey = map.nome;
    const dataKey = map.data;
    const valorKey = map.valor || undefined;
    const cpfKey = map.cpf || undefined;
    const out: WhatsappValidationItem[] = [];
    for (const r of rows) {
      const num = normalizeNumber(r[numeroKey]);
      if (!num) continue;
      const item: WhatsappValidationItem = {
        number: num,
      };
      if (nomeKey) item.name = String(r[nomeKey] ?? '').trim();
      if (dataKey) item.date = String(r[dataKey] ?? '').trim();
      if (valorKey) item.valor = r[valorKey];
      if (cpfKey) item.cpf = r[cpfKey];
      out.push(item);
      if (out.length >= 10000) break;
    }
    return out;
  };

  // Constrói as linhas exatamente com os campos visíveis (sem transformação de dados)
  const buildClienteRows = (): ClienteRow[] => {
    const numeroKey = map.numero!;
    const nomeKey = map.nome || 'name';
    const valorKey = map.valor || 'valor';
    const cpfKey = map.cpf || 'CPF_Disparo';
    const out: ClienteRow[] = [];
    for (const r of rows) {
      if (!numeroKey) break;
      const obj: ClienteRow = {
        name: r[nomeKey],
        mobile: r[numeroKey],
        valor: r[valorKey],
        CPF_Disparo: r[cpfKey],
      };
      out.push(obj);
      if (out.length >= 10000) break;
    }
    return out;
  };

  const handleValidate = async () => {
    try {
      setLoading(true);
      setProgress(45);
      const items = buildItems();
      const payload = {
        serverId: selectedServerId,
        token: selectedServer?.type === 'wuzapi' ? wuToken : undefined,
        instanceName: selectedServer?.type === 'evolution' ? evoInstance : undefined,
        items,
      };
      // Simular progresso enquanto aguarda backend
      const tick = setInterval(() => setProgress(p => Math.min(p + 3, 85)), 300);
      const resp = await validationService.validateWhatsappNumbers(payload);
      clearInterval(tick);
      setResult(resp);
      setProgress(100);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Falha na validação');
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async () => {
    try {
      setLoading(true);
      setError(null);
      setImportInfo(null);
      const payload = buildClienteRows();
      const resp = await clientImportService.importClientes(payload);
      setImportInfo(`Linhas inseridas: ${resp.inserted}`);
      // Atualiza listagem após importação
      await fetchClients({ resetOffset: true });
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Falha ao carregar lista');
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async ({ resetOffset = false } = {}) => {
    try {
      setListLoading(true);
      setListError(null);
      if (resetOffset) setOffset(0);
      const cFrom = createdFrom || undefined;
      const cTo = (createdTo || createdFrom) || undefined;
      const vFrom = validatedFrom || undefined;
      const vTo = (validatedTo || validatedFrom) || undefined;
      const resp = await clientImportService.listClientes({
        wa: waFilter,
        created_from: cFrom,
        created_to: cTo,
        validated_from: vFrom,
        validated_to: vTo,
        sort: 'created_at',
        order: 'desc',
        limit,
        offset: resetOffset ? 0 : offset,
      });
      setClientRows(resp.rows || []);
      setTotalClients(resp.total || 0);
    } catch (e: any) {
      setListError(e?.response?.data?.message || e?.message || 'Falha ao carregar clientes');
    } finally {
      setListLoading(false);
    }
  };

  React.useEffect(() => {
    fetchClients({ resetOffset: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waFilter, createdFrom, createdTo, validatedFrom, validatedTo, limit]);

  const exportXLSX = () => {
    if (!result) return;
    const rows = result.results.map(r => ({
      Número: r.number,
      Nome: r.name || '',
      DataCadastro: r.date || '',
      WhatsApp: r.exists === true ? 'SIM' : r.exists === false ? 'NÃO' : 'DESCONHECIDO',
      Status: r.status,
      Endpoint: r.endpoint || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Validação');
    XLSX.writeFile(wb, 'validacao_whatsapp.xlsx');
  };

  // Formata datas ISO ou strings em um formato legível local
  const formatDateTime = (val: any): string => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleString('pt-BR', { hour12: false });
    } catch {
      return String(val);
    }
  };

  // Formata apenas a data (sem horário)
  const formatDate = (val: any): string => {
    if (!val) return '';
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return String(val);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return String(val);
    }
  };

  const exportCSV = () => {
    if (!result) return;
    const rows = result.results.map(r => ({
      numero: r.number,
      nome: r.name || '',
      data_cadastro: r.date || '',
      whatsapp: r.exists === true ? 'SIM' : r.exists === false ? 'NÃO' : 'DESCONHECIDO',
      status: r.status,
      endpoint: r.endpoint || '',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validacao_whatsapp.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold mb-4">Validar Números WhatsApp</h2>

        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Selecionar arquivo XLS/XLSX</label>
            <input type="file" accept=".xls,.xlsx" onChange={(e) => e.target.files && onFile(e.target.files[0])} className="block w-full text-sm" />
            <p className="text-xs text-gray-500 mt-1">Até 10.000 registros por upload</p>
          </div>
        </div>

        {!!rows.length && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coluna "Número"</label>
              <select value={map.numero || ''} onChange={e => setMap(m => ({ ...m, numero: e.target.value || null }))} className="w-full border rounded px-2 py-2 text-sm">
                <option value="">Selecione...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coluna "Nome" (opcional)</label>
              <select value={map.nome || ''} onChange={e => setMap(m => ({ ...m, nome: e.target.value || null }))} className="w-full border rounded px-2 py-2 text-sm">
                <option value="">Selecione...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Coluna "Data Cadastro" (opcional)</label>
              <select value={map.data || ''} onChange={e => setMap(m => ({ ...m, data: e.target.value || null }))} className="w-full border rounded px-2 py-2 text-sm">
                <option value="">Selecione...</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="mt-6 flex items-center gap-3">
          <button disabled={!canValidate || loading} onClick={handleValidate} className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50">Validar</button>
          <button disabled={!rows.length || !map.numero || loading} onClick={handleImport} className="px-4 py-2 bg-gray-700 text-white rounded disabled:opacity-50">Carregar Lista</button>
          {loading && (
            <div className="flex items-center gap-2">
              <div className="w-48 h-2 bg-gray-200 rounded">
                <div className="h-2 bg-green-600 rounded" style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-600">{Math.floor(progress)}%</span>
            </div>
          )}
          {result && (
            <>
              <button onClick={exportXLSX} className="px-3 py-2 bg-blue-600 text-white rounded">Exportar XLSX</button>
              <button onClick={exportCSV} className="px-3 py-2 bg-indigo-600 text-white rounded">Exportar CSV</button>
            </>
          )}
        </div>

        {error && <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{error}</div>}
        {importInfo && <div className="mt-4 p-3 bg-blue-50 text-blue-700 border border-blue-200 rounded text-sm">{importInfo}</div>}

        {result && (
          <div className="mt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Total</div>
                <div className="text-lg font-semibold">{result.total}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">Formato válido</div>
                <div className="text-lg font-semibold">{result.validFormat}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">WhatsApp (SIM)</div>
                <div className="text-lg font-semibold text-green-700">{result.whatsappYes}</div>
              </div>
              <div className="p-3 bg-gray-50 rounded">
                <div className="text-xs text-gray-500">WhatsApp (NÃO)</div>
                <div className="text-lg font-semibold text-red-700">{result.whatsappNo}</div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="p-2 text-left">Número</th>
                    <th className="p-2 text-left">Nome</th>
                    <th className="p-2 text-left">Data Cadastro</th>
                    <th className="p-2 text-left">WhatsApp</th>
                    <th className="p-2 text-left">Status</th>
                    <th className="p-2 text-left">Endpoint</th>
                  </tr>
                </thead>
                <tbody>
                  {result.results.slice(0, 2000).map((r, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{r.number}</td>
                      <td className="p-2">{r.name || ''}</td>
                      <td className="p-2">{r.date || ''}</td>
                      <td className="p-2">{r.exists === true ? 'SIM' : r.exists === false ? 'NÃO' : 'DESCONHECIDO'}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2 truncate max-w-[220px]">{r.endpoint || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.results.length > 2000 && (
                <div className="text-xs text-gray-500 mt-2">Mostrando primeiras 2000 linhas. Use exportação para ver tudo.</div>
              )}
            </div>
          </div>
        )}

        {/* Seção de visualização dos clientes carregados */}
        <div className="mt-8">
          <h3 className="text-md font-semibold mb-3">Clientes Carregados</h3>
          <div className="flex flex-wrap items-end gap-3 mb-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">WhatsApp</label>
              <select value={waFilter} onChange={e => setWaFilter(e.target.value as '1'|'0'|'')} className="border rounded px-2 py-1 text-sm">
                <option value="">TODOS</option>
                <option value="1">SIM</option>
                <option value="0">NÃO</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Criado entre datas</label>
              <div className="flex items-end gap-2">
                <input type="date" value={createdFrom} onChange={e => setCreatedFrom(e.target.value)} className="border rounded px-2 py-1 text-sm" />
                <input type="date" value={createdTo} onChange={e => setCreatedTo(e.target.value)} className="border rounded px-2 py-1 text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Validado em</label>
              <input type="date" value={validatedFrom} onChange={e => { setValidatedFrom(e.target.value); setValidatedTo(e.target.value); }} className="border rounded px-2 py-1 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Exibir</label>
              <select value={String(limit)} onChange={e => setLimit(parseInt(e.target.value))} className="border rounded px-2 py-1 text-sm">
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
              </select>
            </div>
            <button onClick={() => fetchClients({ resetOffset: true })} className="px-3 py-2 bg-slate-600 text-white rounded">Atualizar</button>
            <button
              onClick={() => {
                setWaFilter('');
                setCreatedFrom('');
                setCreatedTo('');
                setValidatedFrom('');
                setValidatedTo('');
                fetchClients({ resetOffset: true });
              }}
              className="px-3 py-2 bg-gray-200 text-gray-800 rounded border"
            >
              Limpar filtros
            </button>
          </div>

          {listLoading && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-48 h-2 bg-gray-200 rounded">
                <div className="h-2 bg-indigo-600 rounded" style={{ width: '70%' }} />
              </div>
              <span className="text-xs text-gray-600">Carregando clientes...</span>
            </div>
          )}
          {listError && <div className="mb-3 p-3 bg-red-50 text-red-700 border border-red-200 rounded text-sm">{listError}</div>}
          {importInfo && <div className="mb-3 p-3 bg-green-50 text-green-700 border border-green-200 rounded text-sm">{importInfo}</div>}

          <div className="overflow-auto border rounded">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2">Nome</th>
                  <th className="text-left px-3 py-2">Telefone</th>
                  <th className="text-left px-3 py-2">Valor</th>
                  <th className="text-left px-3 py-2">CPF_Disparo</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">WhatsApp</th>
                  <th className="text-left px-3 py-2">Validado em</th>
                  <th className="text-left px-3 py-2">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {clientRows.map((r, idx) => (
                  <tr key={r.id ?? idx} className={idx % 2 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 font-mono">{r.mobile}</td>
                    <td className="px-3 py-2">{r.valor}</td>
                    <td className="px-3 py-2">{r.CPF_Disparo}</td>
                    <td className="px-3 py-2">{r.status ?? ''}</td>
                    <td className="px-3 py-2">{r.whatsapp_existe === 1 ? 'SIM' : r.whatsapp_existe === 0 ? 'NÃO' : ''}</td>
                    <td className="px-3 py-2">{formatDateTime(r.validado_em)}</td>
                    <td className="px-3 py-2">{formatDate(r.created_at)}</td>
                  </tr>
                ))}
                {clientRows.length === 0 && !listLoading && (
                  <tr>
                    <td colSpan={8} className="px-3 py-6 text-center text-gray-500">Nenhum cliente encontrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-3 text-xs text-gray-600">
            <div>Total: {totalClients}</div>
            <div className="flex items-center gap-2">
              <button disabled={offset===0} onClick={() => { const next = Math.max(0, offset - limit); setOffset(next); fetchClients({}); }} className="px-2 py-1 border rounded">Anterior</button>
              <button disabled={offset+limit>=totalClients} onClick={() => { const next = offset + limit; setOffset(next); fetchClients({}); }} className="px-2 py-1 border rounded">Próximo</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
