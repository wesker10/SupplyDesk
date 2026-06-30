import { DatabaseSync } from 'node:sqlite'
import pg from 'pg'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync('/opt/talabati/secrets/postgres.env', 'utf8')
  .split(/\n+/)
  .filter(Boolean)
  .map((line) => {
    const index = line.indexOf('=')
    return [line.slice(0, index), line.slice(index + 1)]
  }))

const sqlitePath = process.argv[2] || '/opt/talabati/data/talabati.sqlite'
const sqlite = new DatabaseSync(sqlitePath, { readOnly: true })
const pool = new pg.Pool({
  host: '127.0.0.1',
  port: 5432,
  database: env.POSTGRES_DB,
  user: env.POSTGRES_USER,
  password: env.POSTGRES_PASSWORD,
})

function rows(table) {
  return sqlite.prepare(`SELECT * FROM ${table}`).all()
}

async function main() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('TRUNCATE auth_attempts, app_settings, suppliers, orders')

    for (const row of rows('orders')) {
      await client.query(`
        INSERT INTO orders (
          id, title, lpo, supplier, department, owners, priority, status,
          expected_date, amount, currency, payments, updates, archived_at, deleted_at, archive_year,
          created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18)
      `, [
        row.id, row.title, row.lpo || '', row.supplier, row.department || 'غير محدد', row.owners || '[]',
        row.priority || 'عادي', row.status || 'طلب جديد', row.expected_date || '', Number(row.amount || 0),
        row.currency || 'QAR', row.payments || '[]', row.updates || '[]', row.archived_at || '', row.deleted_at || '',
        row.archive_year || '', row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString(),
      ])
    }

    for (const row of rows('suppliers')) {
      await client.query(`
        INSERT INTO suppliers (id, name, contact, phone, email, rating, notes, created_at, updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      `, [row.id, row.name, row.contact || '', row.phone || '', row.email || '', row.rating || 'جيد', row.notes || '', row.created_at || new Date().toISOString(), row.updated_at || new Date().toISOString()])
    }

    for (const row of rows('app_settings')) {
      await client.query('INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,$3)', [row.key, row.value, row.updated_at || new Date().toISOString()])
    }

    try {
      for (const row of rows('auth_attempts')) {
        await client.query('INSERT INTO auth_attempts (client_key, failed_count, locked_until, updated_at) VALUES ($1,$2,$3,$4)', [row.client_key, Number(row.failed_count || 0), row.locked_until || '', row.updated_at || new Date().toISOString()])
      }
    } catch (error) {
      if (!String(error.message).includes('no such table')) throw error
    }

    const counts = {}
    for (const table of ['orders', 'suppliers', 'app_settings', 'auth_attempts']) {
      const { rows } = await client.query(`SELECT COUNT(*)::int AS count FROM ${table}`)
      counts[table] = rows[0].count
    }
    await client.query('COMMIT')
    console.log(JSON.stringify({ ok: true, counts }, null, 2))
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
    await pool.end()
    sqlite.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
