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
      createdAt: row.created_at || row.createdAt
    }));
    
    res.json(connections);
  } catch (error) {
    console.error('Erro ao buscar conexões:', error);
    res.status(500).json({ message: error.message });
  }
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