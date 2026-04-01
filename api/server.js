const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SECRET_KEY = process.env.SECRET_TOKEN || 'chave-seguranca-super-secreta-4089';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.on('connect', client => {
  client.query('SET search_path TO horas;');
});

// Verifica a Criptografia da Senha
function verifyPassword(password, hashStr) {
    const parts = hashStr.split(':');
    if (parts.length !== 2) return false;
    const salt = parts[0];
    const key = parts[1];
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === key;
}

// Rota de Login Multi-Usuário
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await pool.query('SELECT * FROM usuarios WHERE username = $1', [username]);
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
        
        const user = rows[0];
        if (verifyPassword(password, user.passwordHash)) {
            const token = jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '7d' });
            res.json({ token, username: user.username });
        } else {
            res.status(401).json({ error: 'Senha inválida' });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Abertura de Nova Conta (Registrar-se)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha' });
    
    try {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        const dbHash = salt + ':' + hash;
        
        const { rows } = await pool.query(`
            INSERT INTO usuarios ("username", "passwordHash") 
            VALUES ($1, $2) RETURNING id, username
        `, [username, dbHash]);
        
        // Logar o usuário diretamente após criar a conta
        const token = jwt.sign({ id: rows[0].id, username: rows[0].username }, SECRET_KEY, { expiresIn: '7d' });
        res.json({ success: true, token, username: rows[0].username });
    } catch(err) {
        res.status(400).json({ error: 'O nome de usuário já está em uso' });
    }
});

