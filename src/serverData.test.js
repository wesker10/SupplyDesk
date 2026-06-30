import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import {
  addPaymentRecord,
  archiveOrderRecord,
  createOrderRecord,
  createSupplierRecord,
  deleteOrderForeverRecord,
  deletePaymentRecord,
  getAppSettingsRecord,
  initializeDatabase,
  listArchivedOrderRecords,
  listDeletedOrderRecords,
  listOrderRecords,
  listSupplierRecords,
  restoreOrderRecord,
  softDeleteOrderRecord,
  updateAppSettingsRecord,
  updateOrderRecord,
  updatePaymentRecord,
  updateSupplierRecord,
} from './serverData.js'

describe('server-side Talabati database', () => {
  function memoryDb() {
    const db = new DatabaseSync(':memory:')
    initializeDatabase(db)
    return db
  }

  it('seeds the shared database with initial orders once', () => {
    const db = memoryDb()

    const firstList = listOrderRecords(db)
    initializeDatabase(db)
    const secondList = listOrderRecords(db)

    expect(firstList).toHaveLength(4)
    expect(secondList).toHaveLength(4)
    expect(firstList[0]).toMatchObject({ id: 'REQ-1041', title: 'Laptop Refresh Program' })
  })

  it('creates a shared order with the next request id and normalized owners', () => {
    const db = memoryDb()

    const order = createOrderRecord(db, {
      title: 'توريد شاشات تجريبية للاجتماعات',
      supplier: 'Doha Screens',
      owner: 'سالم التجريبي، ليان التجريبية',
      department: 'الإدارة',
      lpo: 'LPO-2026-0100',
      amount: '15000',
      status: 'طلب جديد',
      priority: 'مهم',
      expectedDate: '2026-06-30',
      notes: 'أول طلب محفوظ في قاعدة البيانات',
    })

    expect(order).toMatchObject({
      id: 'REQ-1045',
      title: 'توريد شاشات تجريبية للاجتماعات',
      supplier: 'Doha Screens',
      owners: ['سالم التجريبي', 'ليان التجريبية'],
      amount: 15000,
      status: 'طلب جديد',
    })
    expect(listOrderRecords(db)[4].id).toBe('REQ-1045')
  })

  it('creates an order with multiple payment rows from the new order form', () => {
    const db = memoryDb()

    const order = createOrderRecord(db, {
      title: 'طلب بدفعات متعددة',
      supplier: 'شركة المثال للتوريدات',
      owner: 'سالم التجريبي\nليان التجريبية',
      amount: '30000',
      expectedDate: '2026-07-10',
      payments: [
        { name: 'دفعة 1', amount: '10000', status: 'قيد الانتظار' },
        { name: 'دفعة 2', amount: '12000', status: 'مدفوعة' },
        { name: 'دفعة 3', amount: '8000', status: 'لم تستحق' },
      ],
    })

    expect(order.amount).toBe(30000)
    expect(order.owners).toEqual(['سالم التجريبي', 'ليان التجريبية'])
    expect(order.payments).toEqual([
      expect.objectContaining({ id: 'PAY-1', name: 'دفعة 1', amount: 10000, status: 'قيد الانتظار' }),
      expect.objectContaining({ id: 'PAY-2', name: 'دفعة 2', amount: 12000, status: 'مدفوعة' }),
      expect.objectContaining({ id: 'PAY-3', name: 'دفعة 3', amount: 8000, status: 'لم تستحق' }),
    ])
  })

  it('updates an order in the shared database without losing payments or blocking spaces', () => {
    const db = memoryDb()

    const updated = updateOrderRecord(db, 'REQ-1042', {
      title: 'تجديد عقد صيانة تجريبي - معدل مع مسافة ',
      amount: '14000',
      status: 'تم استلام عرض السعر',
      owner: 'ليان التجريبية\nسالم التجريبي',
      lpo: 'LPO-2026-0102',
      notes: 'تم تعديل الطلب من الواجهة',
    })

    expect(updated).toMatchObject({
      id: 'REQ-1042',
      title: 'تجديد عقد صيانة تجريبي - معدل مع مسافة ',
      amount: 14000,
      status: 'تم استلام عرض السعر',
      owners: ['ليان التجريبية', 'سالم التجريبي'],
      lpo: 'LPO-2026-0102',
    })
    expect(updated.payments[0].amount).toBe(12000)
    expect(updated.updates).toContain('تم تعديل الطلب من الواجهة')
  })

  it('preserves payment amounts when order details save includes the total order amount', () => {
    const db = memoryDb()
    const created = createOrderRecord(db, {
      title: 'طلب مليون بثلاث دفعات',
      supplier: 'مورد اختبار',
      owner: 'سالم التجريبي',
      amount: '1000000',
      payments: [
        { name: 'دفعة 1', amount: '200000', status: 'قيد الانتظار' },
        { name: 'دفعة 2', amount: '300000', status: 'لم تستحق' },
        { name: 'دفعة 3', amount: '500000', status: 'لم تستحق' },
      ],
    })

    const updated = updateOrderRecord(db, created.id, {
      title: 'طلب مليون بثلاث دفعات - بعد تعديل الحالة',
      amount: '1000000',
      status: 'تم استلام عرض السعر',
      owner: 'سالم التجريبي',
    })

    expect(updated.payments.map((payment) => payment.amount)).toEqual([200000, 300000, 500000])
    expect(updated.amount).toBe(1000000)
    expect(updated.status).toBe('تم استلام عرض السعر')
  })

  it('preserves existing payments when saving order details sends the blank default form payment row', () => {
    const db = memoryDb()
    const created = createOrderRecord(db, {
      title: 'طلب بدفعتين',
      supplier: 'مورد اختبار',
      owner: 'سالم التجريبي',
      amount: '30000',
      payments: [
        { name: 'دفعة 1', amount: '10000', status: 'قيد الانتظار' },
        { name: 'دفعة 2', amount: '20000', status: 'لم تستحق' },
      ],
    })

    const updated = updateOrderRecord(db, created.id, {
      title: 'طلب بدفعتين - بعد تعديل الحالة',
      amount: '30000',
      status: 'تم استلام عرض السعر',
      owner: 'سالم التجريبي',
      payments: [{ name: 'دفعة 1', amount: '', status: 'قيد الانتظار', dueDate: '' }],
    })

    expect(updated.payments).toEqual(created.payments)
    expect(updated.status).toBe('تم استلام عرض السعر')
  })

  it('replaces editable notes when the details panel saves ملاحظات', () => {
    const db = memoryDb()

    const updated = updateOrderRecord(db, 'REQ-1041', {
      updates: ['ملاحظة معدلة', 'ملاحظة ثانية'],
    })

    expect(updated.updates).toEqual(['ملاحظة معدلة', 'ملاحظة ثانية'])
  })

  it('archives, soft deletes, restores, and permanently deletes orders outside the active list', () => {
    const db = memoryDb()

    const archived = archiveOrderRecord(db, 'REQ-1041')
    expect(archived.archivedAt).toBeTruthy()
    expect(listOrderRecords(db).map((order) => order.id)).not.toContain('REQ-1041')
    expect(listArchivedOrderRecords(db).map((order) => order.id)).toContain('REQ-1041')

    const trashed = softDeleteOrderRecord(db, 'REQ-1042')
    expect(trashed.deletedAt).toBeTruthy()
    expect(listDeletedOrderRecords(db).map((order) => order.id)).toContain('REQ-1042')

    const restored = restoreOrderRecord(db, 'REQ-1042')
    expect(restored.deletedAt).toBe('')
    expect(listOrderRecords(db).map((order) => order.id)).toContain('REQ-1042')

    softDeleteOrderRecord(db, 'REQ-1043')
    const deleted = deleteOrderForeverRecord(db, 'REQ-1043')
    expect(deleted).toBe(true)
    expect(listDeletedOrderRecords(db).map((order) => order.id)).not.toContain('REQ-1043')
  })

  it('sets archive year from order creation year and allows manual archive year override', () => {
    const db = memoryDb()
    const order = createOrderRecord(db, {
      title: 'طلب أرشيف 2025',
      supplier: 'مورد اختبار',
      owner: 'سالم التجريبي',
      amount: '10000',
    })
    db.prepare("UPDATE orders SET created_at = '2025-03-12T09:00:00.000Z' WHERE id = ?").run(order.id)

    const archived = archiveOrderRecord(db, order.id)
    expect(archived.archiveYear).toBe('2025')
    expect(listArchivedOrderRecords(db).find((item) => item.id === order.id).archiveYear).toBe('2025')

    const moved = updateOrderRecord(db, order.id, { archiveYear: '2026' })
    expect(moved.archiveYear).toBe('2026')
    expect(listArchivedOrderRecords(db).find((item) => item.id === order.id).archiveYear).toBe('2026')
  })

  it('returns null when updating an unknown order id', () => {
    const db = memoryDb()

    expect(updateOrderRecord(db, 'REQ-9999', { title: 'غير موجود' })).toBeNull()
  })

  it('adds a payment to an order without writing automatic notes', () => {
    const db = memoryDb()

    const order = addPaymentRecord(db, 'REQ-1042', {
      name: 'دفعة اعتماد LPO',
      percentage: 50,
      amount: 6000,
      status: 'قيد الانتظار',
      dueDate: '2026-07-15',
    })

    expect(order.payments).toContainEqual({
      id: 'PAY-2',
      name: 'دفعة اعتماد LPO',
      percentage: 50,
      amount: 6000,
      status: 'قيد الانتظار',
      dueDate: '2026-07-15',
    })
    expect(order.updates).toEqual(['Demo data: supplier contacted and quotation requested'])
  })

  it('updates a payment without writing automatic notes', () => {
    const db = memoryDb()
    const withPayment = addPaymentRecord(db, 'REQ-1042', {
      name: 'دفعة اعتماد LPO',
      percentage: 50,
      amount: 6000,
      status: 'قيد الانتظار',
      dueDate: '2026-07-15',
    })

    const order = updatePaymentRecord(db, 'REQ-1042', withPayment.payments.at(-1).id, {
      status: 'مدفوعة',
      amount: 6500,
    })

    const payment = order.payments.find((item) => item.id === 'PAY-2')
    expect(payment).toMatchObject({ status: 'مدفوعة', amount: 6500 })
    expect(order.updates).toEqual(withPayment.updates)
  })

  it('deletes a mistaken payment without writing automatic notes', () => {
    const db = memoryDb()
    const withPayment = addPaymentRecord(db, 'REQ-1042', { name: 'دفعة بالغلط', amount: 99 })
    const deletedPaymentId = withPayment.payments.at(-1).id

    const order = deletePaymentRecord(db, 'REQ-1042', deletedPaymentId)

    expect(order.payments.map((payment) => payment.id)).not.toContain(deletedPaymentId)
    expect(order.updates).toEqual(withPayment.updates)
  })

  it('stores editable app settings for the hero title and department budget', () => {
    const db = memoryDb()

    expect(getAppSettingsRecord(db).heroTitle).toBe('Procurement Requests, Clear Control')
    expect(getAppSettingsRecord(db).departmentBudget).toBe('0')
    const settings = updateAppSettingsRecord(db, { heroTitle: 'عنوان جديد للبرنامج', departmentBudget: '1250000' })

    expect(settings.heroTitle).toBe('عنوان جديد للبرنامج')
    expect(settings.departmentBudget).toBe('1250000')
    expect(getAppSettingsRecord(db)).toMatchObject({ heroTitle: 'عنوان جديد للبرنامج', departmentBudget: '1250000' })
  })

  it('keeps archived order value available for department budget calculations', () => {
    const db = memoryDb()
    updateAppSettingsRecord(db, { departmentBudget: '100000' })
    const order = createOrderRecord(db, {
      title: 'طلب يظل محسوب بعد الأرشفة',
      supplier: 'مورد اختبار',
      owner: 'سالم التجريبي',
      amount: '25000',
    })

    const activeSpent = listOrderRecords(db).reduce((sum, item) => sum + item.amount, 0)
    archiveOrderRecord(db, order.id)
    const spentAfterArchive = [...listOrderRecords(db), ...listArchivedOrderRecords(db)].reduce((sum, item) => sum + item.amount, 0)

    expect(spentAfterArchive).toBe(activeSpent)
    expect(Number(getAppSettingsRecord(db).departmentBudget) - spentAfterArchive).toBe(100000 - activeSpent)
  })

  it('returns null when adding a payment to an unknown order', () => {
    const db = memoryDb()

    expect(addPaymentRecord(db, 'REQ-9999', { name: 'دفعة' })).toBeNull()
  })

  it('seeds suppliers and calculates open order counts from orders', () => {
    const db = memoryDb()

    const suppliers = listSupplierRecords(db)

    expect(suppliers).toHaveLength(4)
    expect(suppliers.find((supplier) => supplier.name === 'Northbridge Technology')).toMatchObject({ contact: 'Ethan Clark', openOrders: 1 })
  })

  it('creates and updates suppliers in the shared database', () => {
    const db = memoryDb()

    const supplier = createSupplierRecord(db, {
      name: 'Qatar Facilities',
      contact: 'سالم علي',
      phone: '+974****0000',
      email: 'sales@example.com',
      rating: 'ممتاز',
      notes: 'مورد خدمات مرافق',
    })

    expect(supplier).toMatchObject({ id: 'SUP-5', name: 'Qatar Facilities', rating: 'ممتاز', openOrders: 0 })

    const updated = updateSupplierRecord(db, supplier.id, { rating: 'جيد', notes: 'تم تحديث التقييم' })
    expect(updated).toMatchObject({ id: 'SUP-5', rating: 'جيد', notes: 'تم تحديث التقييم' })
  })
})
