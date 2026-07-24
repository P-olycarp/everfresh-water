import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

function todayISO() { return new Date().toISOString().slice(0, 10); }

export default function Bottles() {
  const [stock, setStock] = useState(null);
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(null);
  const [form, setForm] = useState({ txn_date: todayISO(), type: 'sale', quantity: '', unit_price: '', paid_from: 'cash', notes: '' });

  const load = useCallback(async () => {
    try {
      const [s, list] = await Promise.all([api.getBottleStock(), api.listBottles()]);
      setStock(s);
      setRows(list.slice(0, 15));
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (form.quantity === '' || form.unit_price === '') {
      setStatus({ type: 'error', message: 'Quantity and unit price are required.' });
      return;
    }
    try {
      await api.createBottleTxn({
        ...form,
        quantity: parseInt(form.quantity, 10),
        unit_price: parseFloat(form.unit_price),
      });
      setStatus({ type: 'success', message: 'Saved.' });
      setForm({ txn_date: todayISO(), type: 'sale', quantity: '', unit_price: '', paid_from: 'cash', notes: '' });
      load();
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Bottle Sales &amp; Stock</h2>
      <p className="panel-desc">Separate product line from the vending machine. Restock adds to stock, sale takes from it.</p>

      {stock && (
        <div className="stock-summary">
          <span>Restocked (all time): {stock.restocked}</span>
          <span>Sold (all time): {stock.sold}</span>
          <span className="stock-current">In stock now: {stock.in_stock}</span>
        </div>
      )}

      {stock && (
        <div className="report-grid" style={{ marginBottom: 20 }}>
          <div className="report-card">
            <div className="report-card-title">Bottle Money (all time)</div>
            <div className="report-row"><span>Sales revenue</span><span>KES {stock.total_sales_revenue.toLocaleString()}</span></div>
            <div className="report-row"><span>Purchase cost</span><span>-KES {stock.total_purchase_cost.toLocaleString()}</span></div>
            <div className="report-row report-total"><span>Profit</span><span>KES {stock.profit.toLocaleString()}</span></div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <label>Date
            <input type="date" value={form.txn_date} onChange={(e) => setForm(f => ({ ...f, txn_date: e.target.value }))} />
          </label>
          <label>Type
            <select value={form.type} onChange={(e) => setForm(f => ({ ...f, type: e.target.value }))}>
              <option value="sale">Sale</option>
              <option value="restock">Restock</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>Quantity
            <input type="number" placeholder="0" value={form.quantity} onChange={(e) => setForm(f => ({ ...f, quantity: e.target.value }))} />
          </label>
          <label>Unit price (KES)
            <input type="number" step="0.01" placeholder="0" value={form.unit_price} onChange={(e) => setForm(f => ({ ...f, unit_price: e.target.value }))} />
          </label>
        </div>
        <label>Paid via
          <select value={form.paid_from} onChange={(e) => setForm(f => ({ ...f, paid_from: e.target.value }))}>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="debt">Debt (unpaid)</option>
            <option value="n_a">N/A (restock)</option>
          </select>
        </label>
        <label className="notes-label">Notes
          <textarea rows={2} value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} />
        </label>
        {status && <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>}
        <button className="gate-btn" type="submit">Save</button>
      </form>

      <h3 className="subsection-title">Recent transactions</h3>
      <table className="simple-table">
        <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Unit</th><th>Amount</th><th>Paid via</th></tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.id}>
              <td>{r.txn_date}</td><td>{r.type}</td><td>{r.quantity}</td>
              <td>{r.unit_price}</td><td>{r.amount}</td><td>{r.paid_from}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
