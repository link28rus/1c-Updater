const { Client } = require('pg');
require('dotenv').config();

async function checkUsersTable() {
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

    // Проверяем существование таблицы users
    const tableCheck = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ Таблица users не существует!');
      console.log('💡 Создайте таблицу или используйте TypeORM synchronize (не рекомендуется для production)');
    } else {
      console.log('✅ Таблица users существует');

      // Проверяем структуру таблицы
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'users'
        ORDER BY ordinal_position
      `);

      console.log('\n📋 Структура таблицы users:');
      columns.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });

      // Проверяем количество пользователей
      const userCount = await client.query('SELECT COUNT(*) as count FROM users');
      console.log(`\n👥 Количество пользователей: ${userCount.rows[0].count}`);

      if (parseInt(userCount.rows[0].count) === 0) {
        console.log('⚠️  В таблице нет пользователей!');
        console.log('💡 Создайте администратора с помощью скрипта create-admin-auto.js');
      } else {
        // Показываем список пользователей (без паролей)
        const users = await client.query(`
          SELECT id, username, "isAdmin", "isBlocked", "createdAt"
          FROM users
        `);
        console.log('\n📝 Список пользователей:');
        users.rows.forEach(user => {
          console.log(`   - ${user.username} (ID: ${user.id}, Admin: ${user.isAdmin}, Blocked: ${user.isBlocked})`);
        });
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Ошибка:', error.message);
    await client.end();
    process.exit(1);
  }
}

checkUsersTable();



