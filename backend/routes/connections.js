const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const wuzapiService = require('../services/wuzapiService');
const evolutionService = require('../services/evolutionService');

// Util para normalizar identificadores (remover acentos, espaços e caracteres inválidos)
function normalizeIdentifier(str) {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacríticos
    .replace(/\s+/g, '_') // espaços para underscore
    .replace(/[^A-Za-z0-9_]/g, '_') // apenas letras, números e underscore
    .toLowerCase();
}

// Garante compatibilidade do schema da tabela connections
async function ensureConnectionsSchema() {
  try {
    // Cria tabela caso não exista (compatível com create-tables.js)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(255),
        type ENUM('evolution','wuzapi'),
        status VARCHAR(50),
        phone VARCHAR(30),
        profileName VARCHAR(255),
        profilePicture TEXT,
        qrCode TEXT,
        token VARCHAR(255),
        instanceName VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastActivity TIMESTAMP NULL,
        webhook TEXT,
        server_id VARCHAR(36)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);

    // Adiciona coluna rawData para armazenar todos os campos vindos da API
    try {
      await pool.query('ALTER TABLE connections ADD COLUMN rawData LONGTEXT NULL');
    } catch (e) {
      // Ignora erro de coluna já existente
    }

    // Adiciona coluna exportBatchId para vincular exportações por data/servidor
    try {
      await pool.query('ALTER TABLE connections ADD COLUMN exportBatchId VARCHAR(36) NULL');
    } catch (e) {
      // Ignora erro de coluna já existente
    }
  } catch (err) {
    console.error('Erro ao garantir schema de connections:', err.message);
  }
}

// Dispara verificação/ajuste de schema ao carregar o router
ensureConnectionsSchema();

