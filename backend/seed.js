const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const servers = [
  {
    name: 'Servidor Principal',
    type: 'evolution',
    url: 'http://localhost:8080',
    apiKey: 'your-api-key',
    description: 'Servidor de desenvolvimento principal',
    status: 'offline',
    isActive: true,
    isDefault: true,
  },
  {
    name: 'Servidor de Testes',
    type: 'wuzapi',
    url: 'http://localhost:8081',
    apiKey: 'your-api-key-2',
    description: 'Servidor para testes de integração',
    status: 'offline',
    isActive: true,
    isDefault: false,
  },
    {
    name: 'Servidor de Produção',
    type: 'evolution',
    url: 'http://localhost:8082',
    apiKey: 'your-api-key-3',
    description: 'Servidor de produção',
    status: 'offline',
    isActive: true,
    isDefault: false,
  }
];

async function seed() {
  let connection;
  try {
    connection = await db.getConnection();
    console.log('Conectado ao banco de dados para semear.');

    await connection.query('DELETE FROM servers');
    console.log('Tabela de servidores limpa.');

    for (const server of servers) {
      const serverWithId = { id: uuidv4(), ...server };
      await connection.query('INSERT INTO servers SET ?', serverWithId);
    }

    console.log('Banco de dados semeado com sucesso!');
  } catch (error) {
    console.error('Erro ao semear o banco de dados:', error);
  } finally {
    if (connection) {
      connection.release();
      console.log('Conexão com o banco de dados liberada.');
    }
    // Ensure the pool is closed after seeding
    if (db.pool) {
      await db.pool.end();
      console.log('Pool de conexões fechado.');
    }
  }
}

seed();