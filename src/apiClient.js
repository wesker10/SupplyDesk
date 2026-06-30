async function parseResponse(response) {
  if (!response.ok) throw new Error(`Talabati API request failed: ${response.status}`)
  if (response.status === 204) return {}
  return response.json()
}

function jsonRequest(method, payload) {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  }
}

export async function fetchOrdersApi(fetchImpl = fetch, view = '') {
  const url = view ? `/api/orders?view=${encodeURIComponent(view)}` : '/api/orders'
  const body = await parseResponse(await fetchImpl(url))
  return body.orders || []
}

export async function createOrderApi(form, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/orders', jsonRequest('POST', form)))
  return body.order
}

export async function updateOrderApi(orderId, patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}`, jsonRequest('PATCH', patch)))
  return body.order
}

export async function addPaymentApi(orderId, payment, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/payments`, jsonRequest('POST', payment)))
  return body.order
}

export async function updatePaymentApi(orderId, paymentId, patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}`, jsonRequest('PATCH', patch)))
  return body.order
}

export async function deletePaymentApi(orderId, paymentId, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}`, jsonRequest('DELETE', {})))
  return body.order
}

export async function fetchSettingsApi(fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/settings'))
  return body.settings || {}
}

export async function fetchAuthStatusApi(fetchImpl = fetch) {
  return parseResponse(await fetchImpl('/api/auth/status'))
}

export async function loginApi(password, fetchImpl = fetch) {
  return parseResponse(await fetchImpl('/api/auth/login', jsonRequest('POST', { password })))
}

export async function logoutApi(fetchImpl = fetch) {
  return parseResponse(await fetchImpl('/api/auth/logout', jsonRequest('POST', {})))
}

export async function updateSettingsApi(patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/settings', jsonRequest('PATCH', patch)))
  return body.settings || {}
}

export async function archiveOrderApi(orderId, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/archive`, jsonRequest('POST', {})))
  return body.order
}

export async function trashOrderApi(orderId, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/trash`, jsonRequest('POST', {})))
  return body.order
}

export async function restoreOrderApi(orderId, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}/restore`, jsonRequest('POST', {})))
  return body.order
}

export async function deleteOrderForeverApi(orderId, fetchImpl = fetch) {
  await parseResponse(await fetchImpl(`/api/orders/${encodeURIComponent(orderId)}`, jsonRequest('DELETE', {})))
  return true
}

export async function fetchSuppliersApi(fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/suppliers'))
  return body.suppliers || []
}

export async function createSupplierApi(form, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/suppliers', jsonRequest('POST', form)))
  return body.supplier
}

export async function updateSupplierApi(supplierId, patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/suppliers/${encodeURIComponent(supplierId)}`, jsonRequest('PATCH', patch)))
  return body.supplier
}


export async function fetchBudgetYearsApi(fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/budget-years'))
  return body.years || []
}

export async function createBudgetYearApi(form, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/budget-years', jsonRequest('POST', form)))
  return body.year
}

export async function updateBudgetYearApi(year, patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/budget-years/${encodeURIComponent(year)}`, jsonRequest('PATCH', patch)))
  return body.year
}

export async function fetchBudgetCategoriesApi(fetchImpl = fetch, year = '') {
  const url = year ? `/api/budget-categories?year=${encodeURIComponent(year)}` : '/api/budget-categories'
  const body = await parseResponse(await fetchImpl(url))
  return body.categories || []
}

export async function createBudgetCategoryApi(form, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl('/api/budget-categories', jsonRequest('POST', form)))
  return body.category
}

export async function updateBudgetCategoryApi(categoryId, patch, fetchImpl = fetch) {
  const body = await parseResponse(await fetchImpl(`/api/budget-categories/${encodeURIComponent(categoryId)}`, jsonRequest('PATCH', patch)))
  return body.category
}

export async function deleteBudgetCategoryApi(categoryId, fetchImpl = fetch) {
  await parseResponse(await fetchImpl(`/api/budget-categories/${encodeURIComponent(categoryId)}`, jsonRequest('DELETE', {})))
  return true
}
