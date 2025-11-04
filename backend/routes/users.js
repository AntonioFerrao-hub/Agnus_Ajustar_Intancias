const express = require('express');
const router = express.Router();
const pool = require('../db');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, originalHash] = stored.split(':');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

async function ensureUserSchema() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role ENUM('admin', 'user') DEFAULT 'user',
        token VARCHAR(255),
        passwordHash VARCHAR(255),
        permissions TEXT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastLogin TIMESTAMP NULL,
        active BOOLEAN DEFAULT true
      );
    `);
    const [cols] = await pool.query(`SHOW COLUMNS FROM users LIKE 'passwordHash'`);
    if (!cols || cols.length === 0) {
      try { await pool.query(`ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255)`); } catch {}
    }
    // Ensure permissions column exists
    try { await pool.query(`ALTER TABLE users ADD COLUMN permissions TEXT NULL`); } catch {}
    // Try to simplify role enum; ignore errors if not needed
    try { await pool.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin','user') DEFAULT 'user'`); } catch {}
  } catch (e) {
    // Best-effort; if fails, routes will likely fail too
  }
}

// Listar usuários
router.get('/', async (req, res) => {
  try {
    await ensureUserSchema();
    const [rows] = await pool.query('SELECT id, name, email, role, permissions, createdAt, lastLogin, active FROM users ORDER BY createdAt DESC');
    const users = rows.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      permissions: (() => { try { return u.permissions ? JSON.parse(u.permissions) : null; } catch { return null; } })(),
      createdAt: u.createdAt,
      lastActive: u.lastLogin,
      status: u.active ? 'active' : 'inactive',
    }));
    res.json(users);
  } catch (error) {
    console.error('Erro ao listar usuários:', error);
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// Criar usuário
router.post('/', async (req, res) => {
  try {
    await ensureUserSchema();
    const { name, email, password, passwordConfirm, role, permissions } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' });
    }
    if (passwordConfirm !== undefined && password !== passwordConfirm) {
      return res.status(400).json({ error: 'Senha e confirmação não coincidem' });
    }
    const userRole = role === 'admin' ? 'admin' : 'user';

    // Verificar email duplicado
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email já cadastrado' });
    }

    const id = uuidv4();
    const passwordHash = hashPassword(password);

    await pool.query(
      `INSERT INTO users (id, name, email, role, passwordHash, permissions, createdAt, active)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), true)`,
      [id, name, email, userRole, passwordHash, Array.isArray(permissions) ? JSON.stringify(permissions) : null]
    );

    res.status(201).json({ id, name, email, role: userRole, permissions: Array.isArray(permissions) ? permissions : null, createdAt: new Date(), status: 'active' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// Atualizar usuário
router.put('/:id', async (req, res) => {
  try {
    await ensureUserSchema();
    const { id } = req.params;
    const { name, email, role, password, passwordConfirm, active, permissions } = req.body;

    const fields = [];
    const values = [];

    if (name) { fields.push('name = ?'); values.push(name); }
    if (email) { fields.push('email = ?'); values.push(email); }
    if (role) { fields.push('role = ?'); values.push(role === 'admin' ? 'admin' : 'user'); }
    if (typeof active === 'boolean') { fields.push('active = ?'); values.push(active); }
    if (password) {
      if (passwordConfirm !== undefined && password !== passwordConfirm) {
        return res.status(400).json({ error: 'Senha e confirmação não coincidem' });
      }
      fields.push('passwordHash = ?');
      values.push(hashPassword(password));
    }
    if (Array.isArray(permissions)) { fields.push('permissions = ?'); values.push(JSON.stringify(permissions)); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    values.push(id);
    const sql = `UPDATE users SET ${fields.join(', ')}, lastLogin = lastLogin WHERE id = ?`;
    await pool.query(sql, values);

    const [rows] = await pool.query('SELECT id, name, email, role, permissions, createdAt, lastLogin, active FROM users WHERE id = ?', [id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    const u = rows[0];
    let perms = null;
    try { perms = u.permissions ? JSON.parse(u.permissions) : null; } catch { perms = null; }
    res.json({ id: u.id, name: u.name, email: u.email, role: u.role, permissions: perms, createdAt: u.createdAt, lastActive: u.lastLogin, status: u.active ? 'active' : 'inactive' });
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// Excluir usuário
router.delete('/:id', async (req, res) => {
  try {
    await ensureUserSchema();
    const { id } = req.params;
    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.status(204).send();
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;