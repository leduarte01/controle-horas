const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    console.log('Configurando Schema e migrando tabelas se necessário...');
    
    // Cria o schema isolado
    await pool.query('CREATE SCHEMA IF NOT EXISTS horas;');
    
    // Migra as tabelas do schema public para o schema horas caso existam lá
    await pool.query(`
      DO $$ 
      BEGIN 
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'clientes') THEN
          ALTER TABLE public.clientes SET SCHEMA horas;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'projetos') THEN
          ALTER TABLE public.projetos SET SCHEMA horas;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lancamentos') THEN
          ALTER TABLE public.lancamentos SET SCHEMA horas;
        END IF;
      END $$;
    `);

    // Define o schema padrão para a sessão atual
    await pool.query('SET search_path TO horas;');

    console.log('Criando tabela de Controle de Usuários (SaaS Isolado)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        "id" SERIAL PRIMARY KEY,
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "dataCadastro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Criando tabelas isoladas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        "id" VARCHAR(50) PRIMARY KEY,
        "nome" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "telefone" VARCHAR(50),
        "dataCadastro" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projetos (
        "id" VARCHAR(50) PRIMARY KEY,
        "clienteId" VARCHAR(50) REFERENCES clientes("id") ON DELETE CASCADE,
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "valorHora" FLOAT,
        "dataCadastro" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lancamentos (
        "id" VARCHAR(50) PRIMARY KEY,
        "projetoId" VARCHAR(50) REFERENCES projetos("id") ON DELETE CASCADE,
        "data" VARCHAR(50),
        "horaInicio" VARCHAR(10),
        "horaFim" VARCHAR(10),
        "duracao" FLOAT,
        "descricao" TEXT,
        "valorTotal" FLOAT,
        "dataLancamento" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);

    // Alimenta as tabelas antigas/novas com a coluna mult-user
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE CASCADE;
      ALTER TABLE projetos ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE CASCADE;
      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE CASCADE;
      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "atividade" TEXT;
    `);

    // Migração de Admin: Cria a conta superadmin e amarra aos dados velhos
    const crypto = require('crypto');
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(adminPass, salt, 1000, 64, 'sha512').toString('hex');
    const dbHash = salt + ':' + hash;
    
    await pool.query(`
      INSERT INTO usuarios ("username", "passwordHash") 
      VALUES ($1, $2)
      ON CONFLICT ("username") DO NOTHING;
    `, [adminUser, dbHash]);

    // Resgata o ID desse super usuário logado no server
    const { rows } = await pool.query('SELECT id FROM usuarios WHERE username = $1', [adminUser]);
    const superAdminId = rows[0].id;

    console.log('Amarrando dados órfãos ao dono original do sistema...');
    await pool.query('UPDATE clientes SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [superAdminId]);
    await pool.query('UPDATE projetos SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [superAdminId]);
    await pool.query('UPDATE lancamentos SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [superAdminId]);

    console.log('Tabelas, Schemas e Arquitetura MultiUsuário processadas com sucesso!');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    pool.end();
  }
}

initDB();
