const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function initDB() {
  try {
    console.log('Criando tabelas...');
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
    
    console.log('Tabelas criadas com sucesso!');
  } catch (err) {
    console.error('Erro ao criar tabelas:', err);
  } finally {
    pool.end();
  }
}

initDB();
