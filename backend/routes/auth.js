const express = require('express');
const router = express.Router();
const pool = require('../db');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

function verifyPassword(password, stored) {
  if (!stored) return false;
  const [salt, originalHash] = stored.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function signToken(payload) {
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  // 8h expiration by default
  return jwt.sign(payload, secret, { expiresIn: '8h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token ausente' });
  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  try {
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const [rows] = await pool.query(
      'SELECT id, name, email, role, permissions, passwordHash, active FROM users WHERE email = ? LIMIT 1',
      [email]
    );
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Credenciais inválidas' });
    }
    const user = rows[0];
    if (!user.active) return res.status(403).json({ error: 'Usuário inativo' });

    const ok = verifyPassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Credenciais inválidas' });

    const token = signToken({ sub: user.id, email: user.email, role: user.role });
    await pool.query('UPDATE users SET lastLogin = NOW() WHERE id = ?', [user.id]);

    let perms = null;
    try { perms = user.permissions ? JSON.parse(user.permissions) : null; } catch { perms = null; }
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, permissions: perms }
    });
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro ao efetuar login' });
  }
});

// POST /api/auth/change-password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Senha atual e nova senha são obrigatórias' });
    }

    const userId = req.user?.sub;
    const [rows] = await pool.query(
      'SELECT id, passwordHash FROM users WHERE id = ? LIMIT 1',
      [userId]
    );
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Usuário não encontrado' });

    const user = rows[0];
    const ok = verifyPassword(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Senha atual incorreta' });

    // Reuse hash function from users route logic here
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync(newPassword, salt, 64).toString('hex');
    const passwordHash = `${salt}:${hash}`;

    await pool.query('UPDATE users SET passwordHash = ? WHERE id = ?', [passwordHash, userId]);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro ao alterar senha' });
  }
});

module.exports = router;