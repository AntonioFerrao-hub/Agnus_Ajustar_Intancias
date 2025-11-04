// Importa o app Express do backend (CommonJS). Node ESM fornece default sintético.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import app from '../backend/index.js';

export default function handler(req: any, res: any) {
  // Normaliza path para casar com as rotas montadas em "/api/*"
  try {
    const url = req?.url || '';
    if (url && !url.startsWith('/api')) {
      req.url = url.startsWith('/') ? `/api${url}` : `/api/${url}`;
    }
    const originalUrl = req?.originalUrl || '';
    if (originalUrl && !originalUrl.startsWith('/api')) {
      req.originalUrl = originalUrl.startsWith('/') ? `/api${originalUrl}` : `/api/${originalUrl}`;
    }
  } catch {}
  return (app as any)(req, res);
}