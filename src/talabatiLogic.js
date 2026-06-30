export const statuses = [
  'طلب جديد',
  'تم التواصل مع المورد',
  'بانتظار عرض السعر',
  'تم استلام عرض السعر',
  'قيد الاعتماد',
  'تم إصدار LPO',
  'قيد التوريد / التنفيذ',
  'تم الاستلام',
  'قيد الدفع',
  'مكتمل',
]

export const orders = [
  {
    id: 'REQ-1041',
    title: 'Laptop Refresh Program',
    lpo: 'LPO-DEMO-1001',
    requestNumber: 'DEMO-REQ-2026-001',
    requester: 'Operations Department',
    paymentNumber: 'PAY-DEMO-001',
    budgetYear: currentBudgetYear(),
    budgetCategoryId: '',
    supplier: 'Northbridge Technology',
    department: 'Operations',
    owners: ['Alex Morgan', 'Priya Shah'],
    priority: 'مهم',
    status: 'تم إصدار LPO',
    expectedDate: '2026-06-24',
    amount: 45000,
    currency: 'QAR',
    payments: [
      { id: 'PAY-1', name: 'First Payment', percentage: 30, amount: 15000, status: 'مدفوعة', dueDate: '2026-06-01' },
      { id: 'PAY-2', name: 'Second Payment', percentage: 40, amount: 18000, status: 'قيد الانتظار', dueDate: '2026-06-20' },
      { id: 'PAY-3', name: 'Final Payment', percentage: 30, amount: 12000, status: 'لم تستحق', dueDate: '2026-07-05' },
    ],
    updates: ['Demo data: first invoice received and paid', 'Demo data: waiting for delivery date confirmation'],
  },
  {
    id: 'REQ-1042',
    title: 'Annual HVAC Maintenance Contract',
    lpo: '',
    requestNumber: 'DEMO-REQ-2026-002',
    requester: 'IT Department',
    paymentNumber: '',
    budgetYear: currentBudgetYear(),
    budgetCategoryId: '',
    supplier: 'Harbor Facilities Group',
    department: 'Information Technology',
    owners: ['Marcus Lee'],
    priority: 'عادي',
    status: 'بانتظار عرض السعر',
    expectedDate: '2026-06-18',
    amount: 12000,
    currency: 'QAR',
    payments: [{ id: 'PAY-1', name: 'Single Payment', percentage: 100, amount: 12000, status: 'لم تستحق', dueDate: '2026-06-30' }],
    updates: ['Demo data: supplier contacted and quotation requested'],
  },
  {
    id: 'REQ-1043',
    title: 'Tablet Device Procurement',
    lpo: 'LPO-DEMO-1003',
    requestNumber: 'DEMO-REQ-2026-003',
    requester: 'Human Resources Department',
    paymentNumber: 'PAY-DEMO-003',
    budgetYear: currentBudgetYear(),
    budgetCategoryId: '',
    supplier: 'Vertex Cloud Solutions',
    department: 'Human Resources',
    owners: ['Noah Wilson', 'Laura Evans'],
    priority: 'عاجل',
    status: 'قيد الدفع',
    expectedDate: '2026-06-08',
    amount: 68000,
    currency: 'QAR',
    payments: [
      { id: 'PAY-1', name: 'First Payment', percentage: 50, amount: 34000, status: 'مدفوعة', dueDate: '2026-05-25' },
      { id: 'PAY-2', name: 'Final Payment', percentage: 50, amount: 34000, status: 'متأخرة', dueDate: '2026-06-05' },
    ],
    updates: ['Demo data: items received; final payment remains with finance'],
  },
  {
    id: 'REQ-1044',
    title: 'Corporate Catering Services',
    lpo: 'LPO-DEMO-1004',
    requestNumber: 'DEMO-REQ-2026-004',
    requester: 'Public Relations Department',
    paymentNumber: 'PAY-DEMO-004',
    budgetYear: currentBudgetYear(),
    budgetCategoryId: '',
    supplier: 'Atlas Office Supply',
    department: 'Public Relations',
    owners: ['Chloe Bennett'],
    priority: 'عادي',
    status: 'مكتمل',
    expectedDate: '2026-06-03',
    amount: 8500,
    currency: 'QAR',
    payments: [{ id: 'PAY-1', name: 'Single Payment', percentage: 100, amount: 8500, status: 'مدفوعة', dueDate: '2026-06-04' }],
    updates: ['Demo data: request completed and closed'],
  },
]

export const suppliers = [
  { name: 'Northbridge Technology', contact: 'Ethan Clark', rating: 'جيد', openOrders: 1 },
  { name: 'Harbor Facilities Group', contact: 'Sarah Johnson', rating: 'بطيء', openOrders: 1 },
  { name: 'Vertex Cloud Solutions', contact: 'Olivia Brown', rating: 'ممتاز', openOrders: 1 },
  { name: 'Atlas Office Supply', contact: 'Daniel Carter', rating: 'جيد', openOrders: 0 },
]

