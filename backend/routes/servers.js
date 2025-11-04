const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Get all servers
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM servers ORDER BY createdAt DESC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ message: 'Error fetching servers' });
  }
});

// Add a new server
router.post('/', async (req, res) => {
  const { name, url, apiKey, type } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO servers (id, name, url, apiKey, type) VALUES (?, ?, ?, ?, ?)',
      [id, name, url, apiKey, type]
    );
    const [[newServer]] = await pool.query('SELECT * FROM servers WHERE id = ?', [id]);
    res.status(201).json(newServer);
  } catch (error) {
    console.error('Error adding server:', error);
    res.status(500).json({ message: 'Error adding server' });
  }
});

// Update a server
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, url, apiKey, type } = req.body;
  try {
    await pool.query(
      'UPDATE servers SET name = ?, url = ?, apiKey = ?, type = ? WHERE id = ?',
      [name, url, apiKey, type, id]
    );
    const [[updatedServer]] = await pool.query('SELECT * FROM servers WHERE id = ?', [id]);
    res.json(updatedServer);
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ message: 'Error updating server' });
  }
});

// Delete a server
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM servers WHERE id = ?', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ message: 'Error deleting server' });
  }
});

// Testar conexão com servidor dinamicamente (evita CORS no cliente)
router.post('/test', async (req, res) => {
  const { url, apiKey, type } = req.body || {};
  if (!url || !apiKey || !type) {
    return res.status(400).json({ ok: false, message: 'url, apiKey e type são obrigatórios' });
  }

  try {
    if (type === 'wuzapi') {
      // Normaliza URL: remove barras finais e sufixo /admin se o usuário tiver incluído
      const normalized = String(url).trim().replace(/\/+$/, '');
      const base = normalized.replace(/\/admin$/i, '');
      console.log(`[servers/test] Testing WUZAPI at`, base);

      const tryReq = async (authHeader) => {
        return await axios.get(`${base}/admin/users`, {
          headers: { Authorization: authHeader, Accept: 'application/json' },
          timeout: 15000,
        });
      };

      let resp;
      try {
        resp = await tryReq(apiKey);
      } catch (err) {
        const status = err?.response?.status;
        const hasBearer = /^bearer\s/i.test(apiKey);
        if ((status === 401 || status === 404) && !hasBearer) {
          // Tenta novamente com Bearer também em 404 (algumas impl. retornam 404 para ocultar recurso)
          resp = await tryReq(`Bearer ${apiKey}`);
        } else {
          throw err;
        }
      }

      const data = resp.data;
      const usersCount = Array.isArray(data?.data)
        ? data.data.length
        : Array.isArray(data)
        ? data.length
        : Array.isArray(data?.users)
        ? data.users.length
        : undefined;

      return res.json({ ok: true, status: resp.status, usersCount, server: base });
    } else if (type === 'evolution') {
      const base = String(url).trim().replace(/\/+$/, '');
      console.log(`[servers/test] Testing Evolution at`, base);
      const resp = await axios.get(`${base}/`, {
        headers: { apikey: apiKey, Accept: 'application/json' },
        timeout: 15000,
      });
      return res.json({ ok: true, status: resp.status, info: resp.data, server: base });
    } else {
      return res.status(400).json({ ok: false, message: 'Tipo inválido. Use wuzapi ou evolution' });
    }
  } catch (error) {
    const status = error?.response?.status || 500;
    let message = error?.response?.data?.message || error.message || 'Erro ao testar servidor';
    // Ajuda de diagnóstico para 404 típicos por URL com /admin no WUZAPI
    if (status === 404 && type === 'wuzapi') {
      message = `${message}. Verifique se a URL não contém '/admin' no final.`;
    }
    return res.status(status).json({ ok: false, status, message, data: error?.response?.data });
  }
});

// Listar usuários WUZAPI via backend (evita CORS no cliente)
router.get('/:id/wuz/users', async (req, res) => {
  const { id } = req.params;
  try {
    const [[server]] = await pool.query('SELECT * FROM servers WHERE id = ?', [id]);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
    }
    if (String(server.type) !== 'wuzapi') {
      return res.status(400).json({ success: false, message: 'Servidor não é do tipo WUZAPI' });
    }

    // Normaliza URL: remove barras finais e sufixo /admin se presente
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