// ═══ ROTA PÚBLICA — Dashboard do Cliente (sem autenticação) ═══
app.get('/api/public/dashboard/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        
        // Busca o cliente
        const clienteResult = await pool.query(
            'SELECT "id", "nome" FROM clientes WHERE "id" = $1',
            [clienteId]
        );
        if (clienteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Cliente não encontrado' });
        }
        const cliente = clienteResult.rows[0];

        // Busca projetos do cliente
        const projetosResult = await pool.query(
            'SELECT "id", "nome" FROM projetos WHERE "clienteId" = $1',
            [clienteId]
        );
        const projetos = projetosResult.rows;
        const projetoIds = projetos.map(p => p.id);

        // Busca lançamentos dos projetos do cliente
        let lancamentos = [];
        if (projetoIds.length > 0) {
            const placeholders = projetoIds.map((_, i) => `$${i + 1}`).join(',');
            const lancResult = await pool.query(
                `SELECT "id", "projetoId", "data", "duracao", "descricao" 
                 FROM lancamentos 
                 WHERE "projetoId" IN (${placeholders})
                 ORDER BY "data" DESC`,
                projetoIds
            );
            lancamentos = lancResult.rows;
        }

        // Monta resposta agrupada
        const projetosComLancamentos = projetos.map(p => {
            const lancs = lancamentos.filter(l => l.projetoId === p.id);
            const totalHoras = lancs.reduce((acc, l) => acc + (l.duracao || 0), 0);
            // Sufixo do projeto: pega a parte depois do último " - " ou retorna o nome inteiro
            const partes = p.nome.split(' - ');
            const sufixo = partes.length > 1 ? partes.slice(1).join(' - ').trim() : p.nome;
            return {
                id: p.id,
                projeto: sufixo,
                totalHoras,
                lancamentos: lancs.map(l => ({
                    data: l.data,
                    descricao: l.descricao || '',
                    horas: l.duracao || 0
                }))
            };
        }).filter(p => p.lancamentos.length > 0);

        const totalGeralHoras = projetosComLancamentos.reduce((acc, p) => acc + p.totalHoras, 0);

        res.json({
            cliente: cliente.nome,
            totalHoras: totalGeralHoras,
            totalProjetos: projetosComLancamentos.length,
            totalLancamentos: lancamentos.length,
            projetos: projetosComLancamentos
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ═══ ROTA PÚBLICA — Lista de clientes para gerar links ═══
app.get('/api/public/clientes-lista', async (req, res) => {
    try {
        const { rows } = await pool.query('SELECT "id", "nome" FROM clientes ORDER BY "nome"');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Interceptor de Segurança: Bloqueia Requests Sem o Token e Injeta o ID do Usuário Ativo
app.use('/api', (req, res, next) => {
    if (req.path === '/login' || req.path === '/register') return next();
    if (req.path.startsWith('/public/')) return next();
    
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Sessão requerida' });
    
    try {
        req.user = jwt.verify(token, SECRET_KEY); // Expõe req.user.id
        next();
    } catch(e) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
});

// Servir os arquivos PDF Estáticos
const path = require('path');
app.use(express.static(path.join(__dirname, '../')));

// --- ROTAS ISOLADAS POR USUÁRIO ---

app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE "usuarioId" = $1', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clientes', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao", "usuarioId")
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clientes/:id', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      UPDATE clientes SET 
        "nome" = $1, "email" = $2, "telefone" = $3, "dataAtualizacao" = $4
      WHERE "id" = $5 AND "usuarioId" = $6 RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.nome, c.email, c.telefone, c.dataAtualizacao, req.params.id, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE "id" = $1 AND "usuarioId" = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PROJETOS ---
app.get('/api/projetos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projetos WHERE "usuarioId" = $1', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projetos', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao", "usuarioId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *;
    `;
    const { rows } = await pool.query(query, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projetos/:id', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      UPDATE projetos SET 
        "clienteId" = $1, "nome" = $2, "descricao" = $3, "valorHora" = $4, "dataAtualizacao" = $5
      WHERE "id" = $6 AND "usuarioId" = $7 RETURNING *;
    `;
    const { rows } = await pool.query(query, [p.clienteId, p.nome, p.descricao, p.valorHora, p.dataAtualizacao, req.params.id, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projetos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projetos WHERE "id" = $1 AND "usuarioId" = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LANÇAMENTOS ---
app.get('/api/lancamentos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM lancamentos WHERE "usuarioId" = $1', [req.user.id]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lancamentos', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao", "usuarioId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      UPDATE lancamentos SET 
        "projetoId" = $1, "data" = $2, "horaInicio" = $3, "horaFim" = $4, "duracao" = $5, "descricao" = $6, "valorTotal" = $7, "dataAtualizacao" = $8
      WHERE "id" = $9 AND "usuarioId" = $10 RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataAtualizacao, req.params.id, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM lancamentos WHERE "id" = $1 AND "usuarioId" = $2', [req.params.id, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MIGRAÇÃO Upsert Islada ---
app.post('/api/migrar', async (req, res) => {
  const { clientes, projetos, lancamentos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const c of (clientes || [])) {
      await client.query(`
        INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao", "usuarioId")
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT ("id") DO UPDATE SET
          "nome" = EXCLUDED."nome", "email" = EXCLUDED."email",
          "telefone" = EXCLUDED."telefone", "dataAtualizacao" = EXCLUDED."dataAtualizacao",
          "usuarioId" = EXCLUDED."usuarioId";
      `, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao, req.user.id]);
    }
    
    for (const p of (projetos || [])) {
      await client.query(`
        INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao", "usuarioId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT ("id") DO UPDATE SET
          "clienteId" = EXCLUDED."clienteId", "nome" = EXCLUDED."nome",
          "descricao" = EXCLUDED."descricao", "valorHora" = EXCLUDED."valorHora",
          "dataAtualizacao" = EXCLUDED."dataAtualizacao", "usuarioId" = EXCLUDED."usuarioId";
      `, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao, req.user.id]);
    }
    
    for (const l of (lancamentos || [])) {
      await client.query(`
        INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao", "usuarioId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT ("id") DO UPDATE SET
          "projetoId" = EXCLUDED."projetoId", "data" = EXCLUDED."data",
          "horaInicio" = EXCLUDED."horaInicio", "horaFim" = EXCLUDED."horaFim",
          "duracao" = EXCLUDED."duracao", "descricao" = EXCLUDED."descricao",
          "valorTotal" = EXCLUDED."valorTotal", "dataAtualizacao" = EXCLUDED."dataAtualizacao", "usuarioId" = EXCLUDED."usuarioId";
      `, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao, req.user.id]);
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
