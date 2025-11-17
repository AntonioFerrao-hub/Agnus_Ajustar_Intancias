const express = require('express');
const jwt = require('jsonwebtoken');
const db = require('../db');
const wuzapiService = require('../services/wuzapiService');
const evolutionService = require('../services/evolutionService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

// POST /api/links/qr - cria um token de link temporário (expira em 5 minutos)
// Body pode ser:
// 1) { connectionId }
// 2) { type: 'wuz', serverId, token }
// 3) { type: 'evolution', serverId, instanceName }
router.post('/qr', async (req, res) => {
  try {
    const { connectionId, type, serverId, token, instanceName } = req.body || {};

    let payload = null;

    if (connectionId) {
      // Valida se conexão existe
      const [rows] = await db.query('SELECT id, type, server_id, token, instanceName, name FROM connections WHERE id = ? LIMIT 1', [connectionId]);
      if (!rows || rows.length === 0) {
        return res.status(404).json({ message: 'Conexão não encontrada' });
      }
      const conn = rows[0];
      payload = {
        kind: 'qr',
        via: 'connection',
        connectionId: conn.id,
        type: conn.type,
        serverId: conn.server_id,
        token: conn.token || null,
        instanceName: conn.instanceName || null,
        name: conn.name || null,
      };
    } else if (type === 'wuz' && serverId && token) {
      payload = { kind: 'qr', via: 'direct', type: 'wuz', serverId, token };
    } else if (type === 'evolution' && serverId && instanceName) {
      payload = { kind: 'qr', via: 'direct', type: 'evolution', serverId, instanceName };
    } else {
      return res.status(400).json({ message: 'Parâmetros inválidos para criação de link QR' });
    }

    const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: '5m' });
    // Caminho público que o frontend irá resolver
    const path = `/qr?token=${signed}`;
    return res.json({ path, token: signed, expiresInSeconds: 300 });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Erro ao criar link temporário' });
  }
});

// POST /api/links/qr/resolve - valida token e opcionalmente retorna QR code
// Body: { token, includeQr?: boolean }
router.post('/qr/resolve', async (req, res) => {
  try {
    const { token: signedToken, includeQr } = req.body || {};
    if (!signedToken) return res.status(400).json({ message: 'Token não informado' });

    let decoded;
    try {
      decoded = jwt.verify(signedToken, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Token inválido ou expirado' });
    }

    const result = { valid: true, payload: decoded };

    if (includeQr) {
      let base64 = null;
      if (decoded.via === 'connection' && decoded.connectionId) {
        // Busca conexão para garantir dados atualizados
        const [rows] = await db.query('SELECT id, type, server_id, token, instanceName, name FROM connections WHERE id = ? LIMIT 1', [decoded.connectionId]);
        if (!rows || rows.length === 0) {
          return res.status(404).json({ message: 'Conexão não encontrada para QR' });
        }
        const conn = rows[0];
        if (conn.type === 'wuz') {
          base64 = await wuzapiService.getQRCode(conn.server_id, conn.token);
        } else if (conn.type === 'evolution') {
          base64 = await evolutionService.getQRCode(conn.server_id, conn.instanceName);
        }
      } else if (decoded.via === 'direct') {
        if (decoded.type === 'wuz') {
          base64 = await wuzapiService.getQRCode(decoded.serverId, decoded.token);
        } else if (decoded.type === 'evolution') {
          base64 = await evolutionService.getQRCode(decoded.serverId, decoded.instanceName);
        }
      }

      if (!base64) {
        return res.status(422).json({ message: 'QR Code não disponível no momento', payload: decoded });
      }
      result.qrCode = `data:image/png;base64,${base64}`;
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Erro ao resolver link temporário' });
  }
});

module.exports = router;