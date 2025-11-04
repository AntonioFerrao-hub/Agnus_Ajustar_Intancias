import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins: [
          'react-dev-locator',
        ],
      },
    }),
    tsconfigPaths()
  ],
  server: {
    proxy: {
      '/api/wuzapi': {
        target: 'https://wu3.ideiasia.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wuzapi/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Propaga Authorization dinamicamente para suportar múltiplos servidores/chaves
            const incomingAuth = req.headers['authorization'];
            if (incomingAuth) {
              proxyReq.setHeader('Authorization', incomingAuth);
            }
            // Propaga 'token' para endpoints /session/* (qr, connect)
            const incomingToken = req.headers['token'];
            if (incomingToken) {
              proxyReq.setHeader('token', incomingToken);
            }
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/api/evolution': {
        target: 'https://wp3.agnusconsig.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/evolution/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('apikey', '305d696103fcd8a923fe56663894dc79');
            proxyReq.setHeader('Accept', 'application/json');
          });
        },
      },
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
