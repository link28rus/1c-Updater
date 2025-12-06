const { Client } = require('pg');
require('dotenv').config();

async function checkAgentRegistrationsTable() {
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

    // Проверяем существование таблицы
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'agent_registrations'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Таблица agent_registrations не существует!');
      await client.end();
      return;
    }

    console.log('✅ Таблица agent_registrations существует');

    // Проверяем структуру таблицы
    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'agent_registrations'
      ORDER BY ordinal_position
    `);

    console.log('\n📋 Структура таблицы agent_registrations:');
    columns.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
    });

    // Проверяем количество записей
    const count = await client.query('SELECT COUNT(*) as count FROM agent_registrations');
    console.log(`\n📊 Количество записей: ${count.rows[0].count}`);

    // Проверяем внешние ключи
    const fks = await client.query(`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_name = 'agent_registrations'
        AND tc.constraint_type = 'FOREIGN KEY'
    `);

    if (fks.rows.length > 0) {
      console.log('\n🔗 Внешние ключи:');
      fks.rows.forEach(fk => {
        console.log(`   - ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkAgentRegistrationsTable();


