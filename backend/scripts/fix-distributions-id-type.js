const { Client } = require('pg');
require('dotenv').config();

async function fixDistributionsIdType() {
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

    // Проверяем текущий тип
    const colInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'id'
    `);
    console.log('Current ID column type:', colInfo.rows[0]?.data_type);

    if (colInfo.rows[0]?.data_type === 'text' || colInfo.rows[0]?.data_type === 'character varying') {
      console.log('\n⚠️  ID column is TEXT/UUID, but should be INTEGER');
      console.log('This will require recreating the table with proper ID type.');
      console.log('\nOption 1: Delete all distributions and recreate table');
      console.log('Option 2: Create new table with INTEGER ID and migrate data');
      
      // Проверяем, есть ли внешние ключи
      const fkCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'tasks' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%distribution%'
      `);
      
      if (fkCheck.rows.length > 0) {
        console.log('\n⚠️  Found foreign key constraints. Need to drop them first.');
        console.log('Foreign keys:', fkCheck.rows.map(r => r.constraint_name));
      }

      // Удаляем все записи из distributions (данные можно восстановить, загрузив заново)
      console.log('\n🗑️  Deleting all distributions...');
      await client.query('DELETE FROM distributions');
      console.log('✅ Deleted all distributions');

      // Удаляем внешние ключи, если есть
      for (const fk of fkCheck.rows) {
        try {
          await client.query(`ALTER TABLE tasks DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"`);
          console.log(`✅ Dropped FK: ${fk.constraint_name}`);
        } catch (e) {
          console.warn(`⚠️  Could not drop FK ${fk.constraint_name}:`, e.message);
        }
      }

      // Удаляем таблицу и пересоздаем с правильным типом ID
      console.log('\n🔄 Recreating distributions table with INTEGER ID...');
      await client.query('DROP TABLE IF EXISTS distributions CASCADE');
      
      await client.query(`
        CREATE TABLE distributions (
          id SERIAL PRIMARY KEY,
          filename VARCHAR NOT NULL,
          "folderPath" VARCHAR NOT NULL,
          version VARCHAR NOT NULL,
          architecture VARCHAR NOT NULL,
          "fileSize" BIGINT NOT NULL,
          description VARCHAR,
          "createdAt" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
      console.log('✅ Recreated distributions table with INTEGER ID');

      // Восстанавливаем внешний ключ в tasks
      try {
        await client.query(`
          ALTER TABLE tasks 
          ADD CONSTRAINT "FK_tasks_distribution" 
          FOREIGN KEY ("distributionId") REFERENCES distributions(id) ON DELETE CASCADE
        `);
        console.log('✅ Restored foreign key in tasks table');
      } catch (e) {
        console.warn('⚠️  Could not restore FK:', e.message);
      }

      console.log('\n✅ Migration completed!');
      console.log('💡 You can now upload distributions again - they will have numeric IDs');
    } else {
      console.log('✅ ID column type is already correct:', colInfo.rows[0]?.data_type);
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

fixDistributionsIdType();



