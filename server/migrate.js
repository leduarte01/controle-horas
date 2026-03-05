import pool from './db.js'

async function migrate() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      key        TEXT PRIMARY KEY,
      data       JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `)
  console.log('Migration OK')
  await pool.end()
}

migrate().catch(err => { console.error('Migration failed:', err); process.exit(1) })
