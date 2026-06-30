import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { createOrder, orders as seedOrders, suppliers as seedSuppliers, updateOrder, currentBudgetYear, nextBudgetCategoryId, budgetCategoryUsage } from './talabatiLogic.js'

function yearFromDate(value) {
  const match = String(value || '').match(/^(\d{4})/)
  return match ? match[1] : String(new Date().getFullYear())
}

function serializeOrder(order) {
  return {
    ...order,
    owners: JSON.stringify(order.owners || []),
    payments: JSON.stringify(order.payments || []),
    updates: JSON.stringify(order.updates || []),
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
    owners: JSON.parse(row.owners || '[]'),
    priority: row.priority,
    status: row.status,
    expectedDate: row.expected_date,
    amount: Number(row.amount || 0),
    currency: row.currency || 'QAR',
    payments: JSON.parse(row.payments || '[]'),
    updates: JSON.parse(row.updates || '[]'),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at || '',
    deletedAt: row.deleted_at || '',
    archiveYear: row.archive_year || (row.archived_at ? yearFromDate(row.created_at) : ''),
  }
}

function insertOrder(db, order) {
  const serialized = serializeOrder(order)
  db.prepare(`
    INSERT INTO orders (
      id, title, lpo, request_number, requester, payment_number, budget_year, budget_category_id, supplier, department, owners, priority, status,
      expected_date, amount, currency, payments, updates, archived_at, deleted_at, archive_year
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    serialized.id,
    serialized.title,
    serialized.lpo,
    serialized.requestNumber || '',
    serialized.requester || '',
    serialized.paymentNumber || '',
    serialized.budgetYear || currentBudgetYear(),
    serialized.budgetCategoryId || '',
    serialized.supplier,
    serialized.department,
    serialized.owners,
    serialized.priority,
    serialized.status,
    serialized.expectedDate,
    serialized.amount,
    serialized.currency,
    serialized.payments,
    serialized.updates,
    serialized.archivedAt,
    serialized.deletedAt,
    serialized.archiveYear,
  )
  return getOrderRecord(db, order.id)
}

function replaceOrder(db, order) {
  const serialized = serializeOrder(order)
  db.prepare(`
    UPDATE orders
    SET title = ?, lpo = ?, request_number = ?, requester = ?, payment_number = ?, budget_year = ?, budget_category_id = ?, supplier = ?, department = ?, owners = ?, priority = ?,
        status = ?, expected_date = ?, amount = ?, currency = ?, payments = ?, updates = ?,
        archived_at = ?, deleted_at = ?, archive_year = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    serialized.title,
    serialized.lpo,
    serialized.requestNumber || '',
    serialized.requester || '',
    serialized.paymentNumber || '',
    serialized.budgetYear || currentBudgetYear(),
    serialized.budgetCategoryId || '',
    serialized.supplier,
    serialized.department,
    serialized.owners,
    serialized.priority,
    serialized.status,
    serialized.expectedDate,
    serialized.amount,
    serialized.currency,
    serialized.payments,
    serialized.updates,
    serialized.archivedAt,
    serialized.deletedAt,
    serialized.archiveYear,
    serialized.id,
  )
  return getOrderRecord(db, order.id)
}

function ensureOrderLifecycleColumns(db) {
  const columns = db.prepare('PRAGMA table_info(orders)').all().map((column) => column.name)
  if (!columns.includes('request_number')) db.exec("ALTER TABLE orders ADD COLUMN request_number TEXT DEFAULT ''")
  if (!columns.includes('requester')) db.exec("ALTER TABLE orders ADD COLUMN requester TEXT DEFAULT ''")
  if (!columns.includes('payment_number')) db.exec("ALTER TABLE orders ADD COLUMN payment_number TEXT DEFAULT ''")
  if (!columns.includes('budget_year')) db.exec(`ALTER TABLE orders ADD COLUMN budget_year TEXT DEFAULT '${currentBudgetYear()}'`)
  if (!columns.includes('budget_category_id')) db.exec("ALTER TABLE orders ADD COLUMN budget_category_id TEXT DEFAULT ''")
  if (!columns.includes('archived_at')) db.exec("ALTER TABLE orders ADD COLUMN archived_at TEXT DEFAULT ''")
  if (!columns.includes('deleted_at')) db.exec("ALTER TABLE orders ADD COLUMN deleted_at TEXT DEFAULT ''")
  if (!columns.includes('archive_year')) db.exec("ALTER TABLE orders ADD COLUMN archive_year TEXT DEFAULT ''")
}

