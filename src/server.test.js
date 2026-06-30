import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { initializeDatabase, updateAppSettingsRecord, setPasswordRecord } from './serverData.js'
import { createTalabatiServer } from './server.js'

describe('Talabati HTTP API', () => {
  let db
  let server
  let baseUrl

  beforeEach(async () => {
    db = new DatabaseSync(':memory:')
    initializeDatabase(db)
    server = createTalabatiServer({ db, staticDir: new URL('../dist/', import.meta.url).pathname })
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
    const { port } = server.address()
    baseUrl = `http://127.0.0.1:${port}`
  })

  afterEach(async () => {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
    db.close()
  })

  it('lists shared orders as JSON', async () => {
    const response = await fetch(`${baseUrl}/api/orders`)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('application/json')
    expect(body.orders).toHaveLength(4)
    expect(body.orders[0].id).toBe('REQ-1041')
  })

  it('creates an order through POST /api/orders', async () => {
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        title: 'توريد أجهزة حضور وانصراف تجريبية',
        supplier: 'Qatar Time Systems',
        owner: 'سالم التجريبي، ماجد التجريبي',
        requestNumber: 'PO-7788',
        requester: 'خالد التجريبي',
        paymentNumber: 'PAY-BATCH-7788',
        amount: '9000',
        expectedDate: '2026-07-01',
      }),
    })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.order).toMatchObject({
      id: 'REQ-1045',
      title: 'توريد أجهزة حضور وانصراف تجريبية',
      requestNumber: 'PO-7788',
      requester: 'خالد التجريبي',
      paymentNumber: 'PAY-BATCH-7788',
      amount: 9000,
    })

    const listResponse = await fetch(`${baseUrl}/api/orders`)
    const listBody = await listResponse.json()
    expect(listBody.orders).toHaveLength(5)
  })



  it('manages budget years and categories and links orders to category usage', async () => {
    const yearResponse = await fetch(`${baseUrl}/api/budget-years`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year: '2026', budget: 100000 }),
    })
    const yearBody = await yearResponse.json()
    expect(yearResponse.status).toBe(201)
    expect(yearBody.year).toMatchObject({ year: '2026', budget: 100000 })

    const categoryResponse = await fetch(`${baseUrl}/api/budget-categories`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ year: '2026', name: 'شراء الأدوات', allocatedAmount: 100000 }),
    })
    const categoryBody = await categoryResponse.json()
    expect(categoryResponse.status).toBe(201)
    expect(categoryBody.category).toMatchObject({ id: 'BUD-1', year: '2026', name: 'شراء الأدوات', allocatedAmount: 100000, consumed: 0 })

    const orderResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ title: 'شراء أدوات تجريبية', supplier: 'مورد أدوات تجريبي', owner: 'سالم التجريبي', amount: '15000', budgetYear: '2026', budgetCategoryId: categoryBody.category.id }),
    })
    const orderBody = await orderResponse.json()
    expect(orderBody.order).toMatchObject({ budgetYear: '2026', budgetCategoryId: categoryBody.category.id })

    const categoriesAfterOrder = await fetch(`${baseUrl}/api/budget-categories?year=2026`).then((response) => response.json())
    expect(categoriesAfterOrder.categories[0]).toMatchObject({ consumed: 15000, remaining: 85000, orderCount: 1 })

    await fetch(`${baseUrl}/api/orders/${orderBody.order.id}/archive`, { method: 'POST' })
    const categoriesAfterArchive = await fetch(`${baseUrl}/api/budget-categories?year=2026`).then((response) => response.json())
    expect(categoriesAfterArchive.categories[0]).toMatchObject({ consumed: 15000, remaining: 85000, orderCount: 1 })

    await fetch(`${baseUrl}/api/orders/${orderBody.order.id}/trash`, { method: 'POST' })
    const categoriesAfterTrash = await fetch(`${baseUrl}/api/budget-categories?year=2026`).then((response) => response.json())
    expect(categoriesAfterTrash.categories[0]).toMatchObject({ consumed: 0, remaining: 100000, orderCount: 0 })
  })

  it('updates an order through PATCH /api/orders/:id', async () => {
    const response = await fetch(`${baseUrl}/api/orders/REQ-1041`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'قيد الدفع', amount: '47000', requestNumber: 'PO-4455', requester: 'نورة التجريبية', paymentNumber: 'PAY-BATCH-4455' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.order).toMatchObject({ id: 'REQ-1041', status: 'قيد الدفع', amount: 47000, requestNumber: 'PO-4455', requester: 'نورة التجريبية', paymentNumber: 'PAY-BATCH-4455' })
  })

  it('returns 404 for unknown order updates', async () => {
    const response = await fetch(`${baseUrl}/api/orders/REQ-9999`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'مكتمل' }),
    })

    expect(response.status).toBe(404)
  })

  it('adds a payment through POST /api/orders/:id/payments', async () => {
    const response = await fetch(`${baseUrl}/api/orders/REQ-1042/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        name: 'دفعة اعتماد LPO',
        percentage: 50,
        amount: 6000,
        status: 'قيد الانتظار',
        dueDate: '2026-07-15',
      }),
    })
    const body = await response.json()

    expect(response.status).toBe(201)
    expect(body.order.payments.at(-1)).toMatchObject({ id: 'PAY-2', name: 'دفعة اعتماد LPO', amount: 6000 })
  })

  it('updates a payment through PATCH /api/orders/:id/payments/:paymentId', async () => {
    const created = await fetch(`${baseUrl}/api/orders/REQ-1042/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'دفعة اعتماد LPO', amount: 6000 }),
    }).then((response) => response.json())
    const paymentId = created.order.payments.at(-1).id

    const response = await fetch(`${baseUrl}/api/orders/REQ-1042/payments/${paymentId}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: 'مدفوعة', amount: 6500 }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.order.payments.find((payment) => payment.id === paymentId)).toMatchObject({ status: 'مدفوعة', amount: 6500 })
  })

  it('deletes a payment through DELETE /api/orders/:id/payments/:paymentId', async () => {
    const created = await fetch(`${baseUrl}/api/orders/REQ-1042/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'دفعة بالغلط', amount: 99 }),
    }).then((response) => response.json())
    const paymentId = created.order.payments.at(-1).id

    const response = await fetch(`${baseUrl}/api/orders/REQ-1042/payments/${paymentId}`, { method: 'DELETE' })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.order.payments.map((payment) => payment.id)).not.toContain(paymentId)
  })

  it('reads and updates app settings through the API', async () => {
    const initial = await fetch(`${baseUrl}/api/settings`).then((response) => response.json())
    expect(initial.settings.heroTitle).toBe('Procurement Requests, Clear Control')
    expect(initial.settings.departmentBudget).toBe('0')

    const response = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ heroTitle: 'عنوان جديد للبرنامج', departmentBudget: '1250000' }),
    })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.settings.heroTitle).toBe('عنوان جديد للبرنامج')
    expect(body.settings.departmentBudget).toBe('1250000')
  })

  it('archives, trashes, restores, and permanently deletes orders through the API', async () => {
    const archiveResponse = await fetch(`${baseUrl}/api/orders/REQ-1041/archive`, { method: 'POST' })
    const archiveBody = await archiveResponse.json()
    expect(archiveResponse.status).toBe(200)
    expect(archiveBody.order.archivedAt).toBeTruthy()

    const archivedList = await fetch(`${baseUrl}/api/orders?view=archived`).then((response) => response.json())
    expect(archivedList.orders.map((order) => order.id)).toContain('REQ-1041')
    expect(archivedList.orders.find((order) => order.id === 'REQ-1041').archiveYear).toMatch(/^\d{4}$/)

    const moveYearResponse = await fetch(`${baseUrl}/api/orders/REQ-1041`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ archiveYear: '2026' }),
    })
    const movedYearBody = await moveYearResponse.json()
    expect(moveYearResponse.status).toBe(200)
    expect(movedYearBody.order.archiveYear).toBe('2026')

    const trashResponse = await fetch(`${baseUrl}/api/orders/REQ-1042/trash`, { method: 'POST' })
    const trashBody = await trashResponse.json()
    expect(trashResponse.status).toBe(200)
    expect(trashBody.order.deletedAt).toBeTruthy()

    const deletedList = await fetch(`${baseUrl}/api/orders?view=deleted`).then((response) => response.json())
    expect(deletedList.orders.map((order) => order.id)).toContain('REQ-1042')

    const restoreResponse = await fetch(`${baseUrl}/api/orders/REQ-1042/restore`, { method: 'POST' })
    const restoreBody = await restoreResponse.json()
    expect(restoreResponse.status).toBe(200)
    expect(restoreBody.order.deletedAt).toBe('')

    await fetch(`${baseUrl}/api/orders/REQ-1043/trash`, { method: 'POST' })
    const foreverResponse = await fetch(`${baseUrl}/api/orders/REQ-1043`, { method: 'DELETE' })
    expect(foreverResponse.status).toBe(204)
  })

  it('locks password login for the configured duration after three failed attempts', async () => {
    setPasswordRecord(db, 'secret123')
    updateAppSettingsRecord(db, { authEnabled: 'true', lockDurationMinutes: '90' })

    const publicStatus = await fetch(`${baseUrl}/api/auth/status`).then((response) => response.json())
    expect(publicStatus).toMatchObject({ authEnabled: true, authenticated: false, lockDurationMinutes: 90 })

    const blockedOrders = await fetch(`${baseUrl}/api/orders`)
    expect(blockedOrders.status).toBe(401)

    for (let index = 0; index < 3; index += 1) {
      const response = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong' }),
      })
      expect([401, 423]).toContain(response.status)
    }

    const lockedResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    const lockedBody = await lockedResponse.json()
    expect(lockedResponse.status).toBe(423)
    expect(lockedBody.lockedUntil).toBeTruthy()
  })

  it('allows login with the configured password and returns a session cookie', async () => {
    setPasswordRecord(db, 'secret123')
    updateAppSettingsRecord(db, { authEnabled: 'true' })

    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    const cookie = loginResponse.headers.get('set-cookie')
    expect(loginResponse.status).toBe(200)
    expect(cookie).toContain('talabati_session=')

    const ordersResponse = await fetch(`${baseUrl}/api/orders`, { headers: { cookie } })
    expect(ordersResponse.status).toBe(200)
  })

  it('updates auth settings and password through settings endpoints when authenticated', async () => {
    setPasswordRecord(db, 'secret123')
    updateAppSettingsRecord(db, { authEnabled: 'true' })
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'secret123' }),
    })
    const cookie = loginResponse.headers.get('set-cookie')

    const settingsResponse = await fetch(`${baseUrl}/api/settings`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', cookie },
      body: JSON.stringify({ authEnabled: 'false', lockDurationMinutes: '30', newPassword: 'newSecret456' }),
    })
    const settingsBody = await settingsResponse.json()

    expect(settingsResponse.status).toBe(200)
    expect(settingsBody.settings).toMatchObject({ authEnabled: 'false', lockDurationMinutes: '30' })
  })

  it('lists, creates, and updates suppliers through the API', async () => {
    const listResponse = await fetch(`${baseUrl}/api/suppliers`)
    const listBody = await listResponse.json()
    expect(listResponse.status).toBe(200)
    expect(listBody.suppliers).toHaveLength(4)

    const createResponse = await fetch(`${baseUrl}/api/suppliers`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Qatar Facilities', contact: 'سالم علي', rating: 'ممتاز' }),
    })
    const createBody = await createResponse.json()
    expect(createResponse.status).toBe(201)
    expect(createBody.supplier).toMatchObject({ id: 'SUP-5', name: 'Qatar Facilities' })

    const updateResponse = await fetch(`${baseUrl}/api/suppliers/SUP-5`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: 'جيد' }),
    })
    const updateBody = await updateResponse.json()
    expect(updateResponse.status).toBe(200)
    expect(updateBody.supplier).toMatchObject({ id: 'SUP-5', rating: 'جيد' })
  })
})
