const { Client } = require('pg');
const bcrypt = require('bcrypt');
require('dotenv').config();

async function testLogin() {
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

    const result = await client.query(
      'SELECT id, username, password, "isAdmin", "isBlocked" FROM users WHERE username = $1',
      ['admin']
    );

    if (result.rows.length === 0) {
      console.log('❌ User "admin" not found in database');
      console.log('Creating admin user...');
      
      const password = 'Aster2020$';
      const hashedPassword = await bcrypt.hash(password, 10);
      
      await client.query(
        `INSERT INTO users (username, password, "isAdmin", "isBlocked", "createdAt")
         VALUES ($1, $2, $3, $4, NOW())`,
        [username, hashedPassword, true, false]
      );
      
      console.log('✅ Admin user created');
    } else {
      const user = result.rows[0];
      console.log('✅ User found:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Username: ${user.username}`);
      console.log(`   IsAdmin: ${user.isAdmin}`);
      console.log(`   IsBlocked: ${user.isBlocked}`);
      
      // Тестируем пароль
      const testPassword = 'Aster2020$';
      const isValid = await bcrypt.compare(testPassword, user.password);
      console.log(`\nPassword test: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
      
      if (!isValid) {
        console.log('\n⚠️  Password mismatch! Updating password...');
        const newHash = await bcrypt.hash(testPassword, 10);
        await client.query(
          'UPDATE users SET password = $1 WHERE id = $2',
          [newHash, user.id]
        );
        console.log('✅ Password updated');
      }
    }

    await client.end();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

testLogin();




