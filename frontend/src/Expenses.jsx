import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Expenses() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({
    expense_date: todayISO(), category: '', amount: '', frequency: 'daily',
    paid_from: 'cash', business_line: 'water', notes: '',
  });

  const load = useCallback(async () => {
    try { setRows((await api.listExpenses()).slice(0, 15)); }
    catch (err) { setStatus({ type: 'error', message: err.message }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (!form.category || form.amount === '') {
      setStatus({ type: 'error', message: 'Category and amount are required.' });
      return;
    }
    try {
      await api.createExpense({ ...form, amount: parseFloat(form.amount) });
      setStatus({ type: 'success', message: 'Saved.' });
      setForm({ expense_date: todayISO(), category: '', amount: '', frequency: 'daily', paid_from: 'cash', business_line: 'water', notes: '' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Expenses</h2>
      <p className="panel-desc">Daily or monthly running costs, tagged to whichever business line they belong to (water, M-Pesa agent, or shared) so profit reports split correctly.</p>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <label>Date
            <input type="date" value={form.expense_date} onChange={(e) => setForm(f => ({ ...f, expense_date: e.target.value }))} />
          </label>
          <label>Category
            <input type="text" placeholder="e.g. rent, electricity" value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} />
          </label>
        </div>
        <div className="form-row">
          <label>Amount (KES)
            <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} />
          </label>
          <label>Frequency
            <select value={form.frequency} onChange={(e) => setForm(f => ({ ...f, frequency: e.target.value }))}>
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
              <option value="one_off">One-off</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>Paid from
            <select value={form.paid_from} onChange={(e) => setForm(f => ({ ...f, paid_from: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="mpesa">M-Pesa</option>
            </select>
          </label>
          <label>Business line
            <select value={form.business_line} onChange={(e) => setForm(f => ({ ...f, business_line: e.target.value }))}>
              <option value="water">Water</option>
              <option value="mpesa_agent">M-Pesa agent</option>
              <option value="shared">Shared</option>
            </select>
          </label>
        </div>
        <label className="notes-label">Notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
        </label>
        {status && <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>}
        <button className="gate-btn" type="submit">Save expense</button>
      </form>

      <h3 className="subsection-title">Recent expenses</h3>
      <table className="simple-table">
        <thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Line</th><th>Paid from</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}><td>{r.expense_date}</td><td>{r.category}</td><td>{r.amount}</td><td>{r.business_line}</td><td>{r.paid_from}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
