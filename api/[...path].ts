import serverless from 'serverless-http';
// Importa o app Express do backend (CommonJS). Node ESM fornece default synthético.
// Caminho relativo ao raiz do projeto.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import app from '../backend/index.js';

const handler = serverless(app as any);

export default async function(req: any, res: any) {
  // Delega para o wrapper serverless do Express
  // Em Vercel, a função em /api/[...path] recebe req.url sem o prefixo "/api".
  // O app Express está montado em "/api/*". Prefixamos para casar as rotas.
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
  return handler(req as any, res as any);
}