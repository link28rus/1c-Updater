import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1704067200000 implements MigrationInterface {
  name = 'InitialSchema1704067200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Создаем enum типы для статусов задач
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "task_status" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "task_pc_status" AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'skipped');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Создаем таблицу users
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" SERIAL NOT NULL,
        "username" character varying NOT NULL,
        "password" character varying NOT NULL,
        "isAdmin" boolean NOT NULL DEFAULT false,
        "isBlocked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_username" UNIQUE ("username"),
        CONSTRAINT "PK_users" PRIMARY KEY ("id")
      )
    `);

    // Создаем таблицу groups
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "groups" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_groups" PRIMARY KEY ("id")
      )
    `);

    // Создаем таблицу pcs
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "pcs" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "ipAddress" character varying NOT NULL,
        "description" character varying,
        "adminUsername" text NOT NULL,
        "adminPassword" text NOT NULL,
        "lastOneCVersion" character varying,
        "oneCArchitecture" character varying,
        "isOnline" boolean NOT NULL DEFAULT false,
        "lastHeartbeat" TIMESTAMP,
        "groupId" integer,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_pcs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_pcs_groups" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE SET NULL
      )
    `);

    // Создаем таблицу distributions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "distributions" (
        "id" SERIAL NOT NULL,
        "filename" character varying NOT NULL,
        "folderPath" character varying NOT NULL,
        "version" character varying NOT NULL,
        "architecture" character varying NOT NULL,
        "fileSize" bigint NOT NULL,
        "description" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_distributions" PRIMARY KEY ("id")
      )
    `);

    // Создаем таблицу tasks
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tasks" (
        "id" SERIAL NOT NULL,
        "name" character varying NOT NULL,
        "description" character varying,
        "distributionId" integer NOT NULL,
        "status" "task_status" NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_tasks_distributions" FOREIGN KEY ("distributionId") REFERENCES "distributions"("id") ON DELETE CASCADE
      )
    `);

    // Создаем таблицу task_pc
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "task_pc" (
        "id" SERIAL NOT NULL,
        "taskId" integer NOT NULL,
        "pcId" integer NOT NULL,
        "status" "task_pc_status" NOT NULL DEFAULT 'pending',
        "errorMessage" text,
        "completedAt" TIMESTAMP,
        CONSTRAINT "PK_task_pc" PRIMARY KEY ("id"),
        CONSTRAINT "FK_task_pc_tasks" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_task_pc_pcs" FOREIGN KEY ("pcId") REFERENCES "pcs"("id") ON DELETE CASCADE
      )
    `);

    // Создаем таблицу agent_registrations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "agent_registrations" (
        "id" SERIAL NOT NULL,
        "pcId" integer NOT NULL,
        "agentId" character varying NOT NULL,
        "hostname" character varying NOT NULL,
        "osVersion" character varying NOT NULL,
        "lastOneCVersion" character varying,
        "oneCArchitecture" character varying,
        "isActive" boolean NOT NULL DEFAULT true,
        "lastHeartbeat" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_agent_registrations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_agent_registrations_pcId" UNIQUE ("pcId"),
        CONSTRAINT "FK_agent_registrations_pcs" FOREIGN KEY ("pcId") REFERENCES "pcs"("id") ON DELETE CASCADE
      )
    `);

    // Создаем индексы для оптимизации
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_pcs_groupId" ON "pcs" ("groupId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_distributionId" ON "tasks" ("distributionId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_tasks_status" ON "tasks" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_pc_taskId" ON "task_pc" ("taskId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_pc_pcId" ON "task_pc" ("pcId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_task_pc_status" ON "task_pc" ("status")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agent_registrations_pcId" ON "agent_registrations" ("pcId")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_agent_registrations_agentId" ON "agent_registrations" ("agentId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Удаляем индексы
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_registrations_agentId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_agent_registrations_pcId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_pc_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_pc_pcId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_task_pc_taskId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_tasks_distributionId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_pcs_groupId"`);

    // Удаляем таблицы в обратном порядке
    await queryRunner.query(`DROP TABLE IF EXISTS "agent_registrations"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "task_pc"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tasks"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "distributions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "pcs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "groups"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    // Удаляем enum типы
    await queryRunner.query(`DROP TYPE IF EXISTS "task_pc_status"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "task_status"`);
  }
}