export function currentBudgetYear(date = new Date()) {
  return String(date.getFullYear())
}

export function nextBudgetCategoryId(categories = []) {
  const max = categories.reduce((highest, category) => {
    const match = String(category.id || '').match(/BUD-(\d+)/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, categories.length)
  return `BUD-${max + 1}`
}

export function budgetCategoryUsage(categories = [], orders = []) {
  return categories.map((category) => {
    const consumed = orders
      .filter((order) => !order.deletedAt && String(order.budgetYear || currentBudgetYear()) === String(category.year) && order.budgetCategoryId === category.id)
      .reduce((sum, order) => sum + Number(order.amount || 0), 0)
    return {
      ...category,
      allocatedAmount: Number(category.allocatedAmount || 0),
      consumed,
      remaining: Number(category.allocatedAmount || 0) - consumed,
      orderCount: orders.filter((order) => !order.deletedAt && String(order.budgetYear || currentBudgetYear()) === String(category.year) && order.budgetCategoryId === category.id).length,
    }
  })
}

export function paymentSummary(payments = []) {
  const total = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const paid = payments.filter((p) => p.status === 'مدفوعة').reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const overdue = payments.filter((p) => p.status === 'متأخرة')
  const nextPayment = payments.find((p) => ['قيد الانتظار', 'لم تستحق', 'متأخرة'].includes(p.status)) || null
  return {
    total,
    paid,
    remaining: Math.max(total - paid, 0),
    paidPercentage: total === 0 ? 0 : Math.round((paid / total) * 100),
    overdueCount: overdue.length,
    nextPayment,
  }
}

export function dashboardStats(orderList = orders) {
  const byStatus = Object.fromEntries(statuses.map((status) => [status, 0]))
  let partialPayments = 0
  let overdue = 0

  for (const order of orderList) {
    byStatus[order.status] = (byStatus[order.status] || 0) + 1
    const summary = paymentSummary(order.payments)
    if (summary.paid > 0 && summary.remaining > 0) partialPayments += 1
    if (summary.overdueCount > 0 || new Date(order.expectedDate) < new Date('2026-06-10')) overdue += 1
  }

  return {
    total: orderList.length,
    active: orderList.filter((order) => order.status !== 'مكتمل').length,
    waitingQuote: byStatus['بانتظار عرض السعر'] || 0,
    waitingLpo: orderList.filter((order) => !order.lpo).length,
    waitingPayment: byStatus['قيد الدفع'] || 0,
    partialPayments,
    completed: byStatus['مكتمل'] || 0,
    overdue,
    byStatus,
  }
}

export function nextOrderId(orderList = []) {
  const max = orderList.reduce((highest, order) => {
    const match = String(order.id || '').match(/REQ-(\d+)/)
    return match ? Math.max(highest, Number(match[1])) : highest
  }, 1040)
  return `REQ-${max + 1}`
}

export function normalizeOwners(form = {}) {
  const raw = form.owner ?? form.owners ?? ''
  if (Array.isArray(raw)) return raw.map((owner) => String(owner).trim()).filter(Boolean)
  return String(raw)
    .split(/[\n،,]+/)
    .map((owner) => owner.trim())
    .filter(Boolean)
}

export function parseMoney(value) {
  if (value === undefined || value === null || value === '') return 0
  return Number(String(value).replace(/[,،\s]/g, '')) || 0
}

export function normalizePayments(form = {}, expectedDate = '') {
  const amount = parseMoney(form.amount)
  const sourcePayments = Array.isArray(form.payments) && form.payments.length
    ? form.payments
    : [{ name: 'دفعة واحدة', amount, status: form.paymentStatus || 'لم تستحق', dueDate: form.dueDate || expectedDate }]
  const total = sourcePayments.reduce((sum, payment) => sum + parseMoney(payment.amount), 0) || amount
  return sourcePayments.map((payment, index) => {
    const paymentAmount = parseMoney(payment.amount)
    return {
      id: payment.id || `PAY-${index + 1}`,
      name: payment.name || `دفعة ${index + 1}`,
      percentage: total === 0 ? 0 : Math.round((paymentAmount / total) * 100),
      amount: paymentAmount,
      status: payment.status || 'لم تستحق',
      dueDate: payment.dueDate || expectedDate,
    }
  })
}

function isBlankDefaultPaymentRows(payments = []) {
  return payments.length > 0 && payments.every((payment, index) => {
    const name = String(payment.name || '').trim()
    return !payment.id
      && parseMoney(payment.amount) === 0
      && !payment.dueDate
      && (name === '' || name === `دفعة ${index + 1}`)
  })
}

export function createOrder(orderList = [], form = {}) {
  const amount = parseMoney(form.amount)
  const expectedDate = form.expectedDate || new Date().toISOString().slice(0, 10)
  const owners = normalizeOwners(form)
  return {
    id: nextOrderId(orderList),
    title: form.title === undefined || form.title === '' ? 'طلب جديد' : form.title,
    lpo: form.lpo ?? '',
    requestNumber: form.requestNumber ?? '',
    requester: form.requester ?? '',
    paymentNumber: form.paymentNumber ?? '',
    budgetYear: form.budgetYear || currentBudgetYear(),
    budgetCategoryId: form.budgetCategoryId || '',
    supplier: form.supplier === undefined || form.supplier === '' ? 'مورد جديد' : form.supplier,
    department: form.department === undefined || form.department === '' ? 'غير محدد' : form.department,
    owners: owners.length ? owners : ['غير محدد'],
    priority: form.priority || 'عادي',
    status: form.status || 'طلب جديد',
    expectedDate,
    amount,
    currency: 'QAR',
    payments: normalizePayments(form, expectedDate),
    updates: form.notes ? [form.notes] : ['تم إنشاء الطلب من الواجهة'],
  }
}

export function updateOrder(orderList = [], orderId, form = {}) {
  return orderList.map((order) => {
    if (order.id !== orderId) return order
    const amount = form.amount === undefined ? order.amount : parseMoney(form.amount)
    const expectedDate = form.expectedDate === undefined || form.expectedDate === '' ? order.expectedDate : form.expectedDate
    const owners = form.owner === undefined && form.owners === undefined ? order.owners : normalizeOwners(form)
    const shouldReplacePayments = Array.isArray(form.payments) && !isBlankDefaultPaymentRows(form.payments)
    const payments = shouldReplacePayments
      ? normalizePayments({ ...form, amount }, expectedDate)
      : (order.payments?.length
        ? order.payments
        : [{ id: 'PAY-1', name: 'دفعة واحدة', percentage: 100, amount, status: 'لم تستحق', dueDate: expectedDate }])
    return {
      ...order,
      title: form.title === undefined || form.title === '' ? order.title : form.title,
      lpo: form.lpo === undefined ? order.lpo : form.lpo,
      requestNumber: form.requestNumber === undefined ? (order.requestNumber || '') : form.requestNumber,
      requester: form.requester === undefined ? (order.requester || '') : form.requester,
      paymentNumber: form.paymentNumber === undefined ? (order.paymentNumber || '') : form.paymentNumber,
      budgetYear: form.budgetYear === undefined || form.budgetYear === '' ? (order.budgetYear || currentBudgetYear()) : String(form.budgetYear),
      budgetCategoryId: form.budgetCategoryId === undefined ? (order.budgetCategoryId || '') : form.budgetCategoryId,
      supplier: form.supplier === undefined || form.supplier === '' ? order.supplier : form.supplier,
      department: form.department === undefined || form.department === '' ? order.department : form.department,
      owners: owners.length ? owners : order.owners,
      priority: form.priority || order.priority,
      status: form.status || order.status,
      expectedDate,
      amount,
      payments,
      updates: Array.isArray(form.updates) ? form.updates : (form.notes ? [...(order.updates || []), form.notes] : order.updates),
    }
  })
}

export function filterOrders(orderList = [], { section = 'لوحة التحكم', quickFilter = 'الكل', query = '' } = {}) {
  const normalizedQuery = query.trim().toLowerCase()
  return orderList.filter((order) => {
    const sectionMatch =
      section === 'لوحة التحكم' ||
      section === 'الطلبات' ||
      (section === 'الدفعات' && ['قيد الدفع', 'تم الاستلام'].includes(order.status)) ||
      (section === 'الموردون' && Boolean(order.supplier)) ||
      section === 'التقارير' ||
      section === 'الإعدادات'

    const quickMatch =
      quickFilter === 'الكل' ||
      (quickFilter === 'بانتظار LPO' && !order.lpo) ||
      (quickFilter === 'قيد الدفع' && order.status === 'قيد الدفع')

    const haystack = [order.id, order.title, order.supplier, order.lpo, order.requestNumber, order.requester, order.paymentNumber, order.budgetYear, order.budgetCategoryId, order.status, ...(order.owners || [])]
      .join(' ')
      .toLowerCase()

    return sectionMatch && quickMatch && (!normalizedQuery || haystack.includes(normalizedQuery))
  })
}

export function formatCurrency(value, symbol = 'ر.ق') {
  const number = Number(value || 0)
  const safeSymbol = String(symbol || 'ر.ق').trim() || 'ر.ق'
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number)} ${safeSymbol}`
}

export const formatQar = (value) => formatCurrency(value, 'ر.ق')
