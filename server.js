import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
// Importa o app Express do backend (CommonJS). Node ESM cria export default sintético.
import app from './backend/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, 'dist');

// Servir arquivos estáticos do frontend buildado
app.use(express.static(distPath));

// Fallback SPA para rotas não-API
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Servidor web rodando na porta ${port}`);
});