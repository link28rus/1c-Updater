const { Client } = require('pg');
require('dotenv').config();

async function createDatabase() {
  // Подключаемся к системной базе данных postgres
  const adminClient = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'admin',
    database: 'postgres', // Подключаемся к системной БД
  });

  try {
    await adminClient.connect();
    console.log('Connected to PostgreSQL server');

    const dbName = process.env.DB_DATABASE || '1c_updater';

    // Проверяем, существует ли база данных
    const checkResult = await adminClient.query(
      `SELECT 1 FROM pg_database WHERE datname = $1`,
      [dbName]
    );

    if (checkResult.rows.length > 0) {
      console.log(`Database '${dbName}' already exists!`);
      await adminClient.end();
      return;
    }

    // Создаем базу данных
    await adminClient.query(`CREATE DATABASE "${dbName}"`);
    console.log(`SUCCESS: Database '${dbName}' created!`);
    
    await adminClient.end();
    
    // Теперь подключаемся к новой базе для проверки
    const testClient = new Client({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT) || 5432,
      user: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'admin',
      database: dbName,
    });

    await testClient.connect();
    console.log(`Successfully connected to database '${dbName}'`);
    await testClient.end();
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.code === '42P04') {
      console.log(`Database '${process.env.DB_DATABASE || '1c_updater'}' already exists!`);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('Cannot connect to PostgreSQL server.');
      console.error('Make sure PostgreSQL is running and credentials are correct.');
    } else if (error.code === '28P01') {
      console.error('Authentication failed. Check username and password in .env file.');
    } else {
      console.error('Please create the database manually:');
      console.error(`CREATE DATABASE "${process.env.DB_DATABASE || '1c_updater'}";`);
    }
    process.exit(1);
  }
}

createDatabase();




