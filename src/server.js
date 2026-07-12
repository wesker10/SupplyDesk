import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DatabaseSync } from 'node:sqlite'
import * as sqliteData from './serverData.js'
import * as pgData from './serverPgData.js'
import { sendNewOrderEmail, sendTestEmail } from './emailNotifications.js'

function dataLayerFor(db) {
  return db?.talabatiDialect === 'postgres' ? pgData : sqliteData
}


const __dirname = path.dirname(fileURLToPath(import.meta.url))
const defaultStaticDir = path.resolve(__dirname, '../dist')
const defaultDataDir = path.resolve(__dirname, '../data')
const defaultDbPath = path.join(defaultDataDir, 'talabati.sqlite')

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
}

function sendJson(response, status, payload) {
  response.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(payload))
}

function sendError(response, status, message) {
  sendJson(response, status, { error: message })
}

async function readJsonBody(request) {
  const chunks = []
  for await (const chunk of request) chunks.push(chunk)
  if (chunks.length === 0) return {}
  const raw = Buffer.concat(chunks).toString('utf8')
  if (!raw.trim()) return {}
  return JSON.parse(raw)
}

function parseCookies(header = '') {
  return Object.fromEntries(String(header).split(';').map((part) => {
    const [key, ...value] = part.trim().split('=')
    return [key, decodeURIComponent(value.join('='))]
  }).filter(([key]) => key))
}

function clientKeyFromRequest(request) {
  const forwardedFor = request.headers['x-forwarded-for']
  if (forwardedFor) return String(forwardedFor).split(',')[0].trim() || 'local'
  return request.headers['x-real-ip'] || request.socket?.remoteAddress || 'local'
}

function isTruthySetting(value) {
  return value === true || String(value).toLowerCase() === 'true'
}

function sendSessionCookie(response, token) {
  response.setHeader('set-cookie', `talabati_session=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800`)
}

function clearSessionCookie(response) {
  response.setHeader('set-cookie', 'talabati_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0')
}

function isAuthenticatedRequest(request, sessions) {
  const cookies = parseCookies(request.headers.cookie || '')
  return Boolean(cookies.talabati_session && sessions.has(cookies.talabati_session))
}

function isPublicApi(pathname) {
  return pathname === '/api/health' || pathname === '/api/auth/status' || pathname === '/api/auth/login'
}

async function requireAuthIfEnabled({ db, request, response, sessions, pathname }) {
  const settings = await dataLayerFor(db).getAppSettingsRecord(db)
  if (!isTruthySetting(settings.authEnabled)) return true
  if (isPublicApi(pathname)) return true
  if (isAuthenticatedRequest(request, sessions)) return true
  sendError(response, 401, 'Authentication required')
  return false
}

async function publicAuthStatus(db, request, sessions) {
  const settings = await dataLayerFor(db).publicSettingsRecord(db)
  const authEnabled = isTruthySetting(settings.authEnabled)
  const clientLock = await dataLayerFor(db).isClientLockedRecord(db, clientKeyFromRequest(request))
  return {
    authEnabled,
    authenticated: !authEnabled || isAuthenticatedRequest(request, sessions),
    lockDurationMinutes: Number(settings.lockDurationMinutes || 60),
    lockedUntil: clientLock.locked ? clientLock.lockedUntil : '',
  }
}

function serveStatic(request, response, staticDir) {
  const requestUrl = new URL(request.url, 'http://127.0.0.1')
  const safePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '')
  const candidate = path.resolve(staticDir, safePath || 'index.html')
  const staticRoot = path.resolve(staticDir)
  const filePath = candidate.startsWith(staticRoot) && existsSync(candidate) && statSync(candidate).isFile()
    ? candidate
    : path.join(staticRoot, 'index.html')

  if (!existsSync(filePath)) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  const ext = path.extname(filePath)
  response.writeHead(200, {
    'content-type': mimeTypes[ext] || 'application/octet-stream',
    'cache-control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
  })
  createReadStream(filePath).pipe(response)
}

