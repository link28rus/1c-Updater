const { Client } = require('pg');
require('dotenv').config();

async function createAgentRegistrationsTable() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();
    console.log('✅ Подключение к базе данных успешно');

    // Проверяем, существует ли таблица
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'agent_registrations'
    `);

    if (tableCheck.rows.length > 0) {
      console.log('⚠️  Таблица agent_registrations уже существует');
      await client.end();
      return;
    }

    // Создаем таблицу
    await client.query(`
      CREATE TABLE agent_registrations (
        id SERIAL PRIMARY KEY,
        "pcId" INTEGER NOT NULL UNIQUE,
        "agentId" VARCHAR(255) NOT NULL,
        hostname VARCHAR(255) NOT NULL,
        "osVersion" VARCHAR(255) NOT NULL,
        "lastOneCVersion" VARCHAR(255),
        "oneCArchitecture" VARCHAR(255),
        "isActive" BOOLEAN NOT NULL DEFAULT true,
        "lastHeartbeat" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Таблица agent_registrations создана');

    // Создаем внешний ключ на таблицу pcs
    try {
      await client.query(`
        ALTER TABLE agent_registrations
        ADD CONSTRAINT fk_agent_registrations_pc
        FOREIGN KEY ("pcId") REFERENCES pcs(id)
        ON DELETE CASCADE
      `);
      console.log('✅ Внешний ключ на таблицу pcs создан');
    } catch (fkError) {
      console.log('⚠️  Не удалось создать внешний ключ (возможно, уже существует):', fkError.message);
    }

    // Создаем индексы для оптимизации
    try {
      await client.query(`
        CREATE INDEX idx_agent_registrations_agent_id ON agent_registrations("agentId")
      `);
      console.log('✅ Индекс на agentId создан');
    } catch (idxError) {
      console.log('⚠️  Не удалось создать индекс:', idxError.message);
    }

    await client.end();
    console.log('✅ Миграция завершена успешно');
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

createAgentRegistrationsTable();


