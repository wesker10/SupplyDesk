import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import pg from 'pg'
import { createOrder, orders as seedOrders, suppliers as seedSuppliers, updateOrder, currentBudgetYear, nextBudgetCategoryId, budgetCategoryUsage } from './talabatiLogic.js'

const { Pool } = pg

const defaultSettings = {
  heroTitle: 'Procurement Requests, Clear Control',
  departmentBudget: '0',
  authEnabled: 'false',
  lockDurationMinutes: '60',
  passwordHash: '',
  hiddenSuggestions: '{}',
  currencyCode: 'QAR',
  currencySymbol: 'ر.ق',
  emailNotificationsEnabled: 'false',
  emailRecipient: '',
  emailTheme: 'talabati',
}

function yearFromDate(value) {
  const match = String(value || '').match(/^(\d{4})/)
  return match ? match[1] : String(new Date().getFullYear())
}

function serializeOrder(order) {
  return {
    ...order,
    owners: order.owners || [],
    payments: order.payments || [],
    updates: order.updates || [],
    archivedAt: order.archivedAt || '',
    deletedAt: order.deletedAt || '',
    budgetYear: order.budgetYear || currentBudgetYear(),
    budgetCategoryId: order.budgetCategoryId || '',
    archiveYear: order.archiveYear || '',
  }
}

function deserializeOrder(row) {
  if (!row) return null
  return {
    id: row.id,
    title: row.title,
    lpo: row.lpo || '',
    requestNumber: row.request_number || '',
    requester: row.requester || '',
    paymentNumber: row.payment_number || '',
    budgetYear: row.budget_year || currentBudgetYear(),
    budgetCategoryId: row.budget_category_id || '',
    supplier: row.supplier,
    department: row.department,
    owners: Array.isArray(row.owners) ? row.owners : JSON.parse(row.owners || '[]'),
    priority: row.priority,
    status: row.status,
    expectedDate: row.expected_date || '',
    amount: Number(row.amount || 0),
    currency: row.currency || 'QAR',
    payments: Array.isArray(row.payments) ? row.payments : JSON.parse(row.payments || '[]'),
    updates: Array.isArray(row.updates) ? row.updates : JSON.parse(row.updates || '[]'),
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at,
    archivedAt: row.archived_at || '',
    deletedAt: row.deleted_at || '',
    archiveYear: row.archive_year || (row.archived_at ? yearFromDate(row.created_at) : ''),
  }
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params)
  return result.rows[0]
}

async function all(db, sql, params = []) {
  const result = await db.query(sql, params)
  return result.rows
}

async function run(db, sql, params = []) {
  return db.query(sql, params)
}

async function insertOrder(db, order) {
  const o = serializeOrder(order)
  await run(db, `
    INSERT INTO orders (
      id, title, lpo, request_number, requester, payment_number, budget_year, budget_category_id, supplier, department, owners, priority, status,
      expected_date, amount, currency, payments, updates, archived_at, deleted_at, archive_year
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13,$14,$15,$16,$17::jsonb,$18::jsonb,$19,$20,$21)
  `, [o.id, o.title, o.lpo, o.requestNumber || '', o.requester || '', o.paymentNumber || '', o.budgetYear || currentBudgetYear(), o.budgetCategoryId || '', o.supplier, o.department, JSON.stringify(o.owners), o.priority, o.status, o.expectedDate, o.amount, o.currency, JSON.stringify(o.payments), JSON.stringify(o.updates), o.archivedAt, o.deletedAt, o.archiveYear])
  return getOrderRecord(db, order.id)
}

