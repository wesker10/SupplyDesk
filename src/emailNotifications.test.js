import { describe, expect, it } from 'vitest'
import { buildNewOrderEmail, buildTestEmail, sendNewOrderEmail, sendTestEmail } from './emailNotifications.js'

describe('Talabati email notifications', () => {
  const settings = { emailNotificationsEnabled: 'true', emailRecipient: 'procurement@company.local' }
  const order = {
    id: 'REQ-9999',
    title: 'توريد أجهزة اختبار',
    supplier: 'شركة الاختبار',
    owners: ['حمد'],
    requester: 'ناصر',
    amount: 1500,
    status: 'طلب جديد',
    priority: 'عاجل',
    expectedDate: '2026-07-03',
    payments: [],
    updates: ['ملاحظة عربية'],
  }

  it('builds a multipart RTL HTML new-order email using Talabati theme', () => {
    const email = buildNewOrderEmail(order, settings, { from: 'talabati@hamad.local', fromName: 'طلباتي', host: 'mailrelay', port: 25, secure: false })

    expect(email.to).toBe('procurement@company.local')
    expect(email.from).toBe('talabati@hamad.local')
    expect(email.message).toContain('Content-Type: multipart/alternative')
    expect(email.message).toContain('Content-Type: text/html; charset=UTF-8')
    expect(email.message).toContain('dir="rtl"')
    expect(email.message).toContain('طلب جديد')
    expect(email.message).toContain('توريد أجهزة اختبار')
    expect(email.message).not.toContain('رقم الطلب الداخلي')
    expect(email.message).not.toContain('REQ-9999')
    expect(email.message).toContain('الدفعات')
    expect(email.message).toContain('الملاحظات')
    expect(email.message).toContain('background:#efe7d8')
    expect(email.message).toContain('background-color:#5f4421')
    expect(email.message).toContain('color:#ffffff')
  })

  it('applies the selected black email theme to new-order and test emails', () => {
    const themedSettings = { ...settings, emailTheme: 'black' }
    const orderEmail = buildNewOrderEmail(order, themedSettings, { from: 'talabati@hamad.local', fromName: 'طلباتي', host: 'mailrelay', port: 25, secure: false })
    const testEmail = buildTestEmail(themedSettings, { from: 'no-reply@talabati.local', fromName: 'Talabati', host: 'mailrelay', port: 25, secure: false })

    expect(orderEmail.message).toContain('background:#0f172a')
    expect(orderEmail.message).toContain('color:#f8fafc')
    expect(testEmail.message).toContain('background:#0f172a')
    expect(testEmail.message).toContain('مرحبا')
  })

  it('builds a simple hello test email for the saved recipient', () => {
    const email = buildTestEmail(settings, { from: 'no-reply@talabati.local', fromName: 'Talabati', host: 'mailrelay', port: 25, secure: false })

    expect(email.to).toBe('procurement@company.local')
    expect(email.message).toContain('Subject: =?UTF-8?')
    expect(email.message).toContain('مرحبا')
    expect(email.message).toContain('dir="rtl"')
    expect(email.message).not.toContain('mailrelay')
    expect(email.message).not.toContain('SMTP Host')
  })

  it('skips new order email when disabled and test email when recipient is missing', async () => {
    await expect(sendNewOrderEmail({ order, settings: { ...settings, emailNotificationsEnabled: 'false' } })).resolves.toEqual({ skipped: true, reason: 'disabled' })
    await expect(sendTestEmail({ settings: { emailRecipient: '' } })).resolves.toEqual({ skipped: true, reason: 'missing-recipient' })
  })
})
