const { Client } = require('pg');
require('dotenv').config();

async function verifyTasksTable() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();
    console.log('✅ Connected to database');

    // Получаем полную структуру таблицы
    const columns = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        udt_name,
        is_nullable, 
        column_default,
        character_maximum_length
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'tasks'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 Структура таблицы tasks:');
    columns.rows.forEach(col => {
      const maxLength = col.character_maximum_length ? `(${col.character_maximum_length})` : '';
      console.log(`  ${col.column_name.padEnd(20)} ${(col.data_type + maxLength).padEnd(20)} ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'.padEnd(8)} default: ${col.column_default || 'нет'}`);
    });

    // Проверяем ограничения
    const constraints = await client.query(`
      SELECT 
        tc.constraint_name,
        tc.constraint_type,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_schema = 'public' 
      AND tc.table_name = 'tasks';
    `);

    console.log('\n🔒 Ограничения таблицы tasks:');
    if (constraints.rows.length === 0) {
      console.log('  Нет ограничений');
    } else {
      constraints.rows.forEach(con => {
        console.log(`  ${con.constraint_type}: ${con.constraint_name} (${con.column_name})`);
      });
    }

    // Проверяем внешние ключи
    const foreignKeys = await client.query(`
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
      WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'tasks';
    `);

    console.log('\n🔗 Внешние ключи:');
    if (foreignKeys.rows.length === 0) {
      console.log('  Нет внешних ключей');
    } else {
      foreignKeys.rows.forEach(fk => {
        console.log(`  ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
      });
    }

    // Проверяем индексы
    const indexes = await client.query(`
      SELECT
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'tasks';
    `);

    console.log('\n📇 Индексы:');
    if (indexes.rows.length === 0) {
      console.log('  Нет индексов');
    } else {
      indexes.rows.forEach(idx => {
        console.log(`  ${idx.indexname}: ${idx.indexdef}`);
      });
    }

    // Проверяем, есть ли внешний ключ на distributionId
    const distFk = foreignKeys.rows.find(fk => fk.column_name === 'distributionId');
    if (!distFk) {
      console.log('\n⚠️  ВНИМАНИЕ: Отсутствует внешний ключ на distributionId');
      console.log('   Это может быть нормально, если таблица создавалась вручную');
    }

    console.log('\n✅ Проверка завершена');
    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    console.error(error.stack);
    await client.end();
    process.exit(1);
  }
}

verifyTasksTable();

