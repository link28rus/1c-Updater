const { Client } = require('pg');
require('dotenv').config();

async function restoreFkAndClean() {
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

    // Проверяем тип ID
    const colInfo = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'distributions' AND column_name = 'id'
    `);
    console.log('ID column type:', colInfo.rows[0]?.data_type);

    // Очищаем задачи с невалидными distributionId
    const tasks = await client.query('SELECT COUNT(*) as count FROM tasks WHERE "distributionId" IS NOT NULL');
    console.log('Tasks with distributionId:', tasks.rows[0]?.count);
    
    if (parseInt(tasks.rows[0]?.count) > 0) {
      console.log('Cleaning tasks with invalid distributionId...');
      await client.query('DELETE FROM tasks WHERE "distributionId" IS NOT NULL');
      console.log('✅ Cleaned tasks');
    }

    // Восстанавливаем внешний ключ
    try {
      // Проверяем, существует ли уже FK
      const fkCheck = await client.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'tasks' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%distribution%'
      `);
      
      if (fkCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE tasks 
          ADD CONSTRAINT "FK_tasks_distribution" 
          FOREIGN KEY ("distributionId") REFERENCES distributions(id) ON DELETE CASCADE
        `);
        console.log('✅ Restored foreign key');
      } else {
        console.log('✅ Foreign key already exists');
      }
    } catch (e) {
      console.log('⚠️  Could not restore FK:', e.message);
    }

    await client.end();
    console.log('\n✅ All done!');
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

restoreFkAndClean();



