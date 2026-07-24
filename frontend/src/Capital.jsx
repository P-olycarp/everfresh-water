import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Capital() {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ purchase_date: todayISO(), liters: '', cost: '', supplier: '', paid_from: 'cash', notes: '' });

  const load = useCallback(async () => {
    try { setRows((await api.listWaterPurchases()).slice(0, 15)); }
    catch (err) { setStatus({ type: 'error', message: err.message }); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (form.cost === '') {
      setStatus({ type: 'error', message: 'Cost is required.' });
      return;
    }
    try {
      await api.createWaterPurchase({
        ...form,
        liters: form.liters === '' ? null : parseFloat(form.liters),
        cost: parseFloat(form.cost),
      });
      setStatus({
        type: 'success',
        message: form.paid_from === 'mpesa'
          ? 'Saved. This will show as a deduction from that day\u2019s M-Pesa float in M-Pesa History.'
          : 'Saved.',
      });
      setForm({ purchase_date: todayISO(), liters: '', cost: '', supplier: '', paid_from: 'cash', notes: '' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Capital &amp; Water Purchases</h2>
      <p className="panel-desc">
        Record every batch of water bought. If it was paid via M-Pesa, that amount is
        automatically pulled out of the M-Pesa agent float for that day when you view
        M-Pesa History &mdash; no manual adjustment needed.
      </p>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <label>Date
            <input type="date" value={form.purchase_date} onChange={(e) => setForm(f => ({ ...f, purchase_date: e.target.value }))} />
          </label>
          <label>Liters (optional)
            <input type="number" step="0.01" value={form.liters} onChange={(e) => setForm(f => ({ ...f, liters: e.target.value }))} />
          </label>
        </div>
        <div className="form-row">
          <label>Cost (KES)
            <input type="number" step="0.01" value={form.cost} onChange={(e) => setForm(f => ({ ...f, cost: e.target.value }))} />
          </label>
          <label>Supplier
            <input type="text" value={form.supplier} onChange={(e) => setForm(f => ({ ...f, supplier: e.target.value }))} />
          </label>
        </div>
        <label>Paid from
          <select value={form.paid_from} onChange={(e) => setForm(f => ({ ...f, paid_from: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa (agent float)</option>
          </select>
        </label>
        <label className="notes-label">Notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
        </label>
        {status && <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>}
        <button className="gate-btn" type="submit">Save purchase</button>
      </form>

      <h3 className="subsection-title">Recent purchases</h3>
      <table className="simple-table">
        <thead><tr><th>Date</th><th>Liters</th><th>Cost</th><th>Supplier</th><th>Paid from</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}><td>{r.purchase_date}</td><td>{r.liters ?? '-'}</td><td>{r.cost}</td><td>{r.supplier ?? '-'}</td><td>{r.paid_from}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
