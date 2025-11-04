import serverless from 'serverless-http';
// Importa o app Express do backend (CommonJS). Node ESM fornece default synthético.
// Caminho relativo ao raiz do projeto.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import app from '../backend/index.js';

const handler = serverless(app as any);

export default async function(req: any, res: any) {
  // Delega para o wrapper serverless do Express
  return handler(req as any, res as any);
}