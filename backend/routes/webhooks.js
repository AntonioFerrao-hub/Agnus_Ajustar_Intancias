const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const pool = require('../db');

// Initialize table (create if not exists)
router.post('/init', async (req, res) => {
  let connection;
  try {
    connection = await pool.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        url VARCHAR(512) NOT NULL,
        status ENUM('active','inactive','error') DEFAULT 'active',
        events TEXT,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastTriggered TIMESTAMP NULL
      );
    `);
    res.json({ message: 'Tabela webhooks verificada/criada com sucesso.' });
  } catch (error) {
    console.error('Erro ao inicializar tabela webhooks:', error);
    res.status(500).json({ message: error.message });
  } finally {
    if (connection) connection.release();
  }
});

// List all webhooks
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM webhooks ORDER BY createdAt DESC');
    const data = rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      url: row.url,
      events: row.events ? JSON.parse(row.events) : [],
      status: row.status || 'active',
      createdAt: row.createdAt,
      lastTriggered: row.lastTriggered || null,
    }));
    res.json(data);
  } catch (error) {
    console.error('Erro ao listar webhooks:', error);
    res.status(500).json({ message: error.message });
  }
});

// Create a webhook
router.post('/', async (req, res) => {
  const { name, description, url, status = 'active', events = [] } = req.body;
  const id = uuidv4();
  try {
    await pool.query(
      'INSERT INTO webhooks (id, name, description, url, status, events) VALUES (?, ?, ?, ?, ?, ?)',
      [id, name, description || null, url, status, JSON.stringify(events)]
    );
    const [[row]] = await pool.query('SELECT * FROM webhooks WHERE id = ?', [id]);
    const data = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      url: row.url,
      events: row.events ? JSON.parse(row.events) : [],
      status: row.status || 'active',
      createdAt: row.createdAt,
      lastTriggered: row.lastTriggered || null,
    };
    res.status(201).json(data);
  } catch (error) {
    console.error('Erro ao criar webhook:', error);
    res.status(500).json({ message: error.message });
  }
});

// Update a webhook
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name, description, url, status, events } = req.body;
  try {
    const [result] = await pool.query(
      'UPDATE webhooks SET name = ?, description = ?, url = ?, status = ?, events = ? WHERE id = ?',
      [name, description || null, url, status, JSON.stringify(events || []), id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    const [[row]] = await pool.query('SELECT * FROM webhooks WHERE id = ?', [id]);
    const data = {
      id: row.id,
      name: row.name,
      description: row.description || '',
      url: row.url,
      events: row.events ? JSON.parse(row.events) : [],
      status: row.status || 'active',
      createdAt: row.createdAt,
      lastTriggered: row.lastTriggered || null,
    };
    res.json(data);
  } catch (error) {
    console.error('Erro ao atualizar webhook:', error);
    res.status(500).json({ message: error.message });
  }
});

// Delete a webhook
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await pool.query('DELETE FROM webhooks WHERE id = ?', [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Webhook não encontrado' });
    }
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir webhook:', error);
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;