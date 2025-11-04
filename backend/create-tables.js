const pool = require('./db');

const createTables = async () => {
  const connection = await pool.getConnection();
  try {
    console.log('Criando tabelas...');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('evolution', 'wuzapi') NOT NULL,
        url VARCHAR(255) NOT NULL,
        apiKey VARCHAR(255) NOT NULL,
        isDefault BOOLEAN DEFAULT false,
        isActive BOOLEAN DEFAULT true,
        status ENUM('online', 'offline', 'testing', 'error') DEFAULT 'offline',
        lastTested TIMESTAMP NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        description TEXT
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS connections (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        type ENUM('evolution', 'wuzapi') NOT NULL,
        status ENUM('connected', 'disconnected', 'connecting', 'error') DEFAULT 'disconnected',
        phone VARCHAR(255),
        profileName VARCHAR(255),
        profilePicture TEXT,
        qrCode TEXT,
        token VARCHAR(255),
        instanceName VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastActivity TIMESTAMP NULL,
        webhook VARCHAR(255),
        server_id VARCHAR(255),
        FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE SET NULL
      );
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE,
        role ENUM('admin', 'user') DEFAULT 'user',
        token VARCHAR(255),
        passwordHash VARCHAR(255),
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        lastLogin TIMESTAMP NULL,
        active BOOLEAN DEFAULT true
      );
    `);

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

    // Ajustes para bases já existentes: garantir coluna passwordHash e role simplificado
    try {
      await connection.query(`ALTER TABLE users ADD COLUMN passwordHash VARCHAR(255)`);
    } catch (e) {
      // Ignora se a coluna já existe
    }
    try {
      await connection.query(`ALTER TABLE users MODIFY COLUMN role ENUM('admin','user') DEFAULT 'user'`);
    } catch (e) {
      // Ignora se já está no formato desejado
    }

    console.log('Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar as tabelas:', error);
  } finally {
    connection.release();
    pool.end();
  }
};

createTables();