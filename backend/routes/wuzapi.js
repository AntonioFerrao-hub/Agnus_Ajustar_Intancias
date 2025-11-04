const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const https = require('https');

// Simple ping for debugging router mount
router.get('/ping', (req, res) => {
  res.json({ ok: true });
});

// POST /api/wuz/session/connect - Proxy para conectar sessão WU evitando CORS
router.post('/session/connect', async (req, res) => {
  const { serverId, token, payload } = req.body || {};
  if (!serverId || !token) {
    return res.status(400).json({ success: false, message: 'serverId e token são obrigatórios' });
  }

  try {
    const [[server]] = await pool.query('SELECT * FROM servers WHERE id = ?', [serverId]);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
    }
    if (String(server.type) !== 'wuzapi') {
      return res.status(400).json({ success: false, message: 'Servidor não é do tipo WUZAPI' });
    }

    const normalized = String(server.url).trim().replace(/\/+$/, '');
    const base = normalized.replace(/\/admin$/i, '');
    const variants = [
      `${base}/session/connect`,
      `${normalized}/admin/session/connect`,
      `${base}/api/session/connect`,
    ];

    const defaultPayload = payload || { Subscribe: ['Message', 'ChatPresence'], Immediate: true };

    const hasBearer = /^bearer\s/i.test(server.apiKey);
    const authHeader = hasBearer ? server.apiKey : `Bearer ${server.apiKey}`;

    // Tenta múltiplas variações de endpoint para compatibilidade
    for (const url of variants) {
      try {
        // Primeira tentativa: apenas header token
        const resp = await axios.post(url, defaultPayload, {
          headers: { token, Accept: 'application/json', 'Content-Type': 'application/json' },
          timeout: 15000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
        return res.json({ success: true, data: resp.data, endpoint: url, mode: 'token' });
      } catch (err1) {
        const status1 = err1?.response?.status;
        // Se for 404, tentar próxima variação diretamente
        if (status1 === 404) {
          // tenta com Authorization antes de pular
          try {
            const respAuth = await axios.post(url, defaultPayload, {
              headers: { token, Authorization: authHeader, Accept: 'application/json', 'Content-Type': 'application/json' },
              timeout: 15000,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            return res.json({ success: true, data: respAuth.data, endpoint: url, mode: 'token+auth' });
          } catch (err1auth) {
            // continua para próxima variação
            continue;
          }
        } else {
          // Para outros status (401/403/5xx), tenta com Authorization
          try {
            const respAuth = await axios.post(url, defaultPayload, {
              headers: { token, Authorization: authHeader, Accept: 'application/json', 'Content-Type': 'application/json' },
              timeout: 15000,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            return res.json({ success: true, data: respAuth.data, endpoint: url, mode: 'token+auth' });
          } catch (err2) {
            const code = err2?.response?.status || status1 || 500;
            const message = err2?.response?.data?.message || err2?.message || 'Erro ao conectar sessão WUZAPI';
            // Para 404 tentar próxima variação; para outros status, retornar imediatamente
            if (code === 404) {
              continue;
            }
            return res.status(code).json({ success: false, status: code, message, endpoint: url, data: err2?.response?.data });
          }
        }
      }
    }

    // Se todas as variações falharem
    return res.status(404).json({ success: false, status: 404, message: 'Endpoint /session/connect não encontrado nas variações testadas', tried: variants });
  } catch (error) {
    const status = error?.response?.status || 500;
    let message = error?.response?.data?.message || error.message || 'Erro ao conectar sessão WUZAPI';
    return res.status(status).json({ success: false, status, message, data: error?.response?.data });
  }
});

// POST /api/wuz/session/qr - Obter QR Code via backend evitando CORS
router.post('/session/qr', async (req, res) => {
  const { serverId, token } = req.body || {};
  if (!serverId || !token) {
    return res.status(400).json({ success: false, message: 'serverId e token são obrigatórios' });
  }

  try {
    const [[server]] = await pool.query('SELECT * FROM servers WHERE id = ?', [serverId]);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
    }
    if (String(server.type) !== 'wuzapi') {
      return res.status(400).json({ success: false, message: 'Servidor não é do tipo WUZAPI' });
    }

    const normalized = String(server.url).trim().replace(/\/+$/, '');
    const base = normalized.replace(/\/admin$/i, '');
    const variants = [
      `${base}/session/qr`,
      `${normalized}/admin/session/qr`,
      `${base}/api/session/qr`,
    ];

    const hasBearer = /^bearer\s/i.test(server.apiKey);
    const authHeader = hasBearer ? server.apiKey : `Bearer ${server.apiKey}`;

    let data = null;
    let usedEndpoint = null;
    let mode = 'token';

    // Tenta primeiro via /session/qr nas variações com header token
    for (const url of variants) {
      try {
        const resp = await axios.get(url, {
          headers: { token, Accept: 'application/json' },
          timeout: 15000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
        data = resp.data;
        usedEndpoint = url;
        mode = 'token';
        break;
      } catch (err1) {
        const status1 = err1?.response?.status;
        // Se 404, tenta próxima variação. Para outros, tenta com Authorization
        if (status1 === 404) {
          // tentar com Authorization antes de pular
          try {
            const respAuth = await axios.get(url, {
              headers: { token, Authorization: authHeader, Accept: 'application/json' },
              timeout: 15000,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            data = respAuth.data;
            usedEndpoint = url;
            mode = 'token+auth';
            break;
          } catch (err1auth) {
            continue;
          }
        } else {
          // Para 401/403/5xx tenta com Authorization
          try {
            const respAuth = await axios.get(url, {
              headers: { token, Authorization: authHeader, Accept: 'application/json' },
              timeout: 15000,
              httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            });
            data = respAuth.data;
            usedEndpoint = url;
            mode = 'token+auth';
            break;
          } catch (err2) {
            if ((err2?.response?.status || status1) === 404) {
              continue;
            }
            const code = err2?.response?.status || status1 || 500;
            const message = err2?.response?.data?.message || err2?.message || 'Erro ao obter QR Code WUZAPI';
            return res.status(code).json({ success: false, status: code, message, endpoint: url, data: err2?.response?.data });
          }
        }
      }
    }

    // Se ainda não obteve, tenta fallback users/{token}/qrcode
    if (!data) {
      try {
        const respUser = await axios.get(`${base}/users/${token}/qrcode`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          timeout: 15000,
          httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        });
        data = respUser.data;
        usedEndpoint = `${base}/users/${token}/qrcode`;
        mode = 'auth-only';
      } catch (errUser) {
        return res.status(errUser?.response?.status || 500).json({
          success: false,
          status: errUser?.response?.status || 500,
          message: errUser?.response?.data?.message || errUser?.message || 'Erro ao obter QR Code WUZAPI',
          tried: [...variants, `${base}/users/${token}/qrcode`],
          data: errUser?.response?.data,
        });
      }
    }

    const base64 =
      data?.qr ||
      data?.qrcode ||
      data?.QRCode ||
      data?.qrCode ||
      data?.data?.qr ||
      data?.data?.qrcode ||
      data?.data?.QRCode ||
      data?.data?.qrCode ||
      (typeof data === 'string' ? data : null);

    if (!base64) {
      return res.status(422).json({ success: false, message: 'QR Code não encontrado na resposta', raw: data, endpoint: usedEndpoint, mode });
    }

    return res.json({ success: true, qr: base64, endpoint: usedEndpoint, mode });
  } catch (error) {
    const status = error?.response?.status || 500;
    let message = error?.response?.data?.message || error.message || 'Erro ao obter QR Code WUZAPI';
    return res.status(status).json({ success: false, status, message, data: error?.response?.data });
  }
});

// GET /api/wuz/users/:serverId - Listar usuários WUZAPI via backend
router.get('/users/:serverId', async (req, res) => {
  const { serverId } = req.params;
  try {
    const [[server]] = await pool.query('SELECT * FROM servers WHERE id = ?', [serverId]);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
    }
    if (String(server.type) !== 'wuzapi') {
      return res.status(400).json({ success: false, message: 'Servidor não é do tipo WUZAPI' });
    }

    const normalized = String(server.url).trim().replace(/\/+$/, '');
    const base = normalized.replace(/\/admin$/i, '');

    const tryReq = async (authHeader) => {
      return await axios.get(`${base}/admin/users`, {
        headers: { Authorization: authHeader, Accept: 'application/json' },
        timeout: 15000,
      });
    };

    let resp;
    try {
      resp = await tryReq(server.apiKey);
    } catch (err) {
      const status = err?.response?.status;
      const hasBearer = /^bearer\s/i.test(server.apiKey);
      if ((status === 401 || status === 404) && !hasBearer) {
        resp = await tryReq(`Bearer ${server.apiKey}`);
      } else {
        throw err;
      }
    }

    const data = resp.data;
    const users = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data)
      ? data
      : Array.isArray(data?.users)
      ? data.users
      : [];
    const count = users.length;

    return res.json({ success: true, users, count, server: base });
  } catch (error) {
    const status = error?.response?.status || 500;
    let message = error?.response?.data?.message || error.message || 'Erro ao buscar usuários WUZAPI';
    if (status === 404) {
      message = `${message}. Verifique se a URL do servidor não contém '/admin' no final.`;
    }
    return res.status(status).json({ success: false, status, message, data: error?.response?.data });
  }
});

module.exports = router;