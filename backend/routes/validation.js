const express = require('express');
const router = express.Router();
const pool = require('../db');
const axios = require('axios');
const https = require('https');

function normalizeNumber(raw) {
  if (!raw) return '';
  const digits = String(raw).replace(/\D+/g, '');
  // Remove leading zeros
  const cleaned = digits.replace(/^0+/, '');
  return cleaned;
}

function parseExists(respData) {
  // Try common keys used by different APIs
  const d = respData || {};
  if (typeof d === 'boolean') return d;
  const candidates = [
    d.exists,
    d.valid,
    d.isWA,
    d.isWhatsapp,
    d.isWhatsApp,
    d.isBusiness,
    d.whatsapp,
    d?.data?.exists,
    d?.result?.exists,
    Array.isArray(d?.contacts) ? d.contacts.length > 0 : undefined,
  ];
  for (const c of candidates) {
    if (typeof c === 'boolean') return c;
  }
  // Some APIs return a JID/WID when contact exists
  const jid = d.jid || d.wid || d.id || d?.data?.jid || d?.data?.wid;
  if (jid) return true;
  return null; // unknown
}

async function tryCandidates({ base, headersToken, headersAuth, token, instanceName, number, type }) {
  const httpsAgent = new https.Agent({ rejectUnauthorized: false });
  const candidates = [];
  const hToken = headersToken || {};
  const hAuth = headersAuth || {};

  if (type === 'wuzapi') {
    const baseNoAdmin = base.replace(/\/admin$/i, '');
    candidates.push(
      { method: 'GET', url: `${baseNoAdmin}/contacts/check`, headers: { ...hToken } },
      { method: 'POST', url: `${baseNoAdmin}/contacts/check`, headers: { ...hToken }, data: { number } },
      { method: 'GET', url: `${baseNoAdmin}/users/${token}/contact/check?number=${number}`, headers: { ...hAuth } },
      { method: 'POST', url: `${baseNoAdmin}/users/${token}/contact/check`, headers: { ...hAuth }, data: { number } },
      { method: 'GET', url: `${baseNoAdmin}/users/${token}/contacts/find?number=${number}`, headers: { ...hAuth } },
      { method: 'GET', url: `${baseNoAdmin}/contacts/find?number=${number}`, headers: { ...hToken } },
    );
  } else if (type === 'evolution') {
    candidates.push(
      { method: 'GET', url: `${base}/contacts/check/${instanceName}?number=${number}`, headers: { ...hAuth } },
      { method: 'POST', url: `${base}/contacts/check/${instanceName}`, headers: { ...hAuth }, data: { number } },
      { method: 'GET', url: `${base}/contacts/find/${instanceName}?number=${number}`, headers: { ...hAuth } },
      { method: 'GET', url: `${base}/contact/find/${instanceName}?number=${number}`, headers: { ...hAuth } },
      { method: 'POST', url: `${base}/contact/check/${instanceName}`, headers: { ...hAuth }, data: { number } },
    );
  }

  for (const c of candidates) {
    try {
      const resp = await axios({ ...c, timeout: 15000, httpsAgent });
      const exists = parseExists(resp.data);
      if (exists !== null) {
        return { exists, raw: resp.data, endpoint: c.url, method: c.method };
      }
    } catch (err) {
      const code = err?.response?.status;
      // Continue trying other endpoints on 404/400/401
      if (![400, 401, 403, 404, 422].includes(code || 0)) {
        // For server errors, still continue to next candidate
      }
    }
  }
  return { exists: null, raw: null, endpoint: null, method: null };
}

router.post('/whatsapp', async (req, res) => {
  const { serverId, token, instanceName, items } = req.body || {};
  if (!serverId || !Array.isArray(items)) {
    return res.status(400).json({ success: false, message: 'serverId e items (array) são obrigatórios' });
  }

  try {
    const [[server]] = await pool.query('SELECT * FROM servers WHERE id = ?', [serverId]);
    if (!server) {
      return res.status(404).json({ success: false, message: 'Servidor não encontrado' });
    }
    const type = String(server.type);
    if (!['wuzapi', 'evolution'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Servidor deve ser do tipo wuzapi ou evolution' });
    }

    const normalized = String(server.url).trim().replace(/\/+$/, '');
    const base = normalized;

    const hasBearer = /^bearer\s/i.test(server.apiKey);
    const authHeader = hasBearer ? server.apiKey : `Bearer ${server.apiKey}`;

    const headersToken = token ? { token, Accept: 'application/json', 'Content-Type': 'application/json' } : { Accept: 'application/json' };
    const headersAuth = type === 'wuzapi' ? { Authorization: authHeader, Accept: 'application/json', 'Content-Type': 'application/json' } : { apikey: server.apiKey, Accept: 'application/json', 'Content-Type': 'application/json' };

    const total = items.length;
    const max = 10000;
    if (total > max) {
      return res.status(413).json({ success: false, message: `Limite de ${max} registros por upload excedido`, total });
    }

    const results = [];
    let whatsappYes = 0, whatsappNo = 0, unknown = 0, errors = 0, validFormat = 0;

    const chunkSize = 25;
    for (let i = 0; i < items.length; i += chunkSize) {
      const slice = items.slice(i, i + chunkSize);
      const promises = slice.map(async (item) => {
        const name = item?.name ?? item?.Nome ?? item?.nome ?? '';
        const date = item?.date ?? item?.DataCadastro ?? item?.data_cadastro ?? item?.Data_Cadastro ?? '';
        const rawNumber = item?.number ?? item?.Numero ?? item?.Número ?? item?.mobile ?? item?.telefone ?? item?.phone ?? '';
        const number = normalizeNumber(rawNumber);
        const fmtValid = /^[1-9][0-9]{7,15}$/.test(number);
        if (fmtValid) validFormat++;

        if (!fmtValid) {
          results.push({ input: item, number, name, date, exists: null, status: 'invalid_format' });
          return;
        }

        try {
          const out = await tryCandidates({ base, headersToken, headersAuth, token, instanceName, number, type });
          if (out.exists === true) {
            whatsappYes++;
            results.push({ input: item, number, name, date, exists: true, endpoint: out.endpoint, method: out.method, status: 'ok' });
          } else if (out.exists === false) {
            whatsappNo++;
            results.push({ input: item, number, name, date, exists: false, endpoint: out.endpoint, method: out.method, status: 'ok' });
          } else {
            unknown++;
            results.push({ input: item, number, name, date, exists: null, endpoint: out.endpoint, method: out.method, status: 'unknown' });
          }
        } catch (err) {
          errors++;
          results.push({ input: item, number, name, date, exists: null, error: err?.message || 'erro', status: 'error' });
        }
      });
      await Promise.all(promises);
    }

    return res.json({
      success: true,
      total,
      validFormat,
      whatsappYes,
      whatsappNo,
      unknown,
      errors,
      results,
    });
  } catch (error) {
    const status = error?.response?.status || 500;
    const message = error?.response?.data?.message || error.message || 'Erro ao validar números';
    return res.status(status).json({ success: false, status, message, data: error?.response?.data });
  }
});

module.exports = router;
