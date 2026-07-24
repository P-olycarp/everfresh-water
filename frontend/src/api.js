const BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

async function request(path, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const body = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return body;
}

function qs(params = {}) {
  const clean = Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== undefined && v !== null && v !== ''
    )
  );

  const s = new URLSearchParams(clean).toString();
  return s ? `?${s}` : '';
}

export const api = {
  // ===========================
  // AUTH
  // ===========================

  login(pin) {
    return request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ pin }),
    });
  },

  health() {
    return request('/health');
  },

  // ===========================
  // DAILY RECORDS
  // ===========================

  listDailyRecords: (params = {}) =>
    request(`/daily-records${qs(params)}`),

  createDailyRecord: (data) =>
    request('/daily-records', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateDailyRecord: (id, data) =>
    request(`/daily-records/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteDailyRecord: (id) =>
    request(`/daily-records/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // MPESA
  // ===========================

  listMpesaAgent: (params = {}) =>
    request(`/mpesa-agent${qs(params)}`),

  createMpesaAgent: (data) =>
    request('/mpesa-agent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateMpesaAgent: (id, data) =>
    request(`/mpesa-agent/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  deleteMpesaAgent: (id) =>
    request(`/mpesa-agent/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // WATER PURCHASES
  // ===========================

  listWaterPurchases: (params = {}) =>
    request(`/water-purchases${qs(params)}`),

  createWaterPurchase: (data) =>
    request('/water-purchases', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteWaterPurchase: (id) =>
    request(`/water-purchases/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // BOTTLES
  // ===========================

  listBottles: (params = {}) =>
    request(`/bottles${qs(params)}`),

  getBottleStock: () =>
    request('/bottles/stock'),

  createBottleTxn: (data) =>
    request('/bottles', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteBottleTxn: (id) =>
    request(`/bottles/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // EXPENSES
  // ===========================

  listExpenses: (params = {}) =>
    request(`/expenses${qs(params)}`),

  createExpense: (data) =>
    request('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteExpense: (id) =>
    request(`/expenses/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // DEBTS
  // ===========================

  listDebts: (params = {}) =>
    request(`/debts${qs(params)}`),

  createDebt: (data) =>
    request('/debts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  payDebt: (id, paid_date) =>
    request(`/debts/${id}/pay`, {
      method: 'PATCH',
      body: JSON.stringify({ paid_date }),
    }),

  deleteDebt: (id) =>
    request(`/debts/${id}`, {
      method: 'DELETE',
    }),

  // ===========================
  // REPORTS
  // ===========================

  getWaterHistory: (params = {}) =>
    request(`/reports/water-history${qs(params)}`),

  getMpesaHistory: (params = {}) =>
    request(`/reports/mpesa-history${qs(params)}`),

  getProfitReport: (params = {}) =>
    request(`/reports/profit${qs(params)}`),

  // ===========================
  // BATCHES (NEW)
  // ===========================

  getActiveBatch: () =>
    request('/batches/active'),

  startNewBatch: (data) =>
    request('/batches/start', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listBatches: () =>
    request('/batches'),
};
