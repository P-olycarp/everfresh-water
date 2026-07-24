import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Debts() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [filter, setFilter] = useState('unpaid');
  const [form, setForm] = useState({ debt_date: todayISO(), customer_name: '', amount: '', source: 'water', notes: '' });

  const load = useCallback(async () => {
    try {
      const params = filter === 'all' ? {} : { status: filter };
      setRows(await api.listDebts(params));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!form.customer_name || form.amount === '') {
      setStatus({ type: 'error', message: 'Customer name and amount are required.' });
      return;
    }
    try {
      await api.createDebt({ ...form, amount: parseFloat(form.amount) });
      setStatus({ type: 'success', message: 'Debt recorded for follow-up.' });
      setForm({ debt_date: todayISO(), customer_name: '', amount: '', source: 'water', notes: '' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  async function markPaid(id) {
    try {
      await api.payDebt(id, todayISO());
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Debts</h2>
      <p className="panel-desc">
        This is a follow-up ledger only. The money was already counted as revenue on the
        day it was recorded &mdash; marking a debt "paid" here just tracks that the
        attendant collected it; it does not change any past day's totals.
      </p>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <label>Date
            <input type="date" value={form.debt_date} onChange={(e) => setForm(f => ({ ...f, debt_date: e.target.value }))} />
          </label>
          <label>Customer name
            <input type="text" value={form.customer_name} onChange={(e) => setForm(f => ({ ...f, customer_name: e.target.value }))} />
          </label>
        </div>
        <div className="form-row">
          <label>Amount
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
          </label>
          <label>Source
            <select value={form.source} onChange={(e) => setForm(f => ({ ...f, source: e.target.value }))}>
              <option value="water">Water (machine)</option>
              <option value="bottle">Bottled water</option>
              <option value="mpesa_agent">M-Pesa agent</option>
            </select>
          </label>
        </div>
        <label className="notes-label">Notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
        </label>
        {status && <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>}
        <button className="gate-btn" type="submit">Record debt</button>
      </form>

      <div className="history-line-toggle" style={{ marginTop: 24 }}>
        <button className={filter === 'unpaid' ? 'active' : ''} onClick={() => setFilter('unpaid')}>Unpaid</button>
        <button className={filter === 'paid' ? 'active' : ''} onClick={() => setFilter('paid')}>Paid</button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>All</button>
      </div>

      <table className="simple-table">
        <thead><tr><th>Date</th><th>Customer</th><th>Amount</th><th>Source</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.debt_date}</td><td>{r.customer_name}</td><td>{r.amount}</td>
              <td>{r.source}</td><td>{r.status}</td>
              <td>{r.status === 'unpaid' && <button className="gate-btn-ghost" onClick={() => markPaid(r.id)}>Mark paid</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
