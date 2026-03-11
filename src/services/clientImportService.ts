import api from '../api';

export type ClienteRow = {
  name: any;
  mobile: any;
  valor: any;
  CPF_Disparo: any;
};

export const clientImportService = {
  async importClientes(rows: ClienteRow[]): Promise<{ success: boolean; inserted: number }>{
    const resp = await api.post('/import/clientes', { rows });
    return resp.data;
  }
  ,
  async listClientes(params: {
    wa?: '1' | '0' | '';
    created_from?: string; // YYYY-MM-DD
    created_to?: string;   // YYYY-MM-DD
    validated_from?: string; // YYYY-MM-DD
    validated_to?: string;   // YYYY-MM-DD
    sort?: 'name'|'mobile'|'valor'|'CPF_Disparo'|'status'|'whatsapp_existe'|'validado_em'|'created_at'|'updated_at';
    order?: 'asc'|'desc';
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; total: number; rows: any[] }>{
    const resp = await api.get('/import/clientes', { params });
    return resp.data;
  }
};
