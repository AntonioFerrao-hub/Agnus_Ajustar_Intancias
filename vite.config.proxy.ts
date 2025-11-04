import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      '/api/wuzapi': {
        target: 'https://wu3.ideiasia.com.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/wuzapi/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            // Propaga o Authorization do cliente para permitir múltiplos servidores/keys
            const incomingAuth = req.headers['authorization'];
            if (incomingAuth) {
              proxyReq.setHeader('Authorization', incomingAuth);
            }
            // Propaga o header 'token' utilizado pelos endpoints /session/* do WUZ
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
    },
  },
})