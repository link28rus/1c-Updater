const { Client } = require('pg');
require('dotenv').config();

async function createTables() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Создаем таблицу users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR UNIQUE NOT NULL,
        password VARCHAR NOT NULL,
        "isAdmin" BOOLEAN DEFAULT false,
        "isBlocked" BOOLEAN DEFAULT false,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Users table created');

    // Создаем таблицу groups
    await client.query(`
      CREATE TABLE IF NOT EXISTS groups (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Groups table created');

    // Создаем таблицу pcs
    await client.query(`
      CREATE TABLE IF NOT EXISTS pcs (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        "ipAddress" VARCHAR NOT NULL,
        description VARCHAR,
        "adminUsername" TEXT NOT NULL,
        "adminPassword" TEXT NOT NULL,
        "lastOneCVersion" VARCHAR,
        "oneCArchitecture" VARCHAR,
        "isOnline" BOOLEAN DEFAULT false,
        "lastHeartbeat" TIMESTAMP,
        "groupId" INTEGER,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY ("groupId") REFERENCES groups(id)
      );
    `);
    console.log('✅ PCs table created');

    // Создаем таблицу distributions
    await client.query(`
      CREATE TABLE IF NOT EXISTS distributions (
        id SERIAL PRIMARY KEY,
        filename VARCHAR NOT NULL,
        "filePath" VARCHAR NOT NULL,
        version VARCHAR NOT NULL,
        architecture VARCHAR NOT NULL,
        "fileSize" BIGINT NOT NULL,
        description VARCHAR,
        "createdAt" TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Distributions table created');

    // Создаем enum для статусов задач
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await client.query(`
      DO $$ BEGIN
        CREATE TYPE task_pc_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу tasks
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR NOT NULL,
        description VARCHAR,
        "distributionId" INTEGER NOT NULL,
        status task_status DEFAULT 'pending',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY ("distributionId") REFERENCES distributions(id)
      );
    `);
    console.log('✅ Tasks table created');

    // Создаем таблицу task_pc (без внешних ключей сначала)
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_pc (
        id SERIAL PRIMARY KEY,
        "taskId" INTEGER NOT NULL,
        "pcId" INTEGER NOT NULL,
        status task_pc_status DEFAULT 'pending',
        "errorMessage" TEXT,
        "completedAt" TIMESTAMP
      );
    `);
    console.log('✅ Task_PC table created');
    
    // Добавляем внешние ключи отдельно, если их еще нет
    try {
      await client.query(`
        ALTER TABLE task_pc 
        ADD CONSTRAINT task_pc_taskId_fkey 
        FOREIGN KEY ("taskId") REFERENCES tasks(id) ON DELETE CASCADE;
      `);
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('Note: task_pc_taskId_fkey constraint');
    }
    
    try {
      await client.query(`
        ALTER TABLE task_pc 
        ADD CONSTRAINT task_pc_pcId_fkey 
        FOREIGN KEY ("pcId") REFERENCES pcs(id) ON DELETE CASCADE;
      `);
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('Note: task_pc_pcId_fkey constraint');
    }

    // Создаем таблицу agent_registrations
    await client.query(`
      CREATE TABLE IF NOT EXISTS agent_registrations (
        id SERIAL PRIMARY KEY,
        "pcId" INTEGER UNIQUE NOT NULL,
        "agentId" VARCHAR UNIQUE NOT NULL,
        hostname VARCHAR NOT NULL,
        "osVersion" VARCHAR NOT NULL,
        "lastOneCVersion" VARCHAR,
        "oneCArchitecture" VARCHAR,
        "isActive" BOOLEAN DEFAULT true,
        "lastHeartbeat" TIMESTAMP,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW(),
        FOREIGN KEY ("pcId") REFERENCES pcs(id)
      );
    `);
    console.log('✅ Agent_registrations table created');

    // Создаем связь many-to-many для tasks и pcs
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_pcs_pc (
        "tasksId" INTEGER NOT NULL,
        "pcId" INTEGER NOT NULL,
        PRIMARY KEY ("tasksId", "pcId"),
        FOREIGN KEY ("tasksId") REFERENCES tasks(id),
        FOREIGN KEY ("pcId") REFERENCES pcs(id)
      );
    `);
    console.log('✅ Task_PCs_PC junction table created');

    console.log('\n✅ All tables created successfully!');
    await client.end();
  } catch (error) {
    console.error('Error creating tables:', error.message);
    await client.end();
    process.exit(1);
  }
}

createTables();

