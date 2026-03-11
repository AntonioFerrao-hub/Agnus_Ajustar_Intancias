const express = require('express');
const router = express.Router();
const pool = require('../db');

// Garante que a tabela exista (sem transformação de dados)
async function ensureTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS clientes_validacao (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      mobile VARCHAR(64) NOT NULL,
      valor VARCHAR(64) NULL,
      CPF_Disparo VARCHAR(64) NULL,
      status VARCHAR(32) NULL,
      whatsapp_existe TINYINT(1) NULL,
      validado_em DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_mobile (mobile)
    );
  `);
}

// Importa somente a lista de clientes, mantendo os valores exatamente como recebidos
router.post('/clientes', async (req, res) => {
  const { rows } = req.body || {};
  if (!Array.isArray(rows)) {
    return res.status(400).json({ success: false, message: 'rows (array) é obrigatório' });
  }

  // Valida cabeçalhos esperados sem alterar dados
  const requiredKeys = ['name', 'mobile', 'valor', 'CPF_Disparo'];
  const invalid = rows.find(r => requiredKeys.some(k => !(k in r)));
  if (invalid) {
    return res.status(422).json({ success: false, message: 'Cada linha deve conter os campos: name, mobile, valor, CPF_Disparo' });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await ensureTable(connection);
    await connection.beginTransaction();

    // Insere sem qualquer transformação de conteúdo
    for (const r of rows) {
      await connection.query(
        `INSERT INTO clientes_validacao (name, mobile, valor, CPF_Disparo) VALUES (?,?,?,?)`,
        [r.name, r.mobile, r.valor, r.CPF_Disparo]
      );
    }

    await connection.commit();
    return res.json({ success: true, inserted: rows.length });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch {}
    }
    const status = error?.response?.status || 500;
    const message = error?.message || 'Erro ao importar a lista de clientes';
    return res.status(status).json({ success: false, message });
  } finally {
    if (connection) connection.release();
  }
});

// Listagem de clientes carregados, com filtros e ordenação
router.get('/clientes', async (req, res) => {
  const {
    search = '',
    status = '',
    wa = '',
    created_from = '',
    created_to = '',
    validated_from = '',
    validated_to = '',
    sort = 'created_at',
    order = 'desc',
    limit = '25',
    offset = '0',
  } = req.query || {};

  const allowedSort = new Set(['name','mobile','valor','CPF_Disparo','status','whatsapp_existe','validado_em','created_at','updated_at']);
  const sortBy = allowedSort.has(String(sort)) ? String(sort) : 'created_at';
  const sortOrder = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
  const lim = Math.max(1, Math.min(100, parseInt(String(limit), 10) || 25));
  const off = Math.max(0, parseInt(String(offset), 10) || 0);

  let where = 'WHERE 1=1';
  const params = [];
  if (search) {
    where += ' AND (name LIKE ? OR mobile LIKE ? OR CPF_Disparo LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  if (wa === '1' || wa === '0') {
    where += ' AND whatsapp_existe = ?';
    params.push(parseInt(wa, 10));
  }

  // Filtros de intervalo de datas (criado/validado)
  const isDate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);
  if (isDate(created_from)) {
    where += ' AND created_at >= ?';
    params.push(`${created_from} 00:00:00`);
  }
  if (isDate(created_to)) {
    where += ' AND created_at <= ?';
    params.push(`${created_to} 23:59:59`);
  }
  const hasValidatedRange = isDate(validated_from) || isDate(validated_to);
  if (hasValidatedRange) {
    where += ' AND validado_em IS NOT NULL';
  }
  if (isDate(validated_from)) {
    where += ' AND validado_em >= ?';
    params.push(`${validated_from} 00:00:00`);
  }
  if (isDate(validated_to)) {
    where += ' AND validado_em <= ?';
    params.push(`${validated_to} 23:59:59`);
  }

  let connection;
  try {
    connection = await pool.getConnection();
    const [[countRow]] = await connection.query(`SELECT COUNT(*) AS total FROM clientes_validacao ${where}`, params);
    const [rows] = await connection.query(
      `SELECT id, name, mobile, valor, CPF_Disparo, status, whatsapp_existe, validado_em, created_at, updated_at
       FROM clientes_validacao ${where}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...params, lim, off]
    );
    res.json({ success: true, total: countRow.total || 0, rows });
  } catch (error) {
    const statusCode = 500;
    res.status(statusCode).json({ success: false, message: error?.message || 'Erro ao listar clientes' });
  } finally {
    if (connection) connection.release();
  }
});

module.exports = router;