async function replaceOrder(db, order) {
  const o = serializeOrder(order)
  await run(db, `
    UPDATE orders
    SET title=$1, lpo=$2, request_number=$3, requester=$4, payment_number=$5, budget_year=$6, budget_category_id=$7, supplier=$8, department=$9, owners=$10::jsonb, priority=$11,
        status=$12, expected_date=$13, amount=$14, currency=$15, payments=$16::jsonb, updates=$17::jsonb,
        archived_at=$18, deleted_at=$19, archive_year=$20, updated_at=CURRENT_TIMESTAMP
    WHERE id=$21
  `, [o.title, o.lpo, o.requestNumber || '', o.requester || '', o.paymentNumber || '', o.budgetYear || currentBudgetYear(), o.budgetCategoryId || '', o.supplier, o.department, JSON.stringify(o.owners), o.priority, o.status, o.expectedDate, o.amount, o.currency, JSON.stringify(o.payments), JSON.stringify(o.updates), o.archivedAt, o.deletedAt, o.archiveYear, o.id])
  return getOrderRecord(db, order.id)
}

export async function initializeDatabase(db) {
  await run(db, `
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      lpo TEXT DEFAULT '',
      request_number TEXT DEFAULT '',
      requester TEXT DEFAULT '',
      payment_number TEXT DEFAULT '',
      budget_year TEXT DEFAULT '',
      budget_category_id TEXT DEFAULT '',
      supplier TEXT NOT NULL,
      department TEXT DEFAULT 'غير محدد',
      owners JSONB NOT NULL DEFAULT '[]'::jsonb,
      priority TEXT NOT NULL DEFAULT 'عادي',
      status TEXT NOT NULL DEFAULT 'طلب جديد',
      expected_date TEXT DEFAULT '',
      amount NUMERIC NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'QAR',
      payments JSONB NOT NULL DEFAULT '[]'::jsonb,
      updates JSONB NOT NULL DEFAULT '[]'::jsonb,
      archived_at TEXT DEFAULT '',
      deleted_at TEXT DEFAULT '',
      archive_year TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await run(db, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS request_number TEXT DEFAULT ''`)
  await run(db, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS requester TEXT DEFAULT ''`)
  await run(db, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_number TEXT DEFAULT ''`)
  await run(db, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS budget_year TEXT DEFAULT '${currentBudgetYear()}'`)
  await run(db, `ALTER TABLE orders ADD COLUMN IF NOT EXISTS budget_category_id TEXT DEFAULT ''`)
  await run(db, `CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      contact TEXT DEFAULT '', phone TEXT DEFAULT '', email TEXT DEFAULT '', rating TEXT DEFAULT 'جيد', notes TEXT DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`)
  await run(db, `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  await run(db, `CREATE TABLE IF NOT EXISTS auth_attempts (client_key TEXT PRIMARY KEY, failed_count INTEGER NOT NULL DEFAULT 0, locked_until TEXT DEFAULT '', updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  await run(db, `CREATE TABLE IF NOT EXISTS budget_years (year TEXT PRIMARY KEY, budget NUMERIC NOT NULL DEFAULT 0, notes TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP)`)
  await run(db, `CREATE TABLE IF NOT EXISTS budget_categories (id TEXT PRIMARY KEY, year TEXT NOT NULL, name TEXT NOT NULL, allocated_amount NUMERIC NOT NULL DEFAULT 0, notes TEXT DEFAULT '', created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, UNIQUE(year, name))`)

  const count = Number((await one(db, 'SELECT COUNT(*) AS count FROM orders')).count)
  if (count === 0) {
    await run(db, 'BEGIN')
    try {
      for (const order of seedOrders) await insertOrder(db, order)
      await run(db, 'COMMIT')
    } catch (error) {
      await run(db, 'ROLLBACK')
      throw error
    }
  }
  const supplierCount = Number((await one(db, 'SELECT COUNT(*) AS count FROM suppliers')).count)
  if (supplierCount === 0) {
    for (const supplier of seedSuppliers) await insertSupplier(db, { ...supplier, id: nextSupplierId(await listSupplierRecords(db)) })
  }
  await seedDefaultSettings(db)
  await seedDefaultBudgetYear(db)
}

export async function listOrderRecords(db) { return (await all(db, "SELECT * FROM orders WHERE COALESCE(archived_at, '') = '' AND COALESCE(deleted_at, '') = '' ORDER BY id ASC")).map(deserializeOrder) }
export async function listArchivedOrderRecords(db) { return (await all(db, "SELECT * FROM orders WHERE COALESCE(archived_at, '') != '' AND COALESCE(deleted_at, '') = '' ORDER BY archived_at DESC, id ASC")).map(deserializeOrder) }
export async function listDeletedOrderRecords(db) { return (await all(db, "SELECT * FROM orders WHERE COALESCE(deleted_at, '') != '' ORDER BY deleted_at DESC, id ASC")).map(deserializeOrder) }
export async function listAllOrderRecords(db) { return (await all(db, 'SELECT * FROM orders ORDER BY id ASC')).map(deserializeOrder) }
export async function getOrderRecord(db, id) { return deserializeOrder(await one(db, 'SELECT * FROM orders WHERE id = $1', [id])) }

export async function createOrderRecord(db, form = {}) { return insertOrder(db, createOrder(await listAllOrderRecords(db), form)) }
export async function updateOrderRecord(db, orderId, patch = {}) {
  const existing = await getOrderRecord(db, orderId)
  if (!existing) return null
  const [updated] = updateOrder([existing], orderId, patch).filter((order) => order.id === orderId)
  const archiveYear = patch.archiveYear === undefined ? updated.archiveYear : String(patch.archiveYear || '').trim()
  return replaceOrder(db, { ...updated, archiveYear })
}
function nowIso() { return new Date().toISOString() }
export async function archiveOrderRecord(db, orderId) { const order = await getOrderRecord(db, orderId); return order ? replaceOrder(db, { ...order, archivedAt: nowIso(), deletedAt: '', archiveYear: order.archiveYear || yearFromDate(order.createdAt) }) : null }
export async function softDeleteOrderRecord(db, orderId) { const order = await getOrderRecord(db, orderId); return order ? replaceOrder(db, { ...order, deletedAt: nowIso() }) : null }
export async function restoreOrderRecord(db, orderId) { const order = await getOrderRecord(db, orderId); return order ? replaceOrder(db, { ...order, archivedAt: '', deletedAt: '', archiveYear: '' }) : null }
export async function deleteOrderForeverRecord(db, orderId) { const result = await run(db, 'DELETE FROM orders WHERE id = $1', [orderId]); return result.rowCount > 0 }

function nextPaymentId(payments = []) { const max = payments.reduce((highest, payment) => { const match = String(payment.id || '').match(/PAY-(\d+)/); return match ? Math.max(highest, Number(match[1])) : highest }, payments.length); return `PAY-${max + 1}` }
function normalizePayment(payment = {}, existingPayment = {}) { return { id: existingPayment.id || payment.id || 'PAY-1', name: payment.name?.trim() || existingPayment.name || 'دفعة جديدة', percentage: Number(payment.percentage ?? existingPayment.percentage ?? 100), amount: Number(payment.amount ?? existingPayment.amount ?? 0), status: payment.status || existingPayment.status || 'لم تستحق', dueDate: payment.dueDate || existingPayment.dueDate || new Date().toISOString().slice(0, 10) } }
export async function addPaymentRecord(db, orderId, payment = {}) { const order = await getOrderRecord(db, orderId); if (!order) return null; return replaceOrder(db, { ...order, payments: [...(order.payments || []), normalizePayment({ ...payment, id: nextPaymentId(order.payments) })] }) }
export async function updatePaymentRecord(db, orderId, paymentId, patch = {}) { const order = await getOrderRecord(db, orderId); if (!order) return null; const existingPayment = (order.payments || []).find((payment) => payment.id === paymentId); if (!existingPayment) return null; return replaceOrder(db, { ...order, payments: order.payments.map((payment) => payment.id === paymentId ? normalizePayment({ ...patch, id: paymentId }, existingPayment) : payment) }) }
export async function deletePaymentRecord(db, orderId, paymentId) { const order = await getOrderRecord(db, orderId); if (!order) return null; const payments = order.payments || []; if (!payments.some((payment) => payment.id === paymentId)) return null; return replaceOrder(db, { ...order, payments: payments.filter((payment) => payment.id !== paymentId) }) }

async function seedDefaultSettings(db) { for (const [key, value] of Object.entries(defaultSettings)) await run(db, 'INSERT INTO app_settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING', [key, value]) }
export async function getAppSettingsRecord(db) { const rows = await all(db, 'SELECT key, value FROM app_settings'); return { ...defaultSettings, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) } }
export async function updateAppSettingsRecord(db, patch = {}) { for (const [key, value] of Object.entries(patch)) { if (!(key in defaultSettings) || key === 'passwordHash') continue; await run(db, 'INSERT INTO app_settings (key, value, updated_at) VALUES ($1,$2,CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP', [key, String(value ?? defaultSettings[key])]) } return getAppSettingsRecord(db) }
function hashPassword(password, salt = randomBytes(16).toString('hex')) { const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex'); return `${salt}:${hash}` }
export async function setPasswordRecord(db, password) { const nextHash = hashPassword(String(password || '')); await run(db, "INSERT INTO app_settings (key, value, updated_at) VALUES ('passwordHash',$1,CURRENT_TIMESTAMP) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP", [nextHash]); return true }
export async function verifyPasswordRecord(db, password) { const { passwordHash } = await getAppSettingsRecord(db); if (!passwordHash) return false; const [salt, expectedHash] = String(passwordHash).split(':'); if (!salt || !expectedHash) return false; const actualHash = hashPassword(String(password || ''), salt).split(':')[1]; const expected = Buffer.from(expectedHash, 'hex'); const actual = Buffer.from(actualHash, 'hex'); return expected.length === actual.length && timingSafeEqual(expected, actual) }
export async function publicSettingsRecord(db) { const settings = await getAppSettingsRecord(db); const passwordSet = Boolean(settings.passwordHash); const { passwordHash: _passwordHash, ...publicSettings } = settings; return { ...publicSettings, passwordSet } }
export async function getAuthAttemptRecord(db, clientKey) { return await one(db, 'SELECT * FROM auth_attempts WHERE client_key = $1', [clientKey]) || { client_key: clientKey, failed_count: 0, locked_until: '' } }
export async function isClientLockedRecord(db, clientKey, now = new Date()) { const attempt = await getAuthAttemptRecord(db, clientKey); if (!attempt.locked_until) return { locked: false, lockedUntil: '' }; const lockedUntil = new Date(attempt.locked_until); if (Number.isNaN(lockedUntil.getTime()) || lockedUntil <= now) return { locked: false, lockedUntil: '' }; return { locked: true, lockedUntil: attempt.locked_until } }
export async function recordFailedLoginRecord(db, clientKey, lockDurationMinutes = 60, now = new Date()) { const current = await getAuthAttemptRecord(db, clientKey); const failedCount = Number(current.failed_count || 0) + 1; const lockedUntil = failedCount >= 3 ? new Date(now.getTime() + Number(lockDurationMinutes || 60) * 60_000).toISOString() : ''; await run(db, 'INSERT INTO auth_attempts (client_key, failed_count, locked_until, updated_at) VALUES ($1,$2,$3,CURRENT_TIMESTAMP) ON CONFLICT (client_key) DO UPDATE SET failed_count = EXCLUDED.failed_count, locked_until = EXCLUDED.locked_until, updated_at = CURRENT_TIMESTAMP', [clientKey, failedCount, lockedUntil]); return { failedCount, lockedUntil } }
export async function resetLoginAttemptsRecord(db, clientKey) { await run(db, 'DELETE FROM auth_attempts WHERE client_key = $1', [clientKey]) }

function deserializeSupplier(row, orderList = []) { if (!row) return null; const openOrders = orderList.filter((order) => order.supplier === row.name && order.status !== 'مكتمل').length; return { id: row.id, name: row.name, contact: row.contact || '', phone: row.phone || '', email: row.email || '', rating: row.rating || 'جيد', notes: row.notes || '', openOrders, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at, updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at } }
function nextSupplierId(suppliers = []) { const max = suppliers.reduce((highest, supplier) => { const match = String(supplier.id || '').match(/SUP-(\d+)/); return match ? Math.max(highest, Number(match[1])) : highest }, suppliers.length); return `SUP-${max + 1}` }
function normalizeSupplier(form = {}, existing = {}) { return { id: existing.id || form.id || 'SUP-1', name: form.name?.trim() || existing.name || 'مورد جديد', contact: form.contact?.trim() ?? existing.contact ?? '', phone: form.phone?.trim() ?? existing.phone ?? '', email: form.email?.trim() ?? existing.email ?? '', rating: form.rating || existing.rating || 'جيد', notes: form.notes?.trim() ?? existing.notes ?? '' } }
async function insertSupplier(db, supplier) { const s = normalizeSupplier(supplier); await run(db, 'INSERT INTO suppliers (id, name, contact, phone, email, rating, notes) VALUES ($1,$2,$3,$4,$5,$6,$7)', [s.id, s.name, s.contact, s.phone, s.email, s.rating, s.notes]); return getSupplierRecord(db, s.id) }
async function replaceSupplier(db, supplier) { const s = normalizeSupplier(supplier, supplier); await run(db, 'UPDATE suppliers SET name=$1, contact=$2, phone=$3, email=$4, rating=$5, notes=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7', [s.name, s.contact, s.phone, s.email, s.rating, s.notes, s.id]); return getSupplierRecord(db, s.id) }
export async function listSupplierRecords(db) { const orderList = await listOrderRecords(db); return (await all(db, 'SELECT * FROM suppliers ORDER BY id ASC')).map((row) => deserializeSupplier(row, orderList)) }
export async function getSupplierRecord(db, id) { return deserializeSupplier(await one(db, 'SELECT * FROM suppliers WHERE id = $1', [id]), await listOrderRecords(db)) }
export async function createSupplierRecord(db, form = {}) { const supplier = normalizeSupplier({ ...form, id: nextSupplierId(await listSupplierRecords(db)) }); return insertSupplier(db, supplier) }
export async function updateSupplierRecord(db, supplierId, patch = {}) { const current = await getSupplierRecord(db, supplierId); if (!current) return null; return replaceSupplier(db, normalizeSupplier(patch, current)) }
export async function deleteSupplierRecord(db, supplierId) { const current = await getSupplierRecord(db, supplierId); if (!current) return false; await run(db, 'DELETE FROM suppliers WHERE id = $1', [supplierId]); return true }

export async function openPostgresDatabase(connectionString = process.env.DATABASE_URL) {
  const pool = connectionString
    ? new Pool({ connectionString })
    : new Pool({
        host: process.env.PGHOST || '127.0.0.1',
        port: Number(process.env.PGPORT || 5432),
        database: process.env.PGDATABASE || 'talabati',
        user: process.env.PGUSER || 'talabati',
        password: process.env.PGPASSWORD,
      })
  await initializeDatabase(pool)
  return pool
}


function normalizeBudgetYear(form = {}, existing = {}) { return { year: String(form.year || existing.year || currentBudgetYear()), budget: Number(form.budget ?? existing.budget ?? 0) || 0, notes: form.notes ?? existing.notes ?? '' } }
async function seedDefaultBudgetYear(db) { const year = currentBudgetYear(); const exists = await one(db, 'SELECT year FROM budget_years WHERE year = $1', [year]); if (!exists) { const settings = await getAppSettingsRecord(db); await run(db, 'INSERT INTO budget_years (year, budget, notes) VALUES ($1,$2,$3)', [year, Number(settings.departmentBudget || 0), '']) } }
function deserializeBudgetYear(row, categories = []) { if (!row) return null; const yearCategories = categories.filter((category) => String(category.year) === String(row.year)); const allocated = yearCategories.reduce((sum, category) => sum + Number(category.allocatedAmount || 0), 0); const consumed = yearCategories.reduce((sum, category) => sum + Number(category.consumed || 0), 0); return { year: String(row.year), budget: Number(row.budget || 0), notes: row.notes || '', allocated, unallocated: Number(row.budget || 0) - allocated, consumed, remaining: Number(row.budget || 0) - consumed, createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at, updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at } }
async function rawBudgetCategories(db, year = '') { const rows = year ? await all(db, 'SELECT * FROM budget_categories WHERE year = $1 ORDER BY id ASC', [String(year)]) : await all(db, 'SELECT * FROM budget_categories ORDER BY year DESC, id ASC'); return rows.map((row) => ({ id: row.id, year: String(row.year), name: row.name, allocatedAmount: Number(row.allocated_amount || 0), notes: row.notes || '', createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at, updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : row.updated_at })) }
export async function listBudgetCategoryRecords(db, year = '') { return budgetCategoryUsage(await rawBudgetCategories(db, year), await listAllOrderRecords(db)) }
export async function listBudgetYearRecords(db) { const categories = await listBudgetCategoryRecords(db); return (await all(db, 'SELECT * FROM budget_years ORDER BY year DESC')).map((row) => deserializeBudgetYear(row, categories)) }
export async function getBudgetYearRecord(db, year) { const categories = await listBudgetCategoryRecords(db); return deserializeBudgetYear(await one(db, 'SELECT * FROM budget_years WHERE year = $1', [String(year)]), categories) }
export async function createBudgetYearRecord(db, form = {}) { const y = normalizeBudgetYear(form); await run(db, 'INSERT INTO budget_years (year, budget, notes) VALUES ($1,$2,$3) ON CONFLICT(year) DO UPDATE SET budget=EXCLUDED.budget, notes=EXCLUDED.notes, updated_at=CURRENT_TIMESTAMP', [y.year, y.budget, y.notes]); return getBudgetYearRecord(db, y.year) }
export async function updateBudgetYearRecord(db, year, patch = {}) { const current = await getBudgetYearRecord(db, year); if (!current) return null; const next = normalizeBudgetYear(patch, current); await run(db, 'UPDATE budget_years SET budget=$1, notes=$2, updated_at=CURRENT_TIMESTAMP WHERE year=$3', [next.budget, next.notes, String(year)]); return getBudgetYearRecord(db, year) }
export async function createBudgetCategoryRecord(db, form = {}) { const current = await rawBudgetCategories(db); const category = { id: nextBudgetCategoryId(current), year: String(form.year || currentBudgetYear()), name: String(form.name || 'بند جديد').trim() || 'بند جديد', allocatedAmount: Number(form.allocatedAmount ?? form.amount ?? 0) || 0, notes: form.notes || '' }; if (!(await getBudgetYearRecord(db, category.year))) await createBudgetYearRecord(db, { year: category.year, budget: 0 }); await run(db, 'INSERT INTO budget_categories (id, year, name, allocated_amount, notes) VALUES ($1,$2,$3,$4,$5)', [category.id, category.year, category.name, category.allocatedAmount, category.notes]); return (await listBudgetCategoryRecords(db)).find((item) => item.id === category.id) }
export async function updateBudgetCategoryRecord(db, categoryId, patch = {}) { const existing = (await rawBudgetCategories(db)).find((category) => category.id === categoryId); if (!existing) return null; const next = { ...existing, name: patch.name === undefined ? existing.name : String(patch.name || '').trim(), year: patch.year === undefined ? existing.year : String(patch.year || existing.year), allocatedAmount: patch.allocatedAmount === undefined && patch.amount === undefined ? existing.allocatedAmount : Number(patch.allocatedAmount ?? patch.amount ?? 0), notes: patch.notes === undefined ? existing.notes : patch.notes }; await run(db, 'UPDATE budget_categories SET year=$1, name=$2, allocated_amount=$3, notes=$4, updated_at=CURRENT_TIMESTAMP WHERE id=$5', [next.year, next.name || existing.name, next.allocatedAmount || 0, next.notes || '', categoryId]); return (await listBudgetCategoryRecords(db)).find((item) => item.id === categoryId) }
export async function deleteBudgetCategoryRecord(db, categoryId) { const linked = Number((await one(db, "SELECT COUNT(*) AS count FROM orders WHERE budget_category_id = $1 AND COALESCE(deleted_at, '') = ''", [categoryId])).count); if (linked > 0) return false; const result = await run(db, 'DELETE FROM budget_categories WHERE id=$1', [categoryId]); return result.rowCount > 0 }