export function createTalabatiServer({ db, staticDir = defaultStaticDir, emailSender = sendNewOrderEmail, testEmailSender = sendTestEmail } = {}) {
  if (!db) throw new Error('createTalabatiServer requires a database')
  const sessions = new Set()

  return createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, 'http://127.0.0.1')

      if (requestUrl.pathname === '/api/health') {
        sendJson(response, 200, { ok: true })
        return
      }

      if (requestUrl.pathname === '/api/auth/status' && request.method === 'GET') {
        sendJson(response, 200, await publicAuthStatus(db, request, sessions))
        return
      }

      if (requestUrl.pathname === '/api/auth/login' && request.method === 'POST') {
        const settings = await dataLayerFor(db).publicSettingsRecord(db)
        const clientKey = clientKeyFromRequest(request)
        const lock = await dataLayerFor(db).isClientLockedRecord(db, clientKey)
        if (lock.locked) {
          sendJson(response, 423, { error: 'Locked', lockedUntil: lock.lockedUntil })
          return
        }
        const body = await readJsonBody(request)
        if (!await dataLayerFor(db).verifyPasswordRecord(db, body.password)) {
          const failed = await dataLayerFor(db).recordFailedLoginRecord(db, clientKey, Number(settings.lockDurationMinutes || 60))
          sendJson(response, failed.lockedUntil ? 423 : 401, { error: failed.lockedUntil ? 'Locked' : 'Invalid password', lockedUntil: failed.lockedUntil })
          return
        }
        await dataLayerFor(db).resetLoginAttemptsRecord(db, clientKey)
        const token = randomUUID()
        sessions.add(token)
        sendSessionCookie(response, token)
        sendJson(response, 200, { ok: true })
        return
      }

      if (requestUrl.pathname === '/api/auth/logout' && request.method === 'POST') {
        const cookies = parseCookies(request.headers.cookie || '')
        if (cookies.talabati_session) sessions.delete(cookies.talabati_session)
        clearSessionCookie(response)
        sendJson(response, 200, { ok: true })
        return
      }

      if (requestUrl.pathname.startsWith('/api/') && !(await requireAuthIfEnabled({ db, request, response, sessions, pathname: requestUrl.pathname }))) return

      if (requestUrl.pathname === '/api/settings' && request.method === 'GET') {
        sendJson(response, 200, { settings: await dataLayerFor(db).publicSettingsRecord(db) })
        return
      }

      if (requestUrl.pathname === '/api/settings' && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        if (body.newPassword) await dataLayerFor(db).setPasswordRecord(db, body.newPassword)
        const { newPassword: _newPassword, ...settingsPatch } = body
        await dataLayerFor(db).updateAppSettingsRecord(db, settingsPatch)
        sendJson(response, 200, { settings: await dataLayerFor(db).publicSettingsRecord(db) })
        return
      }

      if (requestUrl.pathname === '/api/email/test' && request.method === 'POST') {
        const settings = await dataLayerFor(db).getAppSettingsRecord(db)
        if (!String(settings.emailRecipient || '').trim()) {
          sendJson(response, 400, { emailNotification: { skipped: true, reason: 'missing-recipient' }, error: 'Missing email recipient' })
          return
        }
        try {
          const emailNotification = await testEmailSender({ settings })
          sendJson(response, 200, { emailNotification })
        } catch (error) {
          console.error('SupplyDesk test email failed:', error)
          sendJson(response, 502, { emailNotification: { sent: false, error: 'email-failed' }, error: 'Email failed' })
        }
        return
      }


      if (requestUrl.pathname === '/api/budget-years' && request.method === 'GET') {
        sendJson(response, 200, { years: await dataLayerFor(db).listBudgetYearRecords(db) })
        return
      }

      if (requestUrl.pathname === '/api/budget-years' && request.method === 'POST') {
        const body = await readJsonBody(request)
        const year = await dataLayerFor(db).createBudgetYearRecord(db, body)
        sendJson(response, 201, { year })
        return
      }

      const budgetYearMatch = requestUrl.pathname.match(/^\/api\/budget-years\/([^/]+)$/)
      if (budgetYearMatch && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        const year = await dataLayerFor(db).updateBudgetYearRecord(db, decodeURIComponent(budgetYearMatch[1]), body)
        if (!year) { sendError(response, 404, 'Budget year not found'); return }
        sendJson(response, 200, { year })
        return
      }

      if (requestUrl.pathname === '/api/budget-categories' && request.method === 'GET') {
        sendJson(response, 200, { categories: await dataLayerFor(db).listBudgetCategoryRecords(db, requestUrl.searchParams.get('year') || '') })
        return
      }

      if (requestUrl.pathname === '/api/budget-categories' && request.method === 'POST') {
        const body = await readJsonBody(request)
        const category = await dataLayerFor(db).createBudgetCategoryRecord(db, body)
        sendJson(response, 201, { category })
        return
      }

      const budgetCategoryMatch = requestUrl.pathname.match(/^\/api\/budget-categories\/([^/]+)$/)
      if (budgetCategoryMatch && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        const category = await dataLayerFor(db).updateBudgetCategoryRecord(db, decodeURIComponent(budgetCategoryMatch[1]), body)
        if (!category) { sendError(response, 404, 'Budget category not found'); return }
        sendJson(response, 200, { category })
        return
      }

      if (budgetCategoryMatch && request.method === 'DELETE') {
        const deleted = await dataLayerFor(db).deleteBudgetCategoryRecord(db, decodeURIComponent(budgetCategoryMatch[1]))
        if (!deleted) { sendError(response, 409, 'Budget category has linked orders or was not found'); return }
        response.writeHead(204, { 'cache-control': 'no-store' })
        response.end()
        return
      }

      if (requestUrl.pathname === '/api/orders' && request.method === 'GET') {
        const view = requestUrl.searchParams.get('view')
        const orders = view === 'archived'
          ? await dataLayerFor(db).listArchivedOrderRecords(db)
          : view === 'deleted'
            ? await dataLayerFor(db).listDeletedOrderRecords(db)
            : await dataLayerFor(db).listOrderRecords(db)
        sendJson(response, 200, { orders })
        return
      }

      if (requestUrl.pathname === '/api/orders' && request.method === 'POST') {
        const body = await readJsonBody(request)
        const order = await dataLayerFor(db).createOrderRecord(db, body)
        const settings = await dataLayerFor(db).getAppSettingsRecord(db)
        let emailNotification = { skipped: true, reason: 'disabled' }
        if (isTruthySetting(settings.emailNotificationsEnabled) && String(settings.emailRecipient || '').trim()) {
          try {
            emailNotification = await emailSender({ order, settings })
          } catch (error) {
            console.error('SupplyDesk email notification failed:', error)
            emailNotification = { sent: false, error: 'email-failed' }
          }
        }
        sendJson(response, 201, { order, emailNotification })
        return
      }

      const paymentMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)\/payments$/)
      if (paymentMatch && request.method === 'POST') {
        const body = await readJsonBody(request)
        const order = await dataLayerFor(db).addPaymentRecord(db, decodeURIComponent(paymentMatch[1]), body)
        if (!order) {
          sendError(response, 404, 'Order not found')
          return
        }
        sendJson(response, 201, { order })
        return
      }

      const paymentUpdateMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)\/payments\/([^/]+)$/)
      if (paymentUpdateMatch && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        const order = await dataLayerFor(db).updatePaymentRecord(db, decodeURIComponent(paymentUpdateMatch[1]), decodeURIComponent(paymentUpdateMatch[2]), body)
        if (!order) {
          sendError(response, 404, 'Order or payment not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      if (paymentUpdateMatch && request.method === 'DELETE') {
        const order = await dataLayerFor(db).deletePaymentRecord(db, decodeURIComponent(paymentUpdateMatch[1]), decodeURIComponent(paymentUpdateMatch[2]))
        if (!order) {
          sendError(response, 404, 'Order or payment not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      const orderArchiveMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)\/archive$/)
      if (orderArchiveMatch && request.method === 'POST') {
        const order = await dataLayerFor(db).archiveOrderRecord(db, decodeURIComponent(orderArchiveMatch[1]))
        if (!order) {
          sendError(response, 404, 'Order not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      const orderTrashMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)\/trash$/)
      if (orderTrashMatch && request.method === 'POST') {
        const order = await dataLayerFor(db).softDeleteOrderRecord(db, decodeURIComponent(orderTrashMatch[1]))
        if (!order) {
          sendError(response, 404, 'Order not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      const orderRestoreMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)\/restore$/)
      if (orderRestoreMatch && request.method === 'POST') {
        const order = await dataLayerFor(db).restoreOrderRecord(db, decodeURIComponent(orderRestoreMatch[1]))
        if (!order) {
          sendError(response, 404, 'Order not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      const orderMatch = requestUrl.pathname.match(/^\/api\/orders\/([^/]+)$/)
      if (orderMatch && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        const order = await dataLayerFor(db).updateOrderRecord(db, decodeURIComponent(orderMatch[1]), body)
        if (!order) {
          sendError(response, 404, 'Order not found')
          return
        }
        sendJson(response, 200, { order })
        return
      }

      if (orderMatch && request.method === 'DELETE') {
        const deleted = await dataLayerFor(db).deleteOrderForeverRecord(db, decodeURIComponent(orderMatch[1]))
        if (!deleted) {
          sendError(response, 404, 'Order not found')
          return
        }
        response.writeHead(204, { 'cache-control': 'no-store' })
        response.end()
        return
      }

      const supplierUpdateMatch = requestUrl.pathname.match(/^\/api\/suppliers\/([^/]+)$/)
      if (supplierUpdateMatch && request.method === 'PATCH') {
        const body = await readJsonBody(request)
        const supplier = await dataLayerFor(db).updateSupplierRecord(db, decodeURIComponent(supplierUpdateMatch[1]), body)
        if (!supplier) {
          sendError(response, 404, 'Supplier not found')
          return
        }
        sendJson(response, 200, { supplier })
        return
      }

      if (supplierUpdateMatch && request.method === 'DELETE') {
        const deleted = await dataLayerFor(db).deleteSupplierRecord(db, decodeURIComponent(supplierUpdateMatch[1]))
        if (!deleted) {
          sendError(response, 404, 'Supplier not found')
          return
        }
        response.writeHead(204, { 'cache-control': 'no-store' })
        response.end()
        return
      }

      if (requestUrl.pathname === '/api/suppliers' && request.method === 'GET') {
        sendJson(response, 200, { suppliers: await dataLayerFor(db).listSupplierRecords(db) })
        return
      }

      if (requestUrl.pathname === '/api/suppliers' && request.method === 'POST') {
        const body = await readJsonBody(request)
        const supplier = await dataLayerFor(db).createSupplierRecord(db, body)
        sendJson(response, 201, { supplier })
        return
      }

      if (requestUrl.pathname.startsWith('/api/')) {
        sendError(response, 404, 'API route not found')
        return
      }

      serveStatic(request, response, staticDir)
    } catch (error) {
      console.error(error)
      sendError(response, 500, 'Internal server error')
    }
  })
}

export async function openTalabatiDatabase(dbPath = process.env.TALABATI_DB_PATH || defaultDbPath) {
  if (process.env.DATABASE_URL || process.env.PGDATABASE || process.env.PGHOST) {
    const db = await pgData.openPostgresDatabase(process.env.DATABASE_URL)
    db.talabatiDialect = 'postgres'
    return db
  }
  await mkdir(path.dirname(dbPath), { recursive: true })
  const db = new DatabaseSync(dbPath)
  db.talabatiDialect = 'sqlite'
  sqliteData.initializeDatabase(db)
  return db
}

export async function startTalabatiServer({ port = Number(process.env.PORT || 3000), host = process.env.HOST || '0.0.0.0' } = {}) {
  const db = await openTalabatiDatabase()
  const server = createTalabatiServer({ db })
  await new Promise((resolve) => server.listen(port, host, resolve))
  console.log(`Talabati server listening on http://${host}:${port}`)
  return { server, db }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startTalabatiServer().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
