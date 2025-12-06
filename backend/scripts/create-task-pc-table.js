const { Client } = require('pg');
require('dotenv').config();

async function createTaskPcTable() {
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

    // Проверяем, существует ли таблица task_pc
    const checkTable = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'task_pc'
    `);

    if (checkTable.rows.length === 0) {
      console.log('Creating task_pc table...');
      
      // Создаем enum тип для статуса
      await client.query(`
        DO $$ 
        BEGIN
            IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_pc_status_enum') THEN
                CREATE TYPE task_pc_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');
            END IF;
        END $$;
      `);
      console.log('✅ Created task_pc_status_enum type');

      // Проверяем существование таблиц tasks и pcs
      const tasksExists = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'tasks'
      `);
      const pcsExists = await client.query(`
        SELECT table_name FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'pcs'
      `);

      if (tasksExists.rows.length === 0) {
        throw new Error('Table "tasks" does not exist. Please create it first.');
      }
      if (pcsExists.rows.length === 0) {
        throw new Error('Table "pcs" does not exist. Please create it first.');
      }

      // Создаем таблицу task_pc сначала без внешних ключей
      await client.query(`
        CREATE TABLE task_pc (
          id SERIAL PRIMARY KEY,
          "taskId" INTEGER NOT NULL,
          "pcId" INTEGER NOT NULL,
          status task_pc_status_enum NOT NULL DEFAULT 'pending',
          "errorMessage" TEXT,
          "completedAt" TIMESTAMP,
          UNIQUE("taskId", "pcId")
        )
      `);
      console.log('✅ Created task_pc table');

      // Добавляем внешние ключи отдельно (если возможно)
      try {
        await client.query(`
          ALTER TABLE task_pc 
          ADD CONSTRAINT "FK_task_pc_task" 
          FOREIGN KEY ("taskId") REFERENCES tasks(id) ON DELETE CASCADE
        `);
        console.log('✅ Added FK to tasks');
      } catch (fkError) {
        console.warn('⚠️  Could not add FK to tasks (continuing without it):', fkError.message);
      }

      try {
        await client.query(`
          ALTER TABLE task_pc 
          ADD CONSTRAINT "FK_task_pc_pc" 
          FOREIGN KEY ("pcId") REFERENCES pcs(id) ON DELETE CASCADE
        `);
        console.log('✅ Added FK to pcs');
      } catch (fkError) {
        console.warn('⚠️  Could not add FK to pcs (continuing without it):', fkError.message);
      }

      // Создаем индексы
      await client.query(`
        CREATE INDEX "IDX_task_pc_taskId" ON task_pc("taskId");
        CREATE INDEX "IDX_task_pc_pcId" ON task_pc("pcId");
        CREATE INDEX "IDX_task_pc_status" ON task_pc(status);
      `);
      console.log('✅ Created indexes');
    } else {
      console.log('✅ task_pc table already exists');
    }

    console.log('\n✅ Migration completed successfully!');
    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    await client.end();
    process.exit(1);
  }
}

createTaskPcTable();

