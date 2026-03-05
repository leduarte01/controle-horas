import express from 'express'
import cors from 'cors'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pool from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(join(__dirname, '../dist')))

// GET /api/state — carrega o estado do banco
app.get('/api/state', async (req, res) => {
  try {
    const result = await pool.query("SELECT data FROM app_state WHERE key = 'ch_v2'")
    res.json(result.rows.length > 0 ? result.rows[0].data : {})
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao carregar dados' })
  }
})

// POST /api/state — salva/atualiza o estado
app.post('/api/state', async (req, res) => {
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
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'))
})

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`))
