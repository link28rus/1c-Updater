const { Client } = require('pg');
require('dotenv').config();

async function migrateDistributions() {
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

    // Проверяем, существует ли колонка folderPath
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'folderPath'
    `);

    if (checkColumn.rows.length === 0) {
      console.log('Adding folderPath column...');
      await client.query(`
        ALTER TABLE distributions 
        ADD COLUMN "folderPath" character varying
      `);
      console.log('✅ Added folderPath column');

      // Копируем данные из filePath в folderPath для существующих записей
      const existingRecords = await client.query('SELECT id, "filePath" FROM distributions');
      for (const record of existingRecords.rows) {
        if (record.filePath) {
          // Для существующих записей используем директорию файла как папку
          const path = require('path');
          const folderPath = path.dirname(record.filePath);
          await client.query(
            'UPDATE distributions SET "folderPath" = $1 WHERE id = $2',
            [folderPath, record.id]
          );
        }
      }
      console.log('✅ Migrated existing records');

      // Делаем folderPath NOT NULL после миграции
      await client.query(`
        ALTER TABLE distributions 
        ALTER COLUMN "folderPath" SET NOT NULL
      `);
      console.log('✅ Set folderPath to NOT NULL');

      // Удаляем старую колонку filePath (опционально, можно оставить для совместимости)
      // await client.query('ALTER TABLE distributions DROP COLUMN "filePath"');
    } else {
      console.log('✅ folderPath column already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

migrateDistributions();



