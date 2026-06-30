import { describe, expect, it } from 'vitest'
import { createOrder, dashboardStats, filterOrders, formatCurrency, formatQar, paymentSummary, updateOrder } from './talabatiLogic.js'

describe('formatQar', () => {
  it('uses English digits and thousands separators for QAR amounts', () => {
    expect(formatQar(10000)).toBe('10,000 ر.ق')
    expect(formatQar(100000)).toBe('100,000 ر.ق')
    expect(formatQar(1250000)).toBe('1,250,000 ر.ق')
  })

  it('supports configurable currency symbols', () => {
    expect(formatCurrency(10000, 'USD')).toBe('10,000 USD')
    expect(formatCurrency(1250000, '$')).toBe('1,250,000 $')
  })
})

describe('paymentSummary', () => {
  it('calculates paid, remaining, paid percentage, and next payment', () => {
    const summary = paymentSummary([
      { name: 'دفعة أولى', amount: 300, status: 'مدفوعة' },
      { name: 'دفعة ثانية', amount: 400, status: 'قيد الانتظار' },
      { name: 'دفعة أخيرة', amount: 300, status: 'لم تستحق' },
    ])

    expect(summary.total).toBe(1000)
    expect(summary.paid).toBe(300)
    expect(summary.remaining).toBe(700)
    expect(summary.paidPercentage).toBe(30)
    expect(summary.nextPayment.name).toBe('دفعة ثانية')
  })

  it('detects overdue payments', () => {
    const summary = paymentSummary([
      { name: 'دفعة أولى', amount: 100, status: 'متأخرة' },
      { name: 'دفعة ثانية', amount: 100, status: 'مدفوعة' },
    ])

    expect(summary.overdueCount).toBe(1)
  })
})

describe('order management', () => {
  it('creates a new order with the next readable request id and default payment', () => {
    const created = createOrder([
      { id: 'REQ-1041' },
      { id: 'REQ-1042' },
    ], {
      title: 'توريد شاشات عرض',
      supplier: 'Display Hub',
      owner: 'سالم التجريبي',
      amount: '9000',
      status: 'طلب جديد',
      expectedDate: '2026-07-01',
    })

    expect(created.id).toBe('REQ-1043')
    expect(created.title).toBe('توريد شاشات عرض')
    expect(created.owners).toEqual(['سالم التجريبي'])
    expect(created.payments).toEqual([{ id: 'PAY-1', name: 'دفعة واحدة', percentage: 100, amount: 9000, status: 'لم تستحق', dueDate: '2026-07-01' }])
  })

  it('updates an existing order without mutating the original list', () => {
    const list = [{ id: 'REQ-1', title: 'قديم', status: 'طلب جديد', owners: ['سالم التجريبي'] }]
    const updated = updateOrder(list, 'REQ-1', { title: 'معدل', owner: 'ليان التجريبية', status: 'قيد الاعتماد' })

    expect(updated[0].title).toBe('معدل')
    expect(updated[0].owners).toEqual(['ليان التجريبية'])
    expect(updated[0].status).toBe('قيد الاعتماد')
    expect(list[0].title).toBe('قديم')
  })

  it('filters orders by sidebar section and quick filter', () => {
    const list = [
      { id: '1', status: 'بانتظار عرض السعر', lpo: '', supplier: 'A', title: 'طلب A', owners: ['سالم التجريبي'] },
      { id: '2', status: 'قيد الدفع', lpo: 'LPO-2', supplier: 'B', title: 'طلب B', owners: ['ليان التجريبية'] },
      { id: '3', status: 'مكتمل', lpo: 'LPO-3', supplier: 'C', title: 'طلب C', owners: ['ماجد التجريبي'] },
    ]

    expect(filterOrders(list, { section: 'الدفعات' }).map((o) => o.id)).toEqual(['2'])
    expect(filterOrders(list, { quickFilter: 'بانتظار LPO' }).map((o) => o.id)).toEqual(['1'])
    expect(filterOrders(list, { query: 'ليان التجريبية' }).map((o) => o.id)).toEqual(['2'])
  })
})
