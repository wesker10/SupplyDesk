import { describe, expect, it, vi } from 'vitest'
import { archiveOrderApi, addPaymentApi, createOrderApi, createSupplierApi, deleteOrderForeverApi, deletePaymentApi, deleteSupplierApi, fetchOrdersApi, fetchSettingsApi, fetchSuppliersApi, restoreOrderApi, trashOrderApi, updateOrderApi, updatePaymentApi, updateSettingsApi, updateSupplierApi, sendTestEmailApi } from './apiClient.js'

describe('Talabati API client', () => {
  it('loads orders from the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ orders: [{ id: 'REQ-1', title: 'طلب' }] }),
    })

    await expect(fetchOrdersApi(fetchImpl)).resolves.toEqual([{ id: 'REQ-1', title: 'طلب' }])
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders')
  })

  it('creates an order through the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { id: 'REQ-2', title: 'طلب جديد' } }),
    })

    await expect(createOrderApi({ title: 'طلب جديد' }, fetchImpl)).resolves.toEqual({ order: { id: 'REQ-2', title: 'طلب جديد' }, emailNotification: undefined })
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders', expect.objectContaining({ method: 'POST' }))
  })

  it('updates an order through the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { id: 'REQ-2', status: 'قيد الدفع' } }),
    })

    await expect(updateOrderApi('REQ-2', { status: 'قيد الدفع' }, fetchImpl)).resolves.toEqual({ id: 'REQ-2', status: 'قيد الدفع' })
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders/REQ-2', expect.objectContaining({ method: 'PATCH' }))
  })

  it('throws a useful error when the API fails', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 500 })

    await expect(fetchOrdersApi(fetchImpl)).rejects.toThrow('Talabati API request failed: 500')
  })

  it('adds a payment through the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { id: 'REQ-2', payments: [{ id: 'PAY-2' }] } }),
    })

    await expect(addPaymentApi('REQ-2', { name: 'دفعة' }, fetchImpl)).resolves.toEqual({ id: 'REQ-2', payments: [{ id: 'PAY-2' }] })
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders/REQ-2/payments', expect.objectContaining({ method: 'POST' }))
  })

  it('updates a payment through the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { id: 'REQ-2', payments: [{ id: 'PAY-2', status: 'مدفوعة' }] } }),
    })

    await expect(updatePaymentApi('REQ-2', 'PAY-2', { status: 'مدفوعة' }, fetchImpl)).resolves.toEqual({ id: 'REQ-2', payments: [{ id: 'PAY-2', status: 'مدفوعة' }] })
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders/REQ-2/payments/PAY-2', expect.objectContaining({ method: 'PATCH' }))
  })

  it('deletes a payment through the shared API', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ order: { id: 'REQ-2', payments: [] } }),
    })

    await expect(deletePaymentApi('REQ-2', 'PAY-2', fetchImpl)).resolves.toEqual({ id: 'REQ-2', payments: [] })
    expect(fetchImpl).toHaveBeenCalledWith('/api/orders/REQ-2/payments/PAY-2', expect.objectContaining({ method: 'DELETE' }))
  })

  it('loads and updates app settings through the shared API', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { heroTitle: 'العنوان' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ settings: { heroTitle: 'عنوان جديد' } }) })

    await expect(fetchSettingsApi(fetchImpl)).resolves.toEqual({ heroTitle: 'العنوان' })
    await expect(updateSettingsApi({ heroTitle: 'عنوان جديد' }, fetchImpl)).resolves.toEqual({ heroTitle: 'عنوان جديد' })
    expect(fetchImpl).toHaveBeenNthCalledWith(2, '/api/settings', expect.objectContaining({ method: 'PATCH' }))
  })

  it('calls lifecycle endpoints for archive, trash, restore, and permanent delete', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ order: { id: 'REQ-1', archivedAt: 'now' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ order: { id: 'REQ-1', deletedAt: 'now' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ order: { id: 'REQ-1', deletedAt: '' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) })

    await expect(archiveOrderApi('REQ-1', fetchImpl)).resolves.toMatchObject({ archivedAt: 'now' })
    await expect(trashOrderApi('REQ-1', fetchImpl)).resolves.toMatchObject({ deletedAt: 'now' })
    await expect(restoreOrderApi('REQ-1', fetchImpl)).resolves.toMatchObject({ deletedAt: '' })
    await expect(deleteOrderForeverApi('REQ-1', fetchImpl)).resolves.toBe(true)
    expect(fetchImpl).toHaveBeenNthCalledWith(1, '/api/orders/REQ-1/archive', expect.objectContaining({ method: 'POST' }))
    expect(fetchImpl).toHaveBeenNthCalledWith(4, '/api/orders/REQ-1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('loads, creates, and updates suppliers through the shared API', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ suppliers: [{ id: 'SUP-1', name: 'Northbridge Technology' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ supplier: { id: 'SUP-5', name: 'Qatar Facilities' } }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ supplier: { id: 'SUP-5', rating: 'جيد' } }) })

    await expect(fetchSuppliersApi(fetchImpl)).resolves.toEqual([{ id: 'SUP-1', name: 'Northbridge Technology' }])
    await expect(createSupplierApi({ name: 'Qatar Facilities' }, fetchImpl)).resolves.toEqual({ id: 'SUP-5', name: 'Qatar Facilities' })
    await expect(updateSupplierApi('SUP-5', { rating: 'جيد' }, fetchImpl)).resolves.toEqual({ id: 'SUP-5', rating: 'جيد' })
  })
})
