import api from '../api';

export interface WhatsappValidationItem {
  number?: string;
  name?: string;
  date?: string;
  [key: string]: any;
}

export interface WhatsappValidationRequest {
  serverId: string;
  token?: string; // WUZAPI
  instanceName?: string; // Evolution
  items: WhatsappValidationItem[];
}

export interface WhatsappValidationResultItem {
  input: WhatsappValidationItem;
  number: string;
  name?: string;
  date?: string;
  exists: boolean | null;
  status: 'ok' | 'unknown' | 'error' | 'invalid_format';
  endpoint?: string | null;
  method?: string | null;
  error?: string;
}

export interface WhatsappValidationResponse {
  success: boolean;
  total: number;
  validFormat: number;
  whatsappYes: number;
  whatsappNo: number;
  unknown: number;
  errors: number;
  results: WhatsappValidationResultItem[];
}

export const validationService = {
  async validateWhatsappNumbers(payload: WhatsappValidationRequest): Promise<WhatsappValidationResponse> {
    const response = await api.post('/validate/whatsapp', payload);
    return response.data as WhatsappValidationResponse;
  },
};

