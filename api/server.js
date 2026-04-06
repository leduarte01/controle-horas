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

function verifyPassword(password, hashStr) {
    const parts = hashStr.split(':');
    if (parts.length !== 2) return false;
    const salt = parts[0];
    const key = parts[1];
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === key;
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return salt + ':' + hash;
}

// ═══ ROTA DE LOGIN ═══
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const { rows } = await pool.query(`
            SELECT u.*, e."razaoSocial" as empresaNome 
            FROM usuarios u
            LEFT JOIN empresas e ON u."empresaId" = e.id
            WHERE u.username = $1
        `, [username]);
        
        if (rows.length === 0) return res.status(401).json({ error: 'Usuário não encontrado' });
        
        const user = rows[0];
        if (verifyPassword(password, user.passwordHash)) {
            const token = jwt.sign({ 
                id: user.id, 
                username: user.username,
                empresaId: user.empresaId,
                role: user.role,
                nome: user.nome,
                empresaNome: user.empresaNome,
                grupoId: user.grupoId || null
            }, SECRET_KEY, { expiresIn: '7d' });
            res.json({ token, username: user.username, nome: user.nome, empresaNome: user.empresaNome, role: user.role });
        } else {
            res.status(401).json({ error: 'Senha inválida' });
        }
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});

// Abertura de Conta (Cria novo Tenant/Empresa e o primeiro usuário Admin)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Preencha usuário e senha' });
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Criar conta tenant (empresa fictícia para este novo usuario solo)
        const empresaRes = await client.query(`
            INSERT INTO empresas ("cnpj", "razaoSocial") 
            VALUES ($1, $2) RETURNING id
        `, [`TEMP-${Date.now()}`, `Conta SaaS de ${username}`]);
        const novaEmpresaId = empresaRes.rows[0].id;
        
        const dbHash = hashPassword(password);
        
        const userRes = await client.query(`
            INSERT INTO usuarios ("username", "passwordHash", "empresaId", "nome", "role") 
            VALUES ($1, $2, $3, $4, $5) RETURNING id, username, nome, "empresaId", role
        `, [username, dbHash, novaEmpresaId, username, 'admin']);
        
        await client.query('COMMIT');
        
        const user = userRes.rows[0];
        const token = jwt.sign({ 
            id: user.id, username: user.username, empresaId: user.empresaId, role: user.role, nome: user.nome, grupoId: null
        }, SECRET_KEY, { expiresIn: '7d' });
        
        res.json({ success: true, token, username: user.username, role: user.role });
    } catch(err) {
        await client.query('ROLLBACK');
        res.status(400).json({ error: 'O nome de usuário já está em uso ou ocorreu erro.' });
    } finally {
        client.release();
    }
});

