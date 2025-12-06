const bcrypt = require('bcrypt');
const { Client } = require('pg');
require('dotenv').config();

async function resetAdminPassword() {
  const username = 'admin';
  const newPassword = 'Aster2020$';

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: process.env.DB_DATABASE || '1c_updater',
  });

  try {
    await client.connect();

    // Проверяем, существует ли пользователь
    const checkResult = await client.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (checkResult.rows.length === 0) {
      console.log(`User '${username}' does not exist! Creating...`);
      
      // Хешируем пароль
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Создаем пользователя
      await client.query(
        `INSERT INTO users (username, password, "isAdmin", "isBlocked", "createdAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, hashedPassword, true, false]
      );

      console.log(`\n✅ SUCCESS: Admin user created!`);
    } else {
      console.log(`User '${username}' exists. Resetting password...`);
      
      // Хешируем новый пароль
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Обновляем пароль
      await client.query(
        'UPDATE users SET password = $1 WHERE username = $2',
        [hashedPassword, username]
      );

      console.log(`\n✅ SUCCESS: Admin password reset!`);
    }

    console.log(`   Username: ${username}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n🌐 You can now login at http://localhost:5173`);

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

resetAdminPassword();




