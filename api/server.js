const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- AUTENTICAÇÃO COM LOGIN CUSTOMIZADO ---
// Protege a API e permite usar uma interface linda do frontend
const crypto = require('crypto');
// Gera um token seguro que expira/reseta se o app reiniciar (ou usa um fixo)
const SECRET_TOKEN = process.env.SECRET_TOKEN || crypto.randomBytes(32).toString('hex');

app.post('/api/login', (req, res) => {
    const user = process.env.ADMIN_USER || 'admin';
    const pass = process.env.ADMIN_PASS || 'admin';

    if (req.body.username === user && req.body.password === pass) {
        res.json({ token: SECRET_TOKEN });
    } else {
        res.status(401).json({ error: 'Credenciais inválidas' });
    }
});

app.use('/api', (req, res, next) => {
    // Ignorar a rota de login
    if (req.path === '/login') return next();
    
    // Validar rotas da API
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader === `Bearer ${SECRET_TOKEN}`) {
        return next();
    }
    return res.status(401).json({ error: 'Não autorizado' });
});

// Servir os arquivos estáticos do front-end (index.html, script.js, etc.)
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Força que todas as conexões criadas pelo Pool entrem no Schema "horas" padrão
pool.on('connect', client => {
  client.query('SET search_path TO horas;');
});

// --- CLIENTES ---
app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clientes', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao")
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clientes/:id', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      UPDATE clientes SET 
        "nome" = $1, "email" = $2, "telefone" = $3, "dataAtualizacao" = $4
      WHERE "id" = $5 RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.nome, c.email, c.telefone, c.dataAtualizacao, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PROJETOS ---
app.get('/api/projetos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projetos');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projetos', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao")
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const { rows } = await pool.query(query, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projetos/:id', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      UPDATE projetos SET 
        "clienteId" = $1, "nome" = $2, "descricao" = $3, "valorHora" = $4, "dataAtualizacao" = $5
      WHERE "id" = $6 RETURNING *;
    `;
    const { rows } = await pool.query(query, [p.clienteId, p.nome, p.descricao, p.valorHora, p.dataAtualizacao, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projetos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projetos WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LANÇAMENTOS ---
app.get('/api/lancamentos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lancamentos');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lancamentos', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      UPDATE lancamentos SET 
        "projetoId" = $1, "data" = $2, "horaInicio" = $3, "horaFim" = $4, "duracao" = $5, "descricao" = $6, "valorTotal" = $7, "dataAtualizacao" = $8
      WHERE "id" = $9 RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataAtualizacao, req.params.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM lancamentos WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MIGRAÇÃO / BATCH UPSERT ---
app.post('/api/migrar', async (req, res) => {
  const { clientes, projetos, lancamentos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const c of (clientes || [])) {
      await client.query(`
        INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao")
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT ("id") DO UPDATE SET
          "nome" = EXCLUDED."nome", "email" = EXCLUDED."email",
          "telefone" = EXCLUDED."telefone", "dataAtualizacao" = EXCLUDED."dataAtualizacao";
      `, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao]);
    }
    
    for (const p of (projetos || [])) {
      await client.query(`
        INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO UPDATE SET
          "clienteId" = EXCLUDED."clienteId", "nome" = EXCLUDED."nome",
          "descricao" = EXCLUDED."descricao", "valorHora" = EXCLUDED."valorHora",
          "dataAtualizacao" = EXCLUDED."dataAtualizacao";
      `, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao]);
    }
    
    for (const l of (lancamentos || [])) {
      await client.query(`
        INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("id") DO UPDATE SET
          "projetoId" = EXCLUDED."projetoId", "data" = EXCLUDED."data",
          "horaInicio" = EXCLUDED."horaInicio", "horaFim" = EXCLUDED."horaFim",
          "duracao" = EXCLUDED."duracao", "descricao" = EXCLUDED."descricao",
          "valorTotal" = EXCLUDED."valorTotal", "dataAtualizacao" = EXCLUDED."dataAtualizacao";
      `, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao]);
    }
    
    await client.query('COMMIT');
    res.json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