// ═══ ROTA PÚBLICA — Dashboard do Cliente ═══
app.get('/api/public/dashboard/:clienteId', async (req, res) => {
    try {
        const { clienteId } = req.params;
        const clienteResult = await pool.query('SELECT "id", "nome", "diaFechamento" FROM clientes WHERE "id" = $1', [clienteId]);
        if (clienteResult.rows.length === 0) return res.status(404).json({ error: 'Cliente não encontrado' });
        const cliente = clienteResult.rows[0];

        const projetosResult = await pool.query('SELECT "id", "nome" FROM projetos WHERE "clienteId" = $1', [clienteId]);
        const projetos = projetosResult.rows;
        const projetoIds = projetos.map(p => p.id);

        let lancamentos = [];
        if (projetoIds.length > 0) {
            const placeholders = projetoIds.map((_, i) => `$${i + 1}`).join(',');
            const lancResult = await pool.query(
                `SELECT "id", "projetoId", "data", "duracao", "atividade", "descricao" 
                 FROM lancamentos WHERE "projetoId" IN (${placeholders}) ORDER BY "data" DESC`,
                projetoIds
            );
            lancamentos = lancResult.rows;
        }

        const projetosComLancamentos = projetos.map(p => {
            const lancs = lancamentos.filter(l => l.projetoId === p.id);
            const totalHoras = lancs.reduce((acc, l) => acc + (l.duracao || 0), 0);
            const partes = p.nome.split(' - ');
            const sufixo = partes.length > 1 ? partes.slice(1).join(' - ').trim() : p.nome;
            return {
                id: p.id, projeto: sufixo, totalHoras,
                lancamentos: lancs.map(l => ({
                    data: l.data, atividade: l.atividade || '', descricao: l.descricao || '', horas: l.duracao || 0
                }))
            };
        }).filter(p => p.lancamentos.length > 0);

        const totalGeralHoras = projetosComLancamentos.reduce((acc, p) => acc + p.totalHoras, 0);

        res.json({
            cliente: cliente.nome, diaFechamento: cliente.diaFechamento, totalHoras: totalGeralHoras,
            totalProjetos: projetosComLancamentos.length, totalLancamentos: lancamentos.length, projetos: projetosComLancamentos
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Middleware de Segurança SaaS (Tenancy Guard)
app.use('/api', (req, res, next) => {
    if (req.path === '/login' || req.path === '/register') return next();
    if (req.path.startsWith('/public/')) return next();
    
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Sessão requerida' });
    
    try {
        req.user = jwt.verify(token, SECRET_KEY);
        // Exige que o JWT sempre conheça a qual empresa(Tenant) este usuário pertence
        if (!req.user.empresaId) return res.status(403).json({ error: 'Tenant Inválido.' });
        next();
    } catch(e) {
        res.status(401).json({ error: 'Token inválido ou expirado' });
    }
});

app.use(express.static(require('path').join(__dirname, '../')));

// =========================================================
// ================= GESTÃO DA EQUIPE ======================
// =========================================================

app.get('/api/usuarios-empresa', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT u.id, u.username, u.nome, u.role, u."dataCadastro", u."grupoId", g.nome as "grupoNome"
      FROM usuarios u
      LEFT JOIN grupos_permissoes g ON u."grupoId" = g.id
      WHERE u."empresaId" = $1
      ORDER BY u."dataCadastro" ASC
    `, [req.user.empresaId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/usuarios-empresa', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Só administradores podem cadastrar na equipe.'});
  const { username, password, nome, role, grupoId } = req.body;
  try {
    const dbHash = hashPassword(password);
    const { rows } = await pool.query(`
      INSERT INTO usuarios ("empresaId", "username", "passwordHash", "nome", "role", "grupoId")
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, nome, role, "dataCadastro", "grupoId"
    `, [req.user.empresaId, username, dbHash, nome || username, role || 'membro', grupoId || null]);
    res.json(rows[0]);
  } catch (err) { 
    res.status(400).json({ error: 'Username já existe ou dados incorretos.' }); 
  }
});

app.put('/api/usuarios-empresa/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Ação restrita.'});
  const { nome, role, password, grupoId } = req.body;
  try {
    if (password && password.trim() !== '') {
        const dbHash = hashPassword(password);
        await pool.query(`UPDATE usuarios SET "nome"=$1, "role"=$2, "passwordHash"=$3, "grupoId"=$4 WHERE "id"=$5 AND "empresaId"=$6`,
            [nome, role, dbHash, grupoId || null, req.params.id, req.user.empresaId]);
    } else {
        await pool.query(`UPDATE usuarios SET "nome"=$1, "role"=$2, "grupoId"=$3 WHERE "id"=$4 AND "empresaId"=$5`,
            [nome, role, grupoId || null, req.params.id, req.user.empresaId]);
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/usuarios-empresa/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Ação restrita.'});
  // Impede de apagar o próprio usuário logado
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({error: 'Não pode apagar sua própria conta.'});
  try {
    await pool.query('DELETE FROM usuarios WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ── GRUPOS DE PERMISSÃO ──
app.get('/api/grupos/me', async (req, res) => {
  try {
    if (!req.user.grupoId) return res.json(null);
    const { rows } = await pool.query(
      'SELECT * FROM grupos_permissoes WHERE "id" = $1 AND "empresaId" = $2',
      [req.user.grupoId, req.user.empresaId]
    );
    res.json(rows[0] || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/grupos', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Restrito a administradores.'});
  try {
    const { rows } = await pool.query(
      'SELECT * FROM grupos_permissoes WHERE "empresaId" = $1 ORDER BY "dataCadastro" ASC',
      [req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/grupos', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Restrito a administradores.'});
  const { nome, secoes } = req.body;
  try {
    const { rows } = await pool.query(
      'INSERT INTO grupos_permissoes ("empresaId", "nome", "secoes") VALUES ($1, $2, $3) RETURNING *',
      [req.user.empresaId, nome, JSON.stringify(secoes || [])]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/grupos/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Restrito a administradores.'});
  const { nome, secoes } = req.body;
  try {
    const { rows } = await pool.query(
      'UPDATE grupos_permissoes SET "nome"=$1, "secoes"=$2 WHERE "id"=$3 AND "empresaId"=$4 RETURNING *',
      [nome, JSON.stringify(secoes || []), req.params.id, req.user.empresaId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/grupos/:id', async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({error: 'Restrito a administradores.'});
  try {
    await pool.query('UPDATE usuarios SET "grupoId" = NULL WHERE "grupoId" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    await pool.query('DELETE FROM grupos_permissoes WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// =========================================================
// =================== ROTAS DO SAAS =======================
// === Todas filtradas usando: req.user.empresaId        ===
// =========================================================

// --- CLIENTES ---
app.get('/api/clientes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM clientes WHERE "empresaId" = $1', [req.user.empresaId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/clientes', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao", "empresaId", "usuarioId", "diaFechamento")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao, req.user.empresaId, req.user.id, c.diaFechamento || 17]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/clientes/:id', async (req, res) => {
  const c = req.body;
  try {
    const query = `
      UPDATE clientes SET 
        "nome" = $1, "email" = $2, "telefone" = $3, "dataAtualizacao" = $4, "diaFechamento" = $5
      WHERE "id" = $6 AND "empresaId" = $7 RETURNING *;
    `;
    const { rows } = await pool.query(query, [c.nome, c.email, c.telefone, c.dataAtualizacao, c.diaFechamento || 17, req.params.id, req.user.empresaId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/clientes/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM clientes WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- PROJETOS ---
app.get('/api/projetos', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM projetos WHERE "empresaId" = $1', [req.user.empresaId]);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/projetos', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao", "empresaId", "usuarioId", "colunasKanban")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;
    `;
    const colDefault = JSON.stringify(p.colunasKanban || ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído']);
    const { rows } = await pool.query(query, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao, req.user.empresaId, req.user.id, colDefault]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/projetos/:id', async (req, res) => {
  const p = req.body;
  try {
    const query = `
      UPDATE projetos SET 
        "clienteId" = $1, "nome" = $2, "descricao" = $3, "valorHora" = $4, "dataAtualizacao" = $5, "colunasKanban" = $6
      WHERE "id" = $7 AND "empresaId" = $8 RETURNING *;
    `;
    const colunas = p.colunasKanban ? JSON.stringify(p.colunasKanban) : null;
    const { rows } = await pool.query(query, [p.clienteId, p.nome, p.descricao, p.valorHora, p.dataAtualizacao, colunas, req.params.id, req.user.empresaId]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/projetos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM projetos WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- ATIVIDADES ---
// GET /api/atividades?ativo=true|false|all
app.get('/api/atividades', async (req, res) => {
  try {
    const { ativo } = req.query;
    let whereAtivo = '';
    if (ativo === 'true')  whereAtivo = ' AND a."ativo" = true';
    if (ativo === 'false') whereAtivo = ' AND a."ativo" = false';
    const { rows } = await pool.query(
      `SELECT a.*, u."nome" AS "responsavelNome"
       FROM atividades a
       LEFT JOIN usuarios u ON u."id" = a."responsavelId"
       WHERE a."empresaId" = $1${whereAtivo}
       ORDER BY a."nome" ASC`,
      [req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Mantém rota legada por projetoId usada pelo Kanban
app.get('/api/atividades/:projetoId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT a.*, u."nome" AS "responsavelNome"
       FROM atividades a
       LEFT JOIN usuarios u ON u."id" = a."responsavelId"
       WHERE a."projetoId" = $1 AND a."empresaId" = $2
       ORDER BY a."nome" ASC`,
      [req.params.projetoId, req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/atividades', async (req, res) => {
  const a = req.body;
  try {
    const query = `
      INSERT INTO atividades ("id", "empresaId", "usuarioId", "projetoId", "nome", "descricao", "cor", "responsavelId", "ativo", "dataCriacao", "dataAtualizacao")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      a.id || require('crypto').randomUUID(),
      req.user.empresaId, req.user.id,
      a.projetoId || null, a.nome, a.descricao || '',
      a.cor || '#f97316', a.responsavelId || null,
      true,
      a.dataCriacao || new Date().toISOString(), new Date().toISOString()
    ]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/atividades/:id', async (req, res) => {
  const a = req.body;
  try {
    // toggle ativo ou edição completa
    if (Object.prototype.hasOwnProperty.call(a, 'ativo') && Object.keys(a).length === 1) {
      const { rows } = await pool.query(
        `UPDATE atividades SET "ativo" = $1, "dataAtualizacao" = $2 WHERE "id" = $3 AND "empresaId" = $4 RETURNING *;`,
        [a.ativo, new Date().toISOString(), req.params.id, req.user.empresaId]
      );
      return res.json(rows[0]);
    }
    const { rows } = await pool.query(
      `UPDATE atividades SET "nome" = $1, "descricao" = $2, "cor" = $3, "responsavelId" = $4, "dataAtualizacao" = $5
       WHERE "id" = $6 AND "empresaId" = $7 RETURNING *;`,
      [a.nome, a.descricao || '', a.cor || '#f97316', a.responsavelId || null,
       new Date().toISOString(), req.params.id, req.user.empresaId]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/atividades/:id', async (req, res) => {
  try {
    // Verifica se há lançamentos vinculados
    const { rows: usages } = await pool.query(
      `SELECT COUNT(*) AS cnt FROM lancamentos WHERE "atividadeId" = $1 AND "empresaId" = $2`,
      [req.params.id, req.user.empresaId]
    );
    if (parseInt(usages[0].cnt) > 0) {
      return res.status(409).json({ error: 'Atividade possui lançamentos vinculados. Desative-a em vez de excluir.' });
    }
    await pool.query('DELETE FROM atividades WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- TAREFAS (KANBAN + BACKLOG) ---

// GET /api/backlog?clienteId=&projetoId=&epicoId=&featureId=&search= — todos os itens da árvore com filtros opcionais
app.get('/api/backlog', async (req, res) => {
  try {
    const { clienteId, projetoId, epicoId, featureId, search } = req.query;
    const conditions = [`t."empresaId" = $1`];
    const params = [req.user.empresaId];
    let idx = 2;

    if (clienteId)  { conditions.push(`c.id = $${idx++}`);            params.push(clienteId); }
    if (projetoId)  { conditions.push(`t."projetoId" = $${idx++}`);   params.push(projetoId); }
    if (search)     { conditions.push(`t.titulo ILIKE $${idx++}`);    params.push(`%${search}%`); }

    // Para filtros de épico/feature: busca os ids de todos os itens afetados + seus ancestrais e descendentes
    // Estratégia: busca primeiro os itens que batem no filtro folha, depois inclui toda a árvore deles
    let extraIds = null;
    if (epicoId || featureId) {
      // Busca todos os itens do(s) projeto(s) para montar a árvore no servidor
      const projetoCondition = projetoId ? `AND t."projetoId" = $2` : '';
      const projetoParam = projetoId ? [req.user.empresaId, projetoId] : [req.user.empresaId];
      const { rows: allRows } = await pool.query(
        `SELECT id, "parentId", tipo FROM tarefas WHERE "empresaId" = $1 ${projetoCondition}`,
        projetoParam
      );
      // Monta mapa de descendentes
      const childMap = {};
      allRows.forEach(r => {
        if (r.parentId) {
          if (!childMap[r.parentId]) childMap[r.parentId] = [];
          childMap[r.parentId].push(r.id);
        }
      });
      // Pega todos descendentes recursivamente
      const collectDescendants = (id, acc) => {
        acc.add(id);
        (childMap[id] || []).forEach(cid => collectDescendants(cid, acc));
      };
      extraIds = new Set();
      const rootId = featureId || epicoId;
      collectDescendants(rootId, extraIds);
      // Inclui o próprio nó raiz e seus ancestrais para manter a árvore navegável
      const parentMap = {};
      allRows.forEach(r => { parentMap[r.id] = r.parentId; });
      let cur = parentMap[rootId];
      while (cur) { extraIds.add(cur); cur = parentMap[cur]; }
    }

    if (extraIds) {
      conditions.push(`t.id = ANY($${idx++})`);
      params.push(Array.from(extraIds));
    }

    const { rows } = await pool.query(
      `SELECT t.* FROM tarefas t
       LEFT JOIN projetos p ON p.id = t."projetoId"
       LEFT JOIN clientes c ON c.id = p."clienteId"
       WHERE ${conditions.join(' AND ')}
       ORDER BY t."tipo" ASC, t."ordem" ASC`,
      params
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/tarefas/:projetoId', async (req, res) => {
  try {
    const atividadeId = req.query.atividadeId;
    let query, params;
    if (atividadeId) {
      // Kanban: apenas tasks da atividade selecionada
      query = 'SELECT * FROM tarefas WHERE "projetoId" = $1 AND "atividadeId" = $2 AND "empresaId" = $3 AND ("tipo" = \'task\' OR "tipo" IS NULL) ORDER BY "ordem" ASC';
      params = [req.params.projetoId, atividadeId, req.user.empresaId];
    } else {
      // Backlog: todos os tipos para montar a árvore
      query = 'SELECT * FROM tarefas WHERE "projetoId" = $1 AND "empresaId" = $2 ORDER BY "tipo" ASC, "ordem" ASC';
      params = [req.params.projetoId, req.user.empresaId];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tarefas', async (req, res) => {
  const t = req.body;
  try {
    const query = `
      INSERT INTO tarefas ("id", "empresaId", "usuarioId", "projetoId", "atividadeId", "responsavelId",
        "coluna", "titulo", "descricao", "ordem",
        "tipo", "parentId", "status", "prioridade", "estimativaHoras", "tags",
        "dataInicio", "dataPrevisao", "dataEntrega", "dataCriacao", "dataAtualizacao")
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21) RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      t.id, req.user.empresaId, req.user.id, t.projetoId,
      t.atividadeId || null, t.responsavelId || null,
      t.coluna || 'Backlog', t.titulo, t.descricao || '', t.ordem || 0,
      t.tipo || 'task', t.parentId || null, t.status || 'Planejado',
      t.prioridade || 3, t.estimativaHoras || null, t.tags || null,
      t.dataInicio || null, t.dataPrevisao || null, t.dataEntrega || null,
      t.dataCriacao || new Date().toISOString(), t.dataAtualizacao || new Date().toISOString()
    ]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tarefas/:id', async (req, res) => {
  const t = req.body;
  try {
    const query = `
      UPDATE tarefas SET 
        "coluna" = $1, "titulo" = $2, "descricao" = $3, "ordem" = $4,
        "dataInicio" = $5, "dataPrevisao" = $6, "dataEntrega" = $7, "dataAtualizacao" = $8,
        "responsavelId" = $9, "tipo" = $10, "parentId" = $11, "status" = $12,
        "prioridade" = $13, "estimativaHoras" = $14, "tags" = $15
      WHERE "id" = $16 AND "empresaId" = $17 RETURNING *;
    `;
    const { rows } = await pool.query(query, [
      t.coluna || 'Backlog', t.titulo, t.descricao || '', t.ordem || 0,
      t.dataInicio || null, t.dataPrevisao || null, t.dataEntrega || null,
      new Date().toISOString(), t.responsavelId || null,
      t.tipo || 'task', t.parentId || null, t.status || 'Planejado',
      t.prioridade || 3, t.estimativaHoras || null, t.tags || null,
      req.params.id, req.user.empresaId
    ]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- COMENTÁRIOS DE TAREFAS ---
app.get('/api/tarefas/:id/comentarios', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT c.*, u."nome" AS "autorNome"
      FROM tarefas_comentarios c
      LEFT JOIN usuarios u ON u."id" = c."usuarioId"
      WHERE c."tarefaId" = $1 AND c."empresaId" = $2
      ORDER BY c."dataCriacao" ASC`,
      [req.params.id, req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/tarefas/:id/comentarios', async (req, res) => {
  const { texto } = req.body;
  if (!texto || !texto.trim()) return res.status(400).json({ error: 'Texto obrigatório.' });
  try {
    const id = require('crypto').randomUUID();
    const { rows } = await pool.query(`
      INSERT INTO tarefas_comentarios ("id", "empresaId", "tarefaId", "usuarioId", "texto", "dataCriacao")
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [id, req.user.empresaId, req.params.id, req.user.id, texto.trim(), new Date().toISOString()]
    );
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/comentarios/:id', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT "usuarioId" FROM tarefas_comentarios WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Comentário não encontrado.' });
    if (rows[0].usuarioId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Sem permissão.' });
    await pool.query('DELETE FROM tarefas_comentarios WHERE "id" = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/tarefas-reordenar', async (req, res) => {
  const { tarefas } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const t of tarefas) {
      await client.query(
        'UPDATE tarefas SET "coluna" = $1, "ordem" = $2, "dataAtualizacao" = $3 WHERE "id" = $4 AND "empresaId" = $5',
        [t.coluna, t.ordem, new Date().toISOString(), t.id, req.user.empresaId]
      );
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

app.delete('/api/tarefas/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tarefas WHERE "id" = $1 AND "empresaId" = $2', [req.params.id, req.user.empresaId]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- BOARD CROSS-PROJECT (Kanban redesign) ---
// GET /api/tarefas-board?clienteId=&projetoId=&epicoId=&featureId=&responsavelId=&prioridade=&search=&coluna=
app.get('/api/tarefas-board', async (req, res) => {
  try {
    const { clienteId, projetoId, epicoId, featureId, responsavelId, prioridade, search, coluna } = req.query;
    const conditions = [`t."empresaId" = $1`, `(t.tipo = 'task' OR t.tipo IS NULL)`];
    const params = [req.user.empresaId];
    let idx = 2;

    if (clienteId)     { conditions.push(`c.id = $${idx++}`);             params.push(clienteId); }
    if (projetoId)     { conditions.push(`t."projetoId" = $${idx++}`);    params.push(projetoId); }
    if (epicoId)       {
      conditions.push(`(p1.id = $${idx} OR p2.id = $${idx} OR p3.id = $${idx})`);
      params.push(epicoId); idx++;
    }
    if (featureId)     {
      // task → parentId → feature (direto) ou task → userstory → parentId → feature
      conditions.push(`(p1.id = $${idx} OR p2.id = $${idx})`);
      params.push(featureId); idx++;
    }
    if (responsavelId) { conditions.push(`t."responsavelId" = $${idx++}`); params.push(parseInt(responsavelId)); }
    if (prioridade)    { conditions.push(`t.prioridade = $${idx++}`);      params.push(parseInt(prioridade)); }
    if (search)        { conditions.push(`t.titulo ILIKE $${idx++}`);      params.push(`%${search}%`); }
    if (coluna)        { conditions.push(`t.coluna = $${idx++}`);          params.push(coluna); }

    const query = `
      SELECT
        t.*,
        p.nome   AS "projetoNome",
        c.nome   AS "clienteNome",
        u.nome   AS "responsavelNome",
        p."colunasKanban" AS "projetoColunasKanban",
        COALESCE(
          CASE WHEN p1.tipo = 'epic' THEN p1.titulo END,
          CASE WHEN p2.tipo = 'epic' THEN p2.titulo END,
          CASE WHEN p3.tipo = 'epic' THEN p3.titulo END
        ) AS "epicoTitulo",
        COALESCE(
          CASE WHEN p1.tipo = 'epic' THEN p1.id END,
          CASE WHEN p2.tipo = 'epic' THEN p2.id END,
          CASE WHEN p3.tipo = 'epic' THEN p3.id END
        ) AS "epicoId"
      FROM tarefas t
      LEFT JOIN projetos p  ON p.id = t."projetoId"
      LEFT JOIN clientes c  ON c.id = p."clienteId"
      LEFT JOIN usuarios u  ON u.id = t."responsavelId"
      LEFT JOIN tarefas p1  ON p1.id = t."parentId"           AND p1."empresaId" = t."empresaId"
      LEFT JOIN tarefas p2  ON p2.id = p1."parentId"          AND p2."empresaId" = t."empresaId"
      LEFT JOIN tarefas p3  ON p3.id = p2."parentId"          AND p3."empresaId" = t."empresaId"
      WHERE ${conditions.join(' AND ')}
      ORDER BY t."dataCriacao" DESC
    `;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/epicos/:projetoId — épicos de um projeto (para populates de modais)
app.get('/api/epicos/:projetoId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, titulo FROM tarefas
       WHERE "projetoId" = $1 AND "empresaId" = $2 AND tipo = 'epic'
       ORDER BY titulo ASC`,
      [req.params.projetoId, req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/features/:epicoId — features filhas de um épico
app.get('/api/features/:epicoId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, titulo FROM tarefas
       WHERE "parentId" = $1 AND "empresaId" = $2 AND tipo = 'feature'
       ORDER BY titulo ASC`,
      [req.params.epicoId, req.user.empresaId]
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- LANÇAMENTOS ---
// REGRA: Admin vê tudo; membro vê tudo se grupo tiver 'verTodosLancamentos', senão só os seus
app.get('/api/lancamentos', async (req, res) => {
  try {
    let verTodos = req.user.role === 'admin';
    if (!verTodos && req.user.grupoId) {
      const { rows: gRows } = await pool.query(
        'SELECT secoes FROM grupos_permissoes WHERE id = $1 AND "empresaId" = $2',
        [req.user.grupoId, req.user.empresaId]
      );
      if (gRows.length && (gRows[0].secoes || []).includes('verTodosLancamentos')) verTodos = true;
    }
    let query, params;
    if (verTodos) {
        query = 'SELECT * FROM lancamentos WHERE "empresaId" = $1';
        params = [req.user.empresaId];
    } else {
        query = 'SELECT * FROM lancamentos WHERE "empresaId" = $1 AND "usuarioId" = $2';
        params = [req.user.empresaId, req.user.id];
    }
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/lancamentos', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "atividade", "atividadeId", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao", "empresaId", "usuarioId")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.atividade, l.atividadeId || null, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao, req.user.empresaId, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/lancamentos/:id', async (req, res) => {
  const l = req.body;
  try {
    const query = `
      UPDATE lancamentos SET 
        "projetoId" = $1, "data" = $2, "horaInicio" = $3, "horaFim" = $4, "duracao" = $5, "atividade" = $6, "atividadeId" = $7, "descricao" = $8, "valorTotal" = $9, "dataAtualizacao" = $10
      WHERE "id" = $11 AND "empresaId" = $12 AND "usuarioId" = $13 RETURNING *;
    `;
    const { rows } = await pool.query(query, [l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.atividade, l.atividadeId || null, l.descricao, l.valorTotal, l.dataAtualizacao, req.params.id, req.user.empresaId, req.user.id]);
    res.json(rows[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/lancamentos/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM lancamentos WHERE "id" = $1 AND "empresaId" = $2 AND "usuarioId" = $3', [req.params.id, req.user.empresaId, req.user.id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- MIGRAÇÃO Upsert ---
app.post('/api/migrar', async (req, res) => {
  const { clientes, projetos, lancamentos } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    for (const c of (clientes || [])) {
      await client.query(`
        INSERT INTO clientes ("id", "nome", "email", "telefone", "dataCadastro", "dataAtualizacao", "empresaId", "usuarioId", "diaFechamento")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT ("id") DO UPDATE SET
          "nome" = EXCLUDED."nome", "email" = EXCLUDED."email",
          "telefone" = EXCLUDED."telefone", "dataAtualizacao" = EXCLUDED."dataAtualizacao",
          "empresaId" = EXCLUDED."empresaId", "diaFechamento" = EXCLUDED."diaFechamento";
      `, [c.id, c.nome, c.email, c.telefone, c.dataCadastro, c.dataAtualizacao, req.user.empresaId, req.user.id, c.diaFechamento || 17]);
    }
    
    for (const p of (projetos || [])) {
      const colunasDefault = JSON.stringify(p.colunasKanban || ['Backlog', 'A Fazer', 'Em Andamento', 'Revisão', 'Concluído']);
      await client.query(`
        INSERT INTO projetos ("id", "clienteId", "nome", "descricao", "valorHora", "dataCadastro", "dataAtualizacao", "empresaId", "usuarioId", "colunasKanban")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT ("id") DO UPDATE SET
          "clienteId" = EXCLUDED."clienteId", "nome" = EXCLUDED."nome",
          "descricao" = EXCLUDED."descricao", "valorHora" = EXCLUDED."valorHora",
          "dataAtualizacao" = EXCLUDED."dataAtualizacao", "empresaId" = EXCLUDED."empresaId",
          "colunasKanban" = EXCLUDED."colunasKanban";
      `, [p.id, p.clienteId, p.nome, p.descricao, p.valorHora, p.dataCadastro, p.dataAtualizacao, req.user.empresaId, req.user.id, colunasDefault]);
    }
    
    for (const l of (lancamentos || [])) {
      await client.query(`
        INSERT INTO lancamentos ("id", "projetoId", "data", "horaInicio", "horaFim", "duracao", "atividade", "descricao", "valorTotal", "dataLancamento", "dataAtualizacao", "empresaId", "usuarioId")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT ("id") DO UPDATE SET
          "projetoId" = EXCLUDED."projetoId", "data" = EXCLUDED."data",
          "horaInicio" = EXCLUDED."horaInicio", "horaFim" = EXCLUDED."horaFim",
          "duracao" = EXCLUDED."duracao", "atividade" = EXCLUDED."atividade", "descricao" = EXCLUDED."descricao",
          "valorTotal" = EXCLUDED."valorTotal", "dataAtualizacao" = EXCLUDED."dataAtualizacao", "empresaId" = EXCLUDED."empresaId";
      `, [l.id, l.projetoId, l.data, l.horaInicio, l.horaFim, l.duracao, l.atividade, l.descricao, l.valorTotal, l.dataLancamento, l.dataAtualizacao, req.user.empresaId, req.user.id]);
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
