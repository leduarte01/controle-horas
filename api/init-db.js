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

    console.log('Criando tabela de Empresas (SaaS Multi-Tenant)...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS empresas (
        "id" SERIAL PRIMARY KEY,
        "cnpj" VARCHAR(20) UNIQUE NOT NULL,
        "razaoSocial" VARCHAR(255) NOT NULL,
        "dataCadastro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Criando tabela de Controle de Usuários...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        "id" SERIAL PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "username" VARCHAR(50) UNIQUE NOT NULL,
        "passwordHash" VARCHAR(255) NOT NULL,
        "nome" VARCHAR(255),
        "role" VARCHAR(20) DEFAULT 'membro',
        "dataCadastro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add new columns if table already exists (for users created before this update)
    await pool.query(`
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "nome" VARCHAR(255);
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "role" VARCHAR(20) DEFAULT 'membro';
      ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS "dataCadastro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    `);

    console.log('Criando tabelas de entidades...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS clientes (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "nome" VARCHAR(255) NOT NULL,
        "email" VARCHAR(255),
        "telefone" VARCHAR(50),
        "diaFechamento" INT DEFAULT 17,
        "dataCadastro" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);
    
    await pool.query(`
      CREATE TABLE IF NOT EXISTS projetos (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "clienteId" VARCHAR(50) REFERENCES clientes("id") ON DELETE CASCADE,
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "valorHora" FLOAT,
        "colunasKanban" JSONB DEFAULT '["Backlog","A Fazer","Em Andamento","Revisão","Concluído"]',
        "dataCadastro" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS lancamentos (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "projetoId" VARCHAR(50) REFERENCES projetos("id") ON DELETE CASCADE,
        "atividade" TEXT,
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

    console.log('Criando tabelas do Kanban...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS atividades (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "projetoId" VARCHAR(50) REFERENCES projetos("id") ON DELETE CASCADE,
        "nome" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "cor" VARCHAR(20) DEFAULT '#f97316',
        "dataCriacao" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS tarefas (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "projetoId" VARCHAR(50) REFERENCES projetos("id") ON DELETE CASCADE,
        "atividadeId" VARCHAR(50) REFERENCES atividades("id") ON DELETE CASCADE,
        "responsavelId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "coluna" VARCHAR(100) NOT NULL DEFAULT 'Backlog',
        "titulo" VARCHAR(255) NOT NULL,
        "descricao" TEXT,
        "ordem" INT DEFAULT 0,
        "dataInicio" VARCHAR(50),
        "dataPrevisao" VARCHAR(50),
        "dataEntrega" VARCHAR(50),
        "dataCriacao" VARCHAR(50),
        "dataAtualizacao" VARCHAR(50)
      );
    `);

    // Ensure backwards compatibility by adding new columns to existing tables
    await pool.query(`
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL;
      ALTER TABLE clientes ADD COLUMN IF NOT EXISTS "diaFechamento" INT DEFAULT 17;

      ALTER TABLE projetos ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      ALTER TABLE projetos ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL;
      ALTER TABLE projetos ADD COLUMN IF NOT EXISTS "colunasKanban" JSONB DEFAULT '["Backlog","A Fazer","Em Andamento","Revisão","Concluído"]';

      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL;
      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "atividade" TEXT;

      ALTER TABLE atividades ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "atividadeId" VARCHAR(50) REFERENCES atividades("id") ON DELETE CASCADE;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "responsavelId" INT REFERENCES usuarios("id") ON DELETE SET NULL;

      -- Hierarquia Epic→Feature→UserStory→Task
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "tipo" VARCHAR(20) DEFAULT 'task';
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "parentId" VARCHAR(50) REFERENCES tarefas("id") ON DELETE SET NULL;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "status" VARCHAR(50) DEFAULT 'Planejado';

      -- Campos estendidos da tarefa
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "prioridade" INT DEFAULT 3;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "estimativaHoras" FLOAT;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "tags" TEXT;

      -- Responsável em Atividades
      ALTER TABLE atividades ADD COLUMN IF NOT EXISTS "responsavelId" INT REFERENCES usuarios("id") ON DELETE SET NULL;

      -- Vínculo com atividade cadastrada em Lançamentos
      ALTER TABLE lancamentos ADD COLUMN IF NOT EXISTS "atividadeId" VARCHAR(50) REFERENCES atividades("id") ON DELETE SET NULL;

      -- Atividades independentes: ativo/inativo, projetoId nullable
      ALTER TABLE atividades ADD COLUMN IF NOT EXISTS "ativo" BOOLEAN DEFAULT true;
      ALTER TABLE atividades ALTER COLUMN "projetoId" DROP NOT NULL;
    `);

    // Número sequencial por tarefa (usado nos cards do Kanban)
    await pool.query(`
      CREATE SEQUENCE IF NOT EXISTS tarefas_numero_seq;
      ALTER TABLE tarefas ADD COLUMN IF NOT EXISTS "numero" BIGINT DEFAULT nextval('tarefas_numero_seq');
    `);
    await pool.query(`UPDATE tarefas SET "numero" = nextval('tarefas_numero_seq') WHERE "numero" IS NULL;`);

    console.log('Criando tabela de Comentários de Tarefas...');
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tarefas_comentarios (
        "id" VARCHAR(50) PRIMARY KEY,
        "empresaId" INT REFERENCES empresas("id") ON DELETE CASCADE,
        "tarefaId" VARCHAR(50) REFERENCES tarefas("id") ON DELETE CASCADE,
        "usuarioId" INT REFERENCES usuarios("id") ON DELETE SET NULL,
        "texto" TEXT NOT NULL,
        "dataCriacao" VARCHAR(50)
      );
    `);

    // System Provisioning
    console.log('Provisionando Empresa Default...');
    const defaultCnpj = '36.160.198/0001-18';
    await pool.query(`
      INSERT INTO empresas ("cnpj", "razaoSocial") 
      VALUES ($1, $2)
      ON CONFLICT ("cnpj") DO NOTHING;
    `, [defaultCnpj, 'Leandro Duarte Servicos em Tecnologia da Informacao LTDA.']);

    const { rows: empRows } = await pool.query('SELECT id FROM empresas WHERE cnpj = $1', [defaultCnpj]);
    const defaultEmpresaId = empRows[0].id;

    console.log('Provisionando Conta Admin...');
    const crypto = require('crypto');
    const adminUser = process.env.ADMIN_USER || 'admin';
    const adminPass = process.env.ADMIN_PASS || 'admin';
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(adminPass, salt, 1000, 64, 'sha512').toString('hex');
    const dbHash = salt + ':' + hash;
    
    await pool.query(`
      INSERT INTO usuarios ("username", "passwordHash", "empresaId", "nome", "role") 
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT ("username") DO UPDATE 
      SET "empresaId" = EXCLUDED."empresaId",
          "role" = 'admin',
          "nome" = COALESCE(usuarios."nome", EXCLUDED."nome");
    `, [adminUser, dbHash, defaultEmpresaId, 'Administrador do Sistema', 'admin']);

    const { rows: userRows } = await pool.query('SELECT id FROM usuarios WHERE username = $1', [adminUser]);
    const defaultUsuarioId = userRows[0].id;

    console.log('Migrando dados existentes para a Empresa Default...');
    // If a record has NO empresaId, give it to the default company
    await pool.query('UPDATE usuarios SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);
    await pool.query('UPDATE clientes SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);
    await pool.query('UPDATE projetos SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);
    await pool.query('UPDATE lancamentos SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);
    await pool.query('UPDATE atividades SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);
    await pool.query('UPDATE tarefas SET "empresaId" = $1 WHERE "empresaId" IS NULL;', [defaultEmpresaId]);

    // Migration for specific user email format (only if old 'leandro' row exists and email row doesn't yet)
    await pool.query(`
      UPDATE usuarios SET username = 'leandro@lduarte-consultoria.com.br', role = 'admin'
      WHERE username = 'leandro'
      AND NOT EXISTS (SELECT 1 FROM usuarios WHERE username = 'leandro@lduarte-consultoria.com.br')
    `);

    // Fix users with null nome
    await pool.query(`UPDATE usuarios SET "nome" = "username" WHERE "nome" IS NULL OR "nome" = '';`);

    // Cleanup bad user IDs (e.g. from previous single-user to multi-user attempts)
    await pool.query('UPDATE clientes SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [defaultUsuarioId]);
    await pool.query('UPDATE projetos SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [defaultUsuarioId]);
    await pool.query('UPDATE lancamentos SET "usuarioId" = $1 WHERE "usuarioId" IS NULL;', [defaultUsuarioId]);

    console.log('Arquitetura Multi-Tenant processada e validada com sucesso!');
  } catch (err) {
    console.error('Erro ao inicializar banco Multi-Tenant:', err);
  } finally {
    pool.end();
  }
}

initDB();