export function initializeDatabase(db) {
  db.exec(`
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
      owners TEXT NOT NULL DEFAULT '[]',
      priority TEXT NOT NULL DEFAULT 'عادي',
      status TEXT NOT NULL DEFAULT 'طلب جديد',
      expected_date TEXT DEFAULT '',
      amount REAL NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'QAR',
      payments TEXT NOT NULL DEFAULT '[]',
      updates TEXT NOT NULL DEFAULT '[]',
      archived_at TEXT DEFAULT '',
      deleted_at TEXT DEFAULT '',
      archive_year TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      contact TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      rating TEXT DEFAULT 'جيد',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS auth_attempts (
      client_key TEXT PRIMARY KEY,
      failed_count INTEGER NOT NULL DEFAULT 0,
      locked_until TEXT DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_years (
      year TEXT PRIMARY KEY,
      budget REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS budget_categories (
      id TEXT PRIMARY KEY,
      year TEXT NOT NULL,
      name TEXT NOT NULL,
      allocated_amount REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(year, name)
    );
  `)

  ensureOrderLifecycleColumns(db)

  const count = db.prepare('SELECT COUNT(*) AS count FROM orders').get().count
  if (count === 0) {
    db.exec('BEGIN')
    try {
      for (const order of seedOrders) insertOrder(db, order)
      db.exec('COMMIT')
    } catch (error) {
      db.exec('ROLLBACK')
      throw error
    }
  }

  const supplierCount = db.prepare('SELECT COUNT(*) AS count FROM suppliers').get().count
  if (supplierCount === 0) {
    for (const supplier of seedSuppliers) insertSupplier(db, { ...supplier, id: nextSupplierId(listSupplierRecords(db)) })
  }

  seedDefaultSettings(db)
  seedDefaultBudgetYear(db)
}

export function listOrderRecords(db) {
  return db.prepare("SELECT * FROM orders WHERE COALESCE(archived_at, '') = '' AND COALESCE(deleted_at, '') = '' ORDER BY id ASC").all().map(deserializeOrder)
}

export function listArchivedOrderRecords(db) {
  return db.prepare("SELECT * FROM orders WHERE COALESCE(archived_at, '') != '' AND COALESCE(deleted_at, '') = '' ORDER BY archived_at DESC, id ASC").all().map(deserializeOrder)
}

export function listDeletedOrderRecords(db) {
  return db.prepare("SELECT * FROM orders WHERE COALESCE(deleted_at, '') != '' ORDER BY deleted_at DESC, id ASC").all().map(deserializeOrder)
}

export function listAllOrderRecords(db) {
  return db.prepare('SELECT * FROM orders ORDER BY id ASC').all().map(deserializeOrder)
}

export function getOrderRecord(db, id) {
  return deserializeOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id))
}

export function createOrderRecord(db, form = {}) {
  const currentOrders = listAllOrderRecords(db)
  const order = createOrder(currentOrders, form)
  return insertOrder(db, order)
}

export function updateOrderRecord(db, orderId, patch = {}) {
  const existing = getOrderRecord(db, orderId)
  if (!existing) return null
  const [updated] = updateOrder([existing], orderId, patch).filter((order) => order.id === orderId)
  const archiveYear = patch.archiveYear === undefined ? updated.archiveYear : String(patch.archiveYear || '').trim()
  return replaceOrder(db, { ...updated, archiveYear })
}

function nowIso() {
  return new Date().toISOString()
}

export function archiveOrderRecord(db, orderId) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  return replaceOrder(db, { ...order, archivedAt: nowIso(), deletedAt: '', archiveYear: order.archiveYear || yearFromDate(order.createdAt) })
}

export function softDeleteOrderRecord(db, orderId) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  return replaceOrder(db, { ...order, deletedAt: nowIso() })
}

export function restoreOrderRecord(db, orderId) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  return replaceOrder(db, { ...order, archivedAt: '', deletedAt: '', archiveYear: '' })
}

export function deleteOrderForeverRecord(db, orderId) {
  const result = db.prepare('DELETE FROM orders WHERE id = ?').run(orderId)
  return result.changes > 0
}

