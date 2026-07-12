import net from 'node:net'
import tls from 'node:tls'

const CRLF = '\r\n'

function boolSetting(value) {
  return value === true || String(value).toLowerCase() === 'true'
}

function escapeHeader(value = '') {
  return String(value).replace(/[\r\n]+/g, ' ').trim()
}

function encodeHeader(value = '') {
  const safe = escapeHeader(value)
  return /^[\x00-\x7F]*$/.test(safe) ? safe : `=?UTF-8?B?${Buffer.from(safe, 'utf8').toString('base64')}?=`
}

function escapeBody(value = '') {
  return String(value).replace(/\r?\n/g, CRLF).replace(/^\./gm, '..')
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatQar(value = 0) {
  return `${Number(value || 0).toLocaleString('en-US')} ر.ق`
}

function smtpConfigFromEnv() {
  return {
    host: process.env.TALABATI_SMTP_HOST || process.env.SMTP_HOST || 'mailrelay',
    port: Number(process.env.TALABATI_SMTP_PORT || process.env.SMTP_PORT || 25),
    secure: boolSetting(process.env.TALABATI_SMTP_SECURE || process.env.SMTP_SECURE || 'false'),
    from: process.env.TALABATI_EMAIL_FROM || 'no-reply@talabati.local',
    fromName: process.env.TALABATI_EMAIL_FROM_NAME || 'Talabati',
  }
}

function formatDisplayDate(value) {
  if (!value) return 'غير محدد'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('ar-QA', { year: 'numeric', month: 'long', day: 'numeric' })
}

const emailThemes = {
  talabati: {
    id: 'talabati',
    name: 'ثيم البرنامج',
    page: '#efe7d8',
    card: '#fffaf0',
    cardAlt: '#fffdf8',
    headerFallback: '#5f4421',
    header: 'linear-gradient(135deg,#7c5c2f,#b58a4a)',
    headerText: '#ffffff',
    headerMuted: '#fff7e8',
    text: '#28231d',
    muted: '#6f675b',
    border: '#eadfcd',
    soft: '#fff8ec',
    footer: '#7a7166',
    shadow: '0 24px 70px rgba(69,55,31,.12)',
  },
  white: {
    id: 'white',
    name: 'أبيض واضح',
    page: '#f4f6f8',
    card: '#ffffff',
    cardAlt: '#ffffff',
    header: 'linear-gradient(135deg,#ffffff,#f3f4f6)',
    headerText: '#111827',
    headerMuted: '#4b5563',
    text: '#111827',
    muted: '#4b5563',
    border: '#d1d5db',
    soft: '#f9fafb',
    footer: '#6b7280',
    shadow: '0 20px 54px rgba(15,23,42,.10)',
  },
  black: {
    id: 'black',
    name: 'أسود رسمي',
    page: '#0f172a',
    card: '#111827',
    cardAlt: '#182033',
    header: 'linear-gradient(135deg,#020617,#1f2937)',
    headerText: '#f9fafb',
    headerMuted: '#cbd5e1',
    text: '#f8fafc',
    muted: '#cbd5e1',
    border: '#334155',
    soft: '#1e293b',
    footer: '#cbd5e1',
    shadow: '0 24px 70px rgba(0,0,0,.35)',
  },
  sapphire: {
    id: 'sapphire',
    name: 'أزرق إداري',
    page: '#eaf2ff',
    card: '#ffffff',
    cardAlt: '#f8fbff',
    header: 'linear-gradient(135deg,#0f4c81,#2563eb)',
    headerText: '#ffffff',
    headerMuted: '#dbeafe',
    text: '#172033',
    muted: '#475569',
    border: '#c7d2fe',
    soft: '#eff6ff',
    footer: '#64748b',
    shadow: '0 24px 70px rgba(37,99,235,.14)',
  },
  emerald: {
    id: 'emerald',
    name: 'أخضر هادئ',
    page: '#ecfdf5',
    card: '#ffffff',
    cardAlt: '#fbfffd',
    header: 'linear-gradient(135deg,#065f46,#10b981)',
    headerText: '#ffffff',
    headerMuted: '#d1fae5',
    text: '#13231d',
    muted: '#3f5f51',
    border: '#a7f3d0',
    soft: '#f0fdf4',
    footer: '#4b6358',
    shadow: '0 24px 70px rgba(16,185,129,.14)',
  },
}

function emailThemeFor(settings = {}) {
  return emailThemes[String(settings.emailTheme || '').trim()] || emailThemes.talabati
}

function orderRows(order) {
  const owners = (order.owners || []).join('، ') || 'غير محدد'
  return [
    ['اسم الطلب', order.title || 'غير محدد'],
    ['المورد', order.supplier || 'غير محدد'],
    ['المسؤولون', owners],
    ['مقدم الطلب', order.requester || 'غير محدد'],
    ['رقم LPO', order.lpo || 'بانتظار LPO'],
    ['رقم الطلب', order.requestNumber || 'غير محدد'],
    ['رقم الدفعة', order.paymentNumber || 'غير محدد'],
    ['القيمة الإجمالية', formatQar(order.amount)],
    ['الحالة', order.status || 'طلب جديد'],
    ['الأولوية', order.priority || 'عادي'],
    ['تاريخ التسليم المتوقع', formatDisplayDate(order.expectedDate)],
    ['تاريخ الإنشاء', formatDisplayDate(order.createdAt || new Date())],
  ]
}

function buildPlainOrderBody(order) {
  const payments = (order.payments || [])
    .map((payment) => `- ${payment.name || 'دفعة'}: ${formatQar(payment.amount)} — ${payment.status || 'غير محدد'}`)
    .join('\n') || '- لا توجد دفعات مسجلة'
  const notes = (order.updates || []).join('\n') || 'لا توجد ملاحظات'
  return [
    'تم إنشاء طلب مشتريات جديد في Talabati.',
    '',
    ...orderRows(order).map(([label, value]) => `${label}: ${value || 'غير محدد'}`),
    '',
    'الدفعات:',
    payments,
    '',
    'الملاحظات:',
    notes,
  ].join('\n')
}

function buildSectionTable(title, headers = [], rows = [], theme = emailThemes.talabati) {
  if (!rows.length) {
    return `<div style="margin-top:18px; padding:16px; border-radius:16px; border:1px solid ${theme.border}; background:${theme.soft}; color:${theme.muted}; font-size:14px; font-weight:700; line-height:1.8;">${escapeHtml(title)}: لا توجد بيانات مسجلة</div>`
  }
  const headerMarkup = headers.map((header) => `<th style="padding:12px 14px; color:${theme.muted}; font-size:13px; line-height:1.6; text-align:right; border-bottom:1px solid ${theme.border}; background:${theme.soft};">${escapeHtml(header)}</th>`).join('')
  const rowsMarkup = rows.map((row) => `<tr>${row.map((value) => `<td style="padding:13px 14px; color:${theme.text}; font-size:14px; line-height:1.7; font-weight:700; text-align:right; border-bottom:1px solid ${theme.border};">${escapeHtml(value || 'غير محدد')}</td>`).join('')}</tr>`).join('')
  return `
                <div style="margin-top:18px;">
                  <h2 style="margin:0 0 10px; color:${theme.text}; font-size:16px; line-height:1.6; font-weight:900;">${escapeHtml(title)}</h2>
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border-radius:16px; border:1px solid ${theme.border}; background:${theme.cardAlt}; direction:rtl; text-align:right;">
                    <thead><tr>${headerMarkup}</tr></thead>
                    <tbody>${rowsMarkup}</tbody>
                  </table>
                </div>`
}

function buildHtmlShell({ title = '', intro, badge = 'تنبيه جديد', rows = [], sections = [], footer = 'هذه رسالة تلقائية من نظام Talabati.', theme = emailThemes.talabati }) {
  const rowMarkup = rows.map(([label, value]) => `
              <tr>
                <th style="width: 34%; padding: 13px 14px; color:${theme.muted}; font-size: 13px; line-height: 1.6; text-align: right; border-bottom: 1px solid ${theme.border}; background:${theme.soft};">${escapeHtml(label)}</th>
                <td style="padding: 13px 14px; color:${theme.text}; font-size: 15px; line-height: 1.7; font-weight: 700; text-align: right; border-bottom: 1px solid ${theme.border};">${escapeHtml(value || 'غير محدد')}</td>
              </tr>`).join('')

  const sectionMarkup = sections.map((section) => buildSectionTable(section.title, section.headers, section.rows, theme)).join('')

  return `<!doctype html>
<html lang="ar" dir="rtl">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title || badge)}</title>
  </head>
  <body dir="rtl" style="margin:0; padding:0; background:${theme.page}; font-family: Tajawal, Arial, Tahoma, sans-serif; direction:rtl; text-align:right;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${theme.page}; padding:28px 12px; direction:rtl;">
      <tr>
        <td align="center">
          <table role="presentation" width="680" cellpadding="0" cellspacing="0" style="width:680px; max-width:100%; overflow:hidden; border-radius:26px; border:1px solid ${theme.border}; background:${theme.card}; box-shadow:${theme.shadow}; direction:rtl; text-align:right;">
            <tr>
              <td style="padding:26px 28px; background-color:${theme.headerFallback || theme.header}; background:${theme.header}; color:${theme.headerText}; text-align:right;">
                <div style="display:inline-block; padding:7px 12px; margin-bottom:12px; border-radius:999px; background:rgba(40,35,29,.28); color:${theme.headerText}; border:1px solid rgba(255,255,255,.36); font-weight:900; font-size:13px;">${escapeHtml(badge)}</div>
                ${title ? `<h1 style="margin:0; color:${theme.headerText}; font-size:25px; line-height:1.45; font-weight:900;">${escapeHtml(title)}</h1>` : ''}
                <p style="margin:10px 0 0; color:${theme.headerMuted}; font-size:15px; line-height:1.8;">${escapeHtml(intro)}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 28px 28px;">
                ${rowMarkup ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%; border-collapse:separate; border-spacing:0; overflow:hidden; border-radius:18px; border:1px solid ${theme.border}; background:${theme.cardAlt}; direction:rtl; text-align:right;">
                  ${rowMarkup}
                </table>` : ''}
                ${sectionMarkup}
                <p style="margin:20px 0 0; color:${theme.footer}; font-size:12px; line-height:1.8; text-align:right;">${escapeHtml(footer)}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`
}

function buildMimeMessage({ from, fromName, to, subject, text, html }) {
  const boundary = `talabati-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const headers = [
    `From: ${encodeHeader(fromName)} <${escapeHeader(from)}>`,
    `To: ${escapeHeader(to)}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ]
  const parts = [
    `--${boundary}`,
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    text,
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
    `--${boundary}--`,
    '',
  ]
  return `${headers.join(CRLF)}${CRLF}${CRLF}${parts.join(CRLF)}`
}

function buildEmail({ to, subject, text, html }, config = smtpConfigFromEnv()) {
  const recipient = String(to || '').trim()
  if (!recipient) throw new Error('Missing email recipient')
  const from = escapeHeader(config.from)
  const fromName = escapeHeader(config.fromName || 'Talabati')
  return {
    from,
    to: recipient,
    message: escapeBody(buildMimeMessage({ from, fromName, to: recipient, subject, text, html })) + CRLF,
  }
}

function buildNewOrderEmail(order, settings = {}, config = smtpConfigFromEnv()) {
  const subject = 'طلب جديد من Talabati'
  const theme = emailThemeFor(settings)
  const paymentRows = (order.payments || []).map((payment, index) => [
    payment.name || `دفعة ${index + 1}`,
    formatQar(payment.amount),
    payment.status || 'غير محدد',
  ])
  const noteRows = (order.updates || []).map((note, index) => [String(index + 1), note])
  const html = buildHtmlShell({
    title: '',
    intro: 'تم إنشاء طلب مشتريات جديد في نظام Talabati ويحتاج المتابعة حسب الإجراءات الداخلية.',
    badge: 'طلب جديد',
    rows: orderRows(order),
    sections: [
      { title: 'الدفعات', headers: ['الدفعة', 'القيمة', 'الحالة'], rows: paymentRows },
      { title: 'الملاحظات', headers: ['#', 'الملاحظة'], rows: noteRows },
    ],
    theme,
  })
  return buildEmail({ to: settings.emailRecipient, subject, text: buildPlainOrderBody(order), html }, config)
}

function buildTestEmail(settings = {}, config = smtpConfigFromEnv()) {
  const subject = 'مرحبا'
  const text = 'مرحبا'
  const html = buildHtmlShell({
    title: '',
    intro: 'مرحبا',
    badge: 'مرحبا',
    rows: [],
    sections: [],
    footer: 'هذه رسالة اختبار تلقائية من نظام Talabati.',
    theme: emailThemeFor(settings),
  })
  return buildEmail({ to: settings.emailRecipient, subject, text, html }, config)
}

function createSmtpClient({ host, port, secure }) {
  return secure
    ? tls.connect({ host, port, servername: host })
    : net.createConnection({ host, port })
}

async function readSmtpResponse(socket) {
  let buffer = ''
  return await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      buffer += chunk.toString('utf8')
      const lines = buffer.split(/\r?\n/).filter(Boolean)
      const last = lines.at(-1) || ''
      if (/^\d{3} /.test(last)) {
        cleanup()
        const code = Number(last.slice(0, 3))
        resolve({ code, text: buffer })
      }
    }
    const onError = (error) => { cleanup(); reject(error) }
    const cleanup = () => {
      socket.off('data', onData)
      socket.off('error', onError)
    }
    socket.on('data', onData)
    socket.on('error', onError)
  })
}

async function expectSmtp(socket, expectedCodes = []) {
  const response = await readSmtpResponse(socket)
  if (!expectedCodes.includes(response.code)) throw new Error(`SMTP error ${response.code}: ${response.text.trim()}`)
  return response
}

async function smtpCommand(socket, command, expectedCodes) {
  socket.write(`${command}${CRLF}`)
  return expectSmtp(socket, expectedCodes)
}

export async function sendMailRelayEmail({ to, message, from }, config = smtpConfigFromEnv()) {
  const socket = createSmtpClient(config)
  await new Promise((resolve, reject) => {
    socket.once('connect', resolve)
    socket.once('secureConnect', resolve)
    socket.once('error', reject)
  })

  try {
    await expectSmtp(socket, [220])
    await smtpCommand(socket, `EHLO ${escapeHeader(process.env.TALABATI_SMTP_HELO || 'talabati.local')}`, [250])
    await smtpCommand(socket, `MAIL FROM:<${escapeHeader(from)}>`, [250])
    await smtpCommand(socket, `RCPT TO:<${escapeHeader(to)}>`, [250, 251])
    await smtpCommand(socket, 'DATA', [354])
    socket.write(`${message}.${CRLF}`)
    await expectSmtp(socket, [250])
    await smtpCommand(socket, 'QUIT', [221])
  } finally {
    socket.end()
  }
}

export async function sendNewOrderEmail({ order, settings, sendMail = sendMailRelayEmail } = {}) {
  if (!boolSetting(settings?.emailNotificationsEnabled)) return { skipped: true, reason: 'disabled' }
  if (!String(settings?.emailRecipient || '').trim()) return { skipped: true, reason: 'missing-recipient' }
  const email = buildNewOrderEmail(order, settings)
  await sendMail(email)
  return { sent: true, to: email.to }
}

export async function sendTestEmail({ settings, sendMail = sendMailRelayEmail } = {}) {
  if (!String(settings?.emailRecipient || '').trim()) return { skipped: true, reason: 'missing-recipient' }
  const email = buildTestEmail(settings)
  await sendMail(email)
  return { sent: true, to: email.to }
}

export { buildNewOrderEmail, buildTestEmail, smtpConfigFromEnv }
