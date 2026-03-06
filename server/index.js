import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import jwt from 'jsonwebtoken'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// Configurações de Login seguras via variáveis de ambiente SEM fallback
const ADMIN_USER = process.env.ADMIN_USER
const ADMIN_PASS = process.env.ADMIN_PASS
const JWT_SECRET = process.env.JWT_SECRET

// Trava de segurança: se as variáveis não existirem, o servidor se recusa a iniciar.
if (!ADMIN_USER || !ADMIN_PASS || !JWT_SECRET) {
  console.error('\n❌ ERRO FATAL DE SEGURANÇA:')
  console.error('As variáveis ADMIN_USER, ADMIN_PASS e JWT_SECRET não estão configuradas.')
  console.error('Crie um arquivo .env na raiz do projeto contendo essas chaves.')
  process.exit(1) // Derruba o servidor
}

app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, '../dist')))

// POST /api/login — gera token de acesso
app.post('/api/login', (req, res) => {
  const { username, password } = req.body
  if (username === ADMIN_USER && password === ADMIN_PASS) {
    const token = jwt.sign({ user: username }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token })
  } else {
    res.status(401).json({ error: 'Usuário ou senha inválidos' })
  }
})

// Middleware de Autenticação
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido' })

  const token = authHeader.split(' ')[1]
  try {
    jwt.verify(token, JWT_SECRET)
    next()
  } catch (err) {
    res.status(401).json({ error: 'Token inválido' })
  }
}

// GET /api/state — carrega o estado do banco (Protegido)
app.get('/api/state', requireAuth, async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM app_state WHERE key = 'ch_v2'")
    res.json(result.rows.length > 0 ? result.rows[0].data : {})
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao carregar dados' })
  }
})

// POST /api/state — salva/atualiza o estado (Protegido)
app.post('/api/state', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `INSERT INTO app_state (key, data, updated_at)
       VALUES ('ch_v2', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET data = $1, updated_at = NOW()`,
      [req.body]
    )
    res.json({ ok: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao salvar dados' })
  }
})

// SPA fallback
app.use((req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