// Garante tabela de snapshots de exportação (por servidor/data)
async function ensureConnectionExportsSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS connection_exports (
        id VARCHAR(36) PRIMARY KEY,
        server_id VARCHAR(36) NOT NULL,
        type ENUM('evolution','wuzapi') NOT NULL,
        exported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        item_count INT DEFAULT 0
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `);
  } catch (err) {
    console.error('Erro ao garantir schema de connection_exports:', err.message);
  }
}

// Dispara verificação/ajuste de schema ao carregar o router
ensureConnectionExportsSchema();

// GET all connections
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM connections');
    
    // Transform the data to match frontend expectations
    const connections = rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      phone: row.phone,
      token: row.token,
      instanceName: row.instanceName,
      webhook: row.webhook,
      serverId: row.server_id, // Transform server_id to serverId
      status: row.status || 'disconnected',
      createdAt: row.created_at || row.createdAt,
      exportBatchId: row.exportBatchId || row.export_batch_id || null
    }));
    
    res.json(connections);
  } catch (error) {
    console.error('Erro ao buscar conexões:', error);
    res.status(500).json({ message: error.message });
  }
});

// Lista snapshots de exportação
router.get('/exports', async (req, res) => {
  try {
    const { serverId, type } = req.query;

    let sql = 'SELECT id, server_id, type, exported_at, item_count FROM connection_exports';
    const params = [];
    const where = [];

    if (serverId) {
      where.push('server_id = ?');
      params.push(serverId);
    }
    if (type) {
      where.push('type = ?');
      params.push(type);
    }

    if (where.length > 0) {
      sql += ' WHERE ' + where.join(' AND ');
    }
    sql += ' ORDER BY exported_at DESC';

    const [rows] = await pool.query(sql, params);
    const snapshots = rows.map(row => ({
      id: row.id,
      batchId: row.id,
      serverId: row.server_id,
      type: row.type,
      exportedAt: row.exported_at,
      itemCount: row.item_count || 0,
    }));

    res.json(snapshots);
  } catch (error) {
    console.error('Erro ao listar snapshots de exportação:', error);
    res.status(500).json({ message: error.message });
  }
});

// Exporta em lote conexões vindas das APIs online para o banco
router.post('/export', async (req, res) => {
  const { type, serverId, items, batchId: bodyBatchId, exportDate } = req.body || {};
  if (!type || !['evolution', 'wuzapi'].includes(type)) {
    return res.status(400).json({ message: 'Tipo inválido. Use "evolution" ou "wuzapi".' });
  }
  if (!serverId) {
    return res.status(400).json({ message: 'serverId é obrigatório.' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'items deve ser um array com pelo menos um elemento.' });
  }

  await ensureConnectionsSchema();
  await ensureConnectionExportsSchema();

  // Identificador do lote de exportação por servidor/data
  const batchId = bodyBatchId || uuidv4();
  const exportedAt = exportDate ? new Date(exportDate) : new Date();

  // Mapeia status das diferentes APIs para nosso domínio
  const normalizeStatus = (raw) => {
    const s = String(raw || '').toLowerCase();
    if (['open', 'connected', 'online', 'conectada'].includes(s)) return 'connected';
    if (['connecting', 'conectando'].includes(s)) return 'connecting';
    if (['closed', 'close', 'disconnected', 'offline', 'erro', 'error', 'desconectada'].includes(s)) return 'disconnected';
    return 'disconnected';
  };

  // Constrói registro compatível com tabela a partir de item Evolution
  const fromEvolution = (item) => {
    const status = normalizeStatus(item.connectionStatus ?? item.status);
    return {
      name: item.name || item.instanceName || item.profileName || '',
      type: 'evolution',
      status,
      phone: item.number || item.phone || null,
      profileName: item.profileName || null,
      profilePicture: item.profilePicUrl || item.profilePic || null,
      qrCode: item.qrcode || null,
      token: item.token || null,
      instanceName: item.name || item.instanceName || null,
    };
  };

  // Constrói registro compatível com tabela a partir de item WUZAPI
  const fromWuzapi = (item) => {
    const status = (item.connected && item.loggedIn) ? 'connected' : (item.connected ? 'connecting' : 'disconnected');
    return {
      name: item.name || item.token || '',
      type: 'wuzapi',
      status,
      phone: item.phone || null,
      profileName: item.name || null,
      profilePicture: null,
      qrCode: item.qrcode || null,
      token: item.token || null,
      instanceName: item.token || null,
    };
  };

  const results = [];
  let inserted = 0;
  let updated = 0;

  for (const raw of items) {
    const mapped = type === 'evolution' ? fromEvolution(raw) : fromWuzapi(raw);
    const rawData = JSON.stringify(raw);

    // Tenta localizar conexão existente por token/instanceName/name dentro do mesmo servidor
    let existingId = null;
    try {
      const [rows] = await pool.query(
        `SELECT id FROM connections 
         WHERE server_id = ? AND (
           (token IS NOT NULL AND token = ?) OR 
           (instanceName IS NOT NULL AND instanceName = ?) OR 
           (name IS NOT NULL AND name = ?)
         ) 
         LIMIT 1`,
        [serverId, mapped.token || null, mapped.instanceName || null, mapped.name || null]
      );
      if (rows && rows.length > 0) {
        existingId = rows[0].id;
      }
    } catch (findErr) {
      console.error('Erro ao buscar conexão existente:', findErr.message);
    }

    if (existingId) {
      // Atualiza registro
      try {
        await pool.query(
          `UPDATE connections SET 
             name = ?, type = ?, status = ?, phone = ?, profileName = ?, profilePicture = ?,
             qrCode = ?, token = ?, instanceName = ?, lastActivity = NOW(), webhook = ?, rawData = ?, exportBatchId = ?
           WHERE id = ?`,
          [
            mapped.name, mapped.type, mapped.status, mapped.phone, mapped.profileName, mapped.profilePicture,
            mapped.qrCode, mapped.token, mapped.instanceName, null, rawData, batchId, existingId
          ]
        );
        updated++;
        results.push({ id: existingId, action: 'updated', name: mapped.name });
      } catch (updErr) {
        console.error('Erro ao atualizar conexão:', updErr.message);
        results.push({ id: existingId, action: 'error', error: updErr.message, name: mapped.name });
      }
    } else {
      // Insere novo registro
      const id = uuidv4();
      try {
        await pool.query(
          `INSERT INTO connections 
            (id, name, type, status, phone, profileName, profilePicture, qrCode, token, instanceName, server_id, createdAt, lastActivity, webhook, rawData, exportBatchId)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW(), ?, ?, ?)`,
          [
            id, mapped.name, mapped.type, mapped.status, mapped.phone, mapped.profileName, mapped.profilePicture,
            mapped.qrCode, mapped.token, mapped.instanceName, serverId, null, rawData, batchId
          ]
        );
        inserted++;
        results.push({ id, action: 'inserted', name: mapped.name });
      } catch (insErr) {
        console.error('Erro ao inserir conexão:', insErr.message);
        results.push({ id, action: 'error', error: insErr.message, name: mapped.name });
      }
    }
  }

  // Registra/atualiza snapshot de exportação por servidor/data
  try {
    await pool.query(
      `INSERT INTO connection_exports (id, server_id, type, exported_at, item_count)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE item_count = item_count + VALUES(item_count)`,
      [batchId, serverId, type, exportedAt, items.length]
    );
  } catch (snapErr) {
    console.error('Erro ao registrar snapshot de exportação:', snapErr.message);
  }

  return res.json({ inserted, updated, results, batchId });
});

// GET QR Code for a specific connection
router.get('/:id/qrcode', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await pool.query('SELECT * FROM connections WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: 'Connection not found' });
    }
    const conn = rows[0];

    const [serverRows] = await pool.query('SELECT * FROM servers WHERE id = ?', [conn.server_id]);
    if (!serverRows || serverRows.length === 0) {
      return res.status(404).json({ message: 'Server not found for this connection' });
    }
    const server = serverRows[0];

    let base64;
    if (conn.type === 'evolution') {
      evolutionService.setServerConfig(conn.server_id, server.url, server.apiKey);
      base64 = await evolutionService.getQRCode(conn.server_id, conn.instanceName);
    } else if (conn.type === 'wuzapi') {
      wuzapiService.setServerConfig(conn.server_id, server.url, server.apiKey);
      base64 = await wuzapiService.getQRCode(conn.server_id, conn.token);
    } else {
      return res.status(400).json({ message: 'Unsupported connection type for QR Code' });
    }

    const dataUrl = `data:image/png;base64,${base64}`;
    res.json({ qrCode: dataUrl });
  } catch (error) {
    console.error('Erro ao obter QR Code:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST a new connection
router.post('/', async (req, res) => {
    const { 
      name, type, phone, token, instanceName, webhook, serverId, server_id, status,
      // Evolution flags (opcionais)
      qrcode, integration,
      rejectCall, msgCall, groupsIgnore, alwaysOnline, readMessages, readStatus, syncFullHistory,
      proxyHost, proxyPort, proxyProtocol, proxyUsername, proxyPassword
    } = req.body;
    const id = uuidv4();

    // Normaliza valores booleanos vindos como string ("true"/"false") ou outros tipos
    const normalizeBoolean = (val, defaultValue) => {
        if (val === undefined || val === null || val === '') return defaultValue;
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') {
            const v = val.trim().toLowerCase();
            if (v === 'true') return true;
            if (v === 'false') return false;
        }
        if (typeof val === 'number') return val !== 0; // 0 -> false, qualquer outro -> true
        return !!val;
    };
    
    // Use serverId if provided, otherwise use server_id for backward compatibility
    const finalServerId = serverId || server_id;
    
    if (!finalServerId) {
        return res.status(400).json({ message: 'Server ID is required' });
    }
    
    try {
        // Get server configuration
        const [serverRows] = await pool.query('SELECT * FROM servers WHERE id = ?', [finalServerId]);
        if (serverRows.length === 0) {
            return res.status(404).json({ message: 'Server not found' });
        }
        
        const server = serverRows[0];
        console.log(`Creating ${type} connection on server:`, server.name);
        
        let apiResponse = null;
        let finalToken = token;
        let finalInstanceName = instanceName;
        let finalName = name;
        let qrCode = null;
        
        // Create instance/user on the respective API
        if (type === 'wuzapi') {
            // Configure WUZAPI service
            wuzapiService.setServerConfig(finalServerId, server.url, server.apiKey);
            
            // Normalizar nome/token conforme regras: igual ao nome, sem acento, >= 10 chars
            const normalized = normalizeIdentifier(name);
            if (!normalized || normalized.length < 10) {
                return res.status(400).json({ 
                  message: 'Nome/token WUZAPI deve ter pelo menos 10 caracteres, sem acentos.'
                });
            }
            finalName = normalized;
            finalToken = normalized;
            
            // Create user on WUZAPI
            try {
                apiResponse = await wuzapiService.createUser(finalServerId, {
                    name: finalName,
                    token: finalToken,
                    webhook: webhook || '',
                    events: 'All'
                });
                
                console.log('WUZAPI user created:', apiResponse);
                
                // Try to get QR code
                try {
                    qrCode = await wuzapiService.getQRCode(finalServerId, finalToken);
                } catch (qrError) {
                    console.log('QR code not available yet:', qrError.message);
                }
                
            } catch (apiError) {
                console.error('Error creating WUZAPI user:', apiError.message);
                // Se o usuário já existir (409), prosseguir buscando o usuário e continuar
                if (apiError.message.includes('409')) {
                    console.log('WUZAPI user already exists, continuing with existing user.');
                    try {
                        apiResponse = await wuzapiService.getUserByToken(finalServerId, finalToken);
                        // Tentar obter QR Code mesmo assim
                        try {
                            qrCode = await wuzapiService.getQRCode(finalServerId, finalToken);
                        } catch (qrError) {
                            console.log('QR code not available yet for existing user:', qrError.message);
                        }
                    } catch (getErr) {
                        console.error('Failed to fetch existing WUZAPI user:', getErr.message);
                        return res.status(500).json({ 
                            message: `Failed to create or fetch WUZAPI user: ${getErr.message}` 
                        });
                    }
                } else {
                    return res.status(500).json({ 
                        message: `Failed to create WUZAPI user: ${apiError.message}` 
                    });
                }
            }
            
        } else if (type === 'evolution') {
            // Configure Evolution service
            evolutionService.setServerConfig(finalServerId, server.url, server.apiKey);
            
            // Generate instance name if not provided
            if (!finalInstanceName) {
                finalInstanceName = name.toLowerCase().replace(/\s+/g, '-');
            }
            
            // Create instance on Evolution API
            try {
                // Default events when webhook estiver ativo
                const defaultEvents = [
                  'APPLICATION_STARTUP',
                  'QRCODE_UPDATED',
                  'CONNECTION_UPDATE',
                  'MESSAGES_UPSERT'
                ];

                // Monta payload Evolution, incluindo number e integração padrão
                const evolutionPayload = {
                  instanceName: finalInstanceName,
                  token: finalToken,
                  number: phone, // mapeia número do WhatsApp
                  integration: integration || 'WHATSAPP-BAILEYS',
                  // Default para true quando não informado; aceita "false" string corretamente
                  qrcode: normalizeBoolean(qrcode, true),
                };

                // Acrescenta flags de comportamento quando fornecidas
                const extras = {
                  // Normaliza booleans para garantir envio correto à Evolution API
                  rejectCall: normalizeBoolean(rejectCall, undefined),
                  msgCall,
                  groupsIgnore: normalizeBoolean(groupsIgnore, undefined),
                  alwaysOnline: normalizeBoolean(alwaysOnline, undefined),
                  readMessages: normalizeBoolean(readMessages, undefined),
                  readStatus: normalizeBoolean(readStatus, undefined),
                  syncFullHistory: normalizeBoolean(syncFullHistory, undefined),
                  proxyHost,
                  proxyPort,
                  proxyProtocol,
                  proxyUsername,
                  proxyPassword,
                };
                Object.keys(extras).forEach((key) => {
                  const value = extras[key];
                  if (value !== undefined && value !== null && value !== '') {
                    evolutionPayload[key] = value;
                  }
                });

                // Monta webhook avançado quando fornecido
                if (webhook) {
                  if (typeof webhook === 'object' && webhook.url) {
                    // Já vem estruturado do cliente
                    evolutionPayload.webhook = {
                      url: webhook.url,
                      byEvents: webhook.byEvents === true,
                      base64: webhook.base64 === true,
                      headers: webhook.headers || {},
                      events: Array.isArray(webhook.events) ? webhook.events : defaultEvents,
                    };
                  } else if (typeof webhook === 'string') {
                    // Constrói estrutura padrão a partir de URL simples
                    evolutionPayload.webhook = {
                      url: webhook,
                      byEvents: true,
                      base64: true,
                      headers: { 'Content-Type': 'application/json' },
                      events: defaultEvents,
                    };
                  }
                }

                apiResponse = await evolutionService.createInstance(finalServerId, evolutionPayload);
                
                console.log('Evolution instance created:', apiResponse);
                
                // Try to get QR code
                try {
                    qrCode = await evolutionService.getQRCode(finalServerId, finalInstanceName);
                } catch (qrError) {
                    console.log('QR code not available yet:', qrError.message);
                }
                
            } catch (apiError) {
                console.error('Error creating Evolution instance:', apiError.message);
                return res.status(500).json({ 
                    message: `Failed to create Evolution instance: ${apiError.message}` 
                });
            }
        }
        
        // Save to database
        const [result] = await pool.query(
            'INSERT INTO connections (id, name, type, phone, token, instanceName, webhook, server_id, status, qrCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
            [id, finalName, type, phone, finalToken, finalInstanceName, webhook, finalServerId, status || 'connecting', qrCode]
        );
        
        // Return the created connection with proper field names
        const createdConnection = {
            id,
            name: finalName,
            type,
            phone,
            token: finalToken,
            instanceName: finalInstanceName,
            webhook,
            serverId: finalServerId,
            status: status || 'connecting',
            qrCode,
            createdAt: new Date().toISOString(),
            apiResponse // Include API response for debugging
        };
        
        res.status(201).json(createdConnection);
    } catch (error) {
        console.error('Erro ao criar conexão:', error);
        res.status(500).json({ message: error.message });
    }
});

// PUT to update a connection
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, type, phone, token, instanceName, webhook, serverId, server_id, status } = req.body;
    
    // Use serverId if provided, otherwise use server_id for backward compatibility
    const finalServerId = serverId || server_id;
    
    try {
        const [result] = await pool.query(
            'UPDATE connections SET name = ?, type = ?, phone = ?, token = ?, instanceName = ?, webhook = ?, server_id = ?, status = ? WHERE id = ?',
            [name, type, phone, token, instanceName, webhook, finalServerId, status, id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Connection not found' });
        }
        
        // Return the updated connection with proper field names
        const updatedConnection = {
            id,
            name,
            type,
            phone,
            token,
            instanceName,
            webhook,
            serverId: finalServerId,
            status
        };
        
        res.json(updatedConnection);
    } catch (error) {
        console.error('Erro ao atualizar conexão:', error);
        res.status(500).json({ message: error.message });
    }
});

// DELETE a connection
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await pool.query('DELETE FROM connections WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Connection not found' });
        }
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});


module.exports = router;