function nextPaymentId(payments = []) {
  const max = payments.reduce((highest, payment) => {
    const match = String(payment.id || '').match(/PAY-(\d+)/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, payments.length)
  return `PAY-${max + 1}`
}

function normalizePayment(payment = {}, existingPayment = {}) {
  const name = payment.name?.trim() || existingPayment.name || 'دفعة جديدة'
  return {
    id: existingPayment.id || payment.id || 'PAY-1',
    name,
    percentage: Number(payment.percentage ?? existingPayment.percentage ?? 100),
    amount: Number(payment.amount ?? existingPayment.amount ?? 0),
    status: payment.status || existingPayment.status || 'لم تستحق',
    dueDate: payment.dueDate || existingPayment.dueDate || new Date().toISOString().slice(0, 10),
  }
}

export function addPaymentRecord(db, orderId, payment = {}) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  const newPayment = normalizePayment({ ...payment, id: nextPaymentId(order.payments) })
  const updated = {
    ...order,
    payments: [...(order.payments || []), newPayment],
  }
  return replaceOrder(db, updated)
}

export function updatePaymentRecord(db, orderId, paymentId, patch = {}) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  const existingPayment = (order.payments || []).find((payment) => payment.id === paymentId)
  if (!existingPayment) return null
  const updatedPayment = normalizePayment({ ...patch, id: paymentId }, existingPayment)
  const updated = {
    ...order,
    payments: order.payments.map((payment) => payment.id === paymentId ? updatedPayment : payment),
  }
  return replaceOrder(db, updated)
}

export function deletePaymentRecord(db, orderId, paymentId) {
  const order = getOrderRecord(db, orderId)
  if (!order) return null
  const payments = order.payments || []
  if (!payments.some((payment) => payment.id === paymentId)) return null
  return replaceOrder(db, { ...order, payments: payments.filter((payment) => payment.id !== paymentId) })
}

const defaultSettings = {
  heroTitle: 'Procurement Requests, Clear Control',
  departmentBudget: '0',
  authEnabled: 'false',
  lockDurationMinutes: '60',
  passwordHash: '',
  hiddenSuggestions: '{}',
  currencyCode: 'QAR',
  currencySymbol: 'ر.ق',
}

function seedDefaultSettings(db) {
  for (const [key, value] of Object.entries(defaultSettings)) {
    db.prepare('INSERT OR IGNORE INTO app_settings (key, value) VALUES (?, ?)').run(key, value)
  }
}

export function getAppSettingsRecord(db) {
  const rows = db.prepare('SELECT key, value FROM app_settings').all()
  return { ...defaultSettings, ...Object.fromEntries(rows.map((row) => [row.key, row.value])) }
}

export function updateAppSettingsRecord(db, patch = {}) {
  for (const [key, value] of Object.entries(patch)) {
    if (!(key in defaultSettings)) continue
    if (key === 'passwordHash') continue
    db.prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
    `).run(key, String(value ?? defaultSettings[key]))
  }
  return getAppSettingsRecord(db)
}

function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  const hash = createHash('sha256').update(`${salt}:${password}`).digest('hex')
  return `${salt}:${hash}`
}

export function setPasswordRecord(db, password) {
  const nextHash = hashPassword(String(password || ''))
  db.prepare(`
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('passwordHash', ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `).run(nextHash)
  return true
}

export function verifyPasswordRecord(db, password) {
  const { passwordHash } = getAppSettingsRecord(db)
  if (!passwordHash) return false
  const [salt, expectedHash] = String(passwordHash).split(':')
  if (!salt || !expectedHash) return false
  const actualHash = hashPassword(String(password || ''), salt).split(':')[1]
  const expected = Buffer.from(expectedHash, 'hex')
  const actual = Buffer.from(actualHash, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function publicSettingsRecord(db) {
  const settings = getAppSettingsRecord(db)
  const passwordSet = Boolean(settings.passwordHash)
  const { passwordHash: _passwordHash, ...publicSettings } = settings
  return { ...publicSettings, passwordSet }
}

export function getAuthAttemptRecord(db, clientKey) {
  return db.prepare('SELECT * FROM auth_attempts WHERE client_key = ?').get(clientKey) || { client_key: clientKey, failed_count: 0, locked_until: '' }
}

export function isClientLockedRecord(db, clientKey, now = new Date()) {
  const attempt = getAuthAttemptRecord(db, clientKey)
  if (!attempt.locked_until) return { locked: false, lockedUntil: '' }
  const lockedUntil = new Date(attempt.locked_until)
  if (Number.isNaN(lockedUntil.getTime()) || lockedUntil <= now) return { locked: false, lockedUntil: '' }
  return { locked: true, lockedUntil: attempt.locked_until }
}

export function recordFailedLoginRecord(db, clientKey, lockDurationMinutes = 60, now = new Date()) {
  const current = getAuthAttemptRecord(db, clientKey)
  const failedCount = Number(current.failed_count || 0) + 1
  const lockedUntil = failedCount >= 3 ? new Date(now.getTime() + Number(lockDurationMinutes || 60) * 60_000).toISOString() : ''
  db.prepare(`
    INSERT INTO auth_attempts (client_key, failed_count, locked_until, updated_at)
    VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(client_key) DO UPDATE SET failed_count = excluded.failed_count, locked_until = excluded.locked_until, updated_at = CURRENT_TIMESTAMP
  `).run(clientKey, failedCount, lockedUntil)
  return { failedCount, lockedUntil }
}

export function resetLoginAttemptsRecord(db, clientKey) {
  db.prepare("DELETE FROM auth_attempts WHERE client_key = ?").run(clientKey)
}

function deserializeSupplier(row, orderList = []) {
  if (!row) return null
  const openOrders = orderList.filter((order) => order.supplier === row.name && order.status !== 'مكتمل').length
  return {
    id: row.id,
    name: row.name,
    contact: row.contact || '',
    phone: row.phone || '',
    email: row.email || '',
    rating: row.rating || 'جيد',
    notes: row.notes || '',
    openOrders,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function nextSupplierId(suppliers = []) {
  const max = suppliers.reduce((highest, supplier) => {
    const match = String(supplier.id || '').match(/SUP-(\d+)/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, suppliers.length)
  return `SUP-${max + 1}`
}

function normalizeSupplier(form = {}, existing = {}) {
  return {
    id: existing.id || form.id || 'SUP-1',
    name: form.name?.trim() || existing.name || 'مورد جديد',
    contact: form.contact?.trim() ?? existing.contact ?? '',
    phone: form.phone?.trim() ?? existing.phone ?? '',
    email: form.email?.trim() ?? existing.email ?? '',
    rating: form.rating || existing.rating || 'جيد',
    notes: form.notes?.trim() ?? existing.notes ?? '',
  }
}

function insertSupplier(db, supplier) {
  const normalized = normalizeSupplier(supplier)
  db.prepare(`
    INSERT INTO suppliers (id, name, contact, phone, email, rating, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(normalized.id, normalized.name, normalized.contact, normalized.phone, normalized.email, normalized.rating, normalized.notes)
  return getSupplierRecord(db, normalized.id)
}

function replaceSupplier(db, supplier) {
  const normalized = normalizeSupplier(supplier, supplier)
  db.prepare(`
    UPDATE suppliers
    SET name = ?, contact = ?, phone = ?, email = ?, rating = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(normalized.name, normalized.contact, normalized.phone, normalized.email, normalized.rating, normalized.notes, normalized.id)
  return getSupplierRecord(db, normalized.id)
}

export function listSupplierRecords(db) {
  const orderList = listOrderRecords(db)
  return db.prepare('SELECT * FROM suppliers ORDER BY id ASC').all().map((row) => deserializeSupplier(row, orderList))
}

export function getSupplierRecord(db, id) {
  return deserializeSupplier(db.prepare('SELECT * FROM suppliers WHERE id = ?').get(id), listOrderRecords(db))
}

export function createSupplierRecord(db, form = {}) {
  const supplier = normalizeSupplier({ ...form, id: nextSupplierId(listSupplierRecords(db)) })
  return insertSupplier(db, supplier)
}

export function updateSupplierRecord(db, supplierId, patch = {}) {
  const current = getSupplierRecord(db, supplierId)
  if (!current) return null
  return replaceSupplier(db, normalizeSupplier(patch, current))
}


function normalizeBudgetYear(form = {}, existing = {}) {
  return {
    year: String(form.year || existing.year || currentBudgetYear()),
    budget: Number(form.budget ?? existing.budget ?? 0) || 0,
    notes: form.notes ?? existing.notes ?? '',
  }
}

function seedDefaultBudgetYear(db) {
  const year = currentBudgetYear()
  const exists = db.prepare('SELECT year FROM budget_years WHERE year = ?').get(year)
  if (!exists) {
    const settings = getAppSettingsRecord(db)
    db.prepare('INSERT INTO budget_years (year, budget, notes) VALUES (?, ?, ?)').run(year, Number(settings.departmentBudget || 0), '')
  }
}

function deserializeBudgetYear(row, categories = []) {
  if (!row) return null
  const yearCategories = categories.filter((category) => String(category.year) === String(row.year))
  const allocated = yearCategories.reduce((sum, category) => sum + Number(category.allocatedAmount || 0), 0)
  const consumed = yearCategories.reduce((sum, category) => sum + Number(category.consumed || 0), 0)
  return { year: String(row.year), budget: Number(row.budget || 0), notes: row.notes || '', allocated, unallocated: Number(row.budget || 0) - allocated, consumed, remaining: Number(row.budget || 0) - consumed, createdAt: row.created_at, updatedAt: row.updated_at }
}

function rawBudgetCategories(db, year = '') {
  const rows = year
    ? db.prepare('SELECT * FROM budget_categories WHERE year = ? ORDER BY id ASC').all(String(year))
    : db.prepare('SELECT * FROM budget_categories ORDER BY year DESC, id ASC').all()
  return rows.map((row) => ({ id: row.id, year: String(row.year), name: row.name, allocatedAmount: Number(row.allocated_amount || 0), notes: row.notes || '', createdAt: row.created_at, updatedAt: row.updated_at }))
}

export function listBudgetCategoryRecords(db, year = '') {
  return budgetCategoryUsage(rawBudgetCategories(db, year), listAllOrderRecords(db))
}

export function listBudgetYearRecords(db) {
  const categories = listBudgetCategoryRecords(db)
  return db.prepare('SELECT * FROM budget_years ORDER BY year DESC').all().map((row) => deserializeBudgetYear(row, categories))
}

export function getBudgetYearRecord(db, year) {
  const categories = listBudgetCategoryRecords(db)
  return deserializeBudgetYear(db.prepare('SELECT * FROM budget_years WHERE year = ?').get(String(year)), categories)
}

export function createBudgetYearRecord(db, form = {}) {
  const y = normalizeBudgetYear(form)
  db.prepare('INSERT INTO budget_years (year, budget, notes) VALUES (?, ?, ?) ON CONFLICT(year) DO UPDATE SET budget=excluded.budget, notes=excluded.notes, updated_at=CURRENT_TIMESTAMP').run(y.year, y.budget, y.notes)
  return getBudgetYearRecord(db, y.year)
}

export function updateBudgetYearRecord(db, year, patch = {}) {
  const current = getBudgetYearRecord(db, year)
  if (!current) return null
  const next = normalizeBudgetYear(patch, current)
  db.prepare('UPDATE budget_years SET budget = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE year = ?').run(next.budget, next.notes, String(year))
  return getBudgetYearRecord(db, year)
}

export function createBudgetCategoryRecord(db, form = {}) {
  const current = rawBudgetCategories(db)
  const category = { id: nextBudgetCategoryId(current), year: String(form.year || currentBudgetYear()), name: String(form.name || 'بند جديد').trim() || 'بند جديد', allocatedAmount: Number(form.allocatedAmount ?? form.amount ?? 0) || 0, notes: form.notes || '' }
  createBudgetYearRecord(db, { year: category.year, budget: getBudgetYearRecord(db, category.year)?.budget || 0 })
  db.prepare('INSERT INTO budget_categories (id, year, name, allocated_amount, notes) VALUES (?, ?, ?, ?, ?)').run(category.id, category.year, category.name, category.allocatedAmount, category.notes)
  return listBudgetCategoryRecords(db).find((item) => item.id === category.id)
}

export function updateBudgetCategoryRecord(db, categoryId, patch = {}) {
  const existing = rawBudgetCategories(db).find((category) => category.id === categoryId)
  if (!existing) return null
  const next = { ...existing, name: patch.name === undefined ? existing.name : String(patch.name || '').trim(), year: patch.year === undefined ? existing.year : String(patch.year || existing.year), allocatedAmount: patch.allocatedAmount === undefined && patch.amount === undefined ? existing.allocatedAmount : Number(patch.allocatedAmount ?? patch.amount ?? 0), notes: patch.notes === undefined ? existing.notes : patch.notes }
  db.prepare('UPDATE budget_categories SET year = ?, name = ?, allocated_amount = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(next.year, next.name || existing.name, next.allocatedAmount || 0, next.notes || '', categoryId)
  return listBudgetCategoryRecords(db).find((item) => item.id === categoryId)
}

export function deleteBudgetCategoryRecord(db, categoryId) {
  const linked = db.prepare("SELECT COUNT(*) AS count FROM orders WHERE budget_category_id = ? AND COALESCE(deleted_at, '') = ''").get(categoryId).count
  if (linked > 0) return false
  const result = db.prepare('DELETE FROM budget_categories WHERE id = ?').run(categoryId)
  return result.changes > 0
}
