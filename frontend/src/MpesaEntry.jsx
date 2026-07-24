import { useState, useEffect } from 'react';
import { api } from './api.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function makeEmptyExpenseRow() {
  return { key: Math.random().toString(36).slice(2), category: '', amount: '' };
}

const EMPTY_FORM = {
  record_date: todayISO(),
  attendant_name: '',
  opening_float: '',
  opening_cash: '',
  float_topup: '',
  closing_float: '',
  closing_cash: '',
  debt_added: '',
  commission_earned: '',
  notes: '',
  batch_id: null,
};

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function MpesaEntry() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [expenseRows, setExpenseRows] = useState([makeEmptyExpenseRow()]);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [batch, setBatch] = useState(null);
  const [batches, setBatches] = useState([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [newBatchData, setNewBatchData] = useState({
    opening_float: 0,
    opening_cash: 0,
    water_cost: 0,
  });

  // Load current batch
  useEffect(() => {
    loadBatch();
  }, []);

  async function loadBatch() {
    try {
      const data = await api.getActiveBatch();
      setBatch(data);
      // Set opening values from batch
      setForm(f => ({
        ...f,
        opening_float: data.opening_float?.toString() || '',
        opening_cash: data.opening_cash?.toString() || '',
        batch_id: data.id,
      }));
    } catch (err) {
      console.error('Error loading batch:', err);
    }
  }

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function updateExpenseRow(key, field, value) {
    setExpenseRows((rows) => rows.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  function addExpenseRow() {
    setExpenseRows((rows) => [...rows, makeEmptyExpenseRow()]);
  }

  function removeExpenseRow(key) {
    setExpenseRows((rows) => (rows.length > 1 ? rows.filter((r) => r.key !== key) : rows));
  }

  // Calculate totals
  const openingTotal = num(form.opening_float) + num(form.opening_cash);
  const totalExpenses = expenseRows.reduce((sum, row) => sum + num(row.amount), 0);
  const totalDeductions = totalExpenses + num(form.debt_added);
  const expectedClosing = openingTotal + num(form.float_topup) - totalDeductions;
  const actualClosing = num(form.closing_float) + num(form.closing_cash);
  const variance = actualClosing - expectedClosing;

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!form.record_date || form.closing_float === '' || form.closing_cash === '') {
      setStatus({ type: 'error', message: 'Date, closing float, and closing cash are required.' });
      return;
    }

    setSubmitting(true);
    try {
      // Save M-Pesa agent record
      const mpesaData = {
        record_date: form.record_date,
        opening_float: num(form.opening_float),
        opening_cash: num(form.opening_cash),
        float_topup: num(form.float_topup),
        closing_float: num(form.closing_float),
        closing_cash: num(form.closing_cash),
        debt_added: num(form.debt_added),
        commission_earned: form.commission_earned === '' ? null : num(form.commission_earned),
        attendant_id: null,
        batch_id: batch?.id,
        notes: form.attendant_name
          ? `Attendant: ${form.attendant_name}${form.notes ? ' - ' + form.notes : ''}`
          : form.notes || null,
      };

      await api.createMpesaAgent(mpesaData);

      // Save expenses
      const validExpenses = expenseRows.filter((r) => r.category.trim() && r.amount !== '');
      for (const row of validExpenses) {
        await api.createExpense({
          expense_date: form.record_date,
          category: row.category.trim(),
          amount: num(row.amount),
          frequency: 'daily',
          paid_from: 'mpesa',
          business_line: 'mpesa_agent',
          batch_id: batch?.id,
        });
      }

      // Save debts if any
      if (num(form.debt_added) > 0) {
        await api.createDebt({
          debt_date: form.record_date,
          customer_name: form.attendant_name || 'M-Pesa Customer',
          amount: num(form.debt_added),
          source: 'mpesa_agent',
          batch_id: batch?.id,
          notes: 'Auto-created from M-Pesa agent entry',
        });
      }

      setStatus({
        type: 'success',
        message: validExpenses.length
          ? `Saved. M-Pesa record and ${validExpenses.length} expense(s) recorded.`
          : 'Saved. M-Pesa record recorded.',
      });
      setForm(EMPTY_FORM);
      setExpenseRows([makeEmptyExpenseRow()]);
      loadBatch(); // Reload batch to get updated totals
    } catch (err) {
      console.error('Save error:', err);
      setStatus({ type: 'error', message: `Could not save: ${err.message}` });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStartNewBatch() {
    try {
      await api.startNewBatch(newBatchData);
      setShowBatchModal(false);
      loadBatch();
      setStatus({ type: 'success', message: 'New batch started!' });
    } catch (err) {
      setStatus({ type: 'error', message: `Could not start batch: ${err.message}` });
    }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">M-Pesa Agent</h2>
      
      {/* Batch Info */}
      {batch && (
        <div className="batch-info" style={{ background: '#f0f7ff', padding: 12, borderRadius: 8, marginBottom: 16 }}>
          <strong>Batch: {batch.batch_number}</strong>
          <span style={{ marginLeft: 16 }}>Started: {batch.start_date}</span>
          <span style={{ marginLeft: 16 }}>Status: {batch.status}</span>
          <button 
            className="gate-btn-ghost" 
            style={{ marginLeft: 16 }}
            onClick={() => setShowBatchModal(true)}
          >
            Start New Batch
          </button>
        </div>
      )}

      <p className="panel-desc">
        Track M-Pesa agent float and cash. All expenses and debts are deducted from the total.
      </p>

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-row">
          <label>
            Date
            <input type="date" value={form.record_date} onChange={(e) => update('record_date', e.target.value)} />
          </label>
          <label>
            Attendant name
            <input type="text" placeholder="e.g. Wanjiku" value={form.attendant_name} onChange={(e) => update('attendant_name', e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            Opening float
            <input type="number" step="0.01" placeholder="0" value={form.opening_float} onChange={(e) => update('opening_float', e.target.value)} />
          </label>
          <label>
            Opening cash
            <input type="number" step="0.01" placeholder="0" value={form.opening_cash} onChange={(e) => update('opening_cash', e.target.value)} />
          </label>
        </div>

        <label>
          Float top-up today (from finished batch or manual)
          <input type="number" step="0.01" placeholder="0" value={form.float_topup} onChange={(e) => update('float_topup', e.target.value)} />
        </label>

        <div className="expense-rows-section">
          <div className="expense-rows-label">Expenses today (deducted from total)</div>
          {expenseRows.map((row) => (
            <div className="expense-row" key={row.key}>
              <input
                type="text"
                placeholder="e.g. airtime, transport"
                value={row.category}
                onChange={(e) => updateExpenseRow(row.key, 'category', e.target.value)}
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={row.amount}
                onChange={(e) => updateExpenseRow(row.key, 'amount', e.target.value)}
              />
              <button
                type="button"
                className="gate-btn-ghost expense-row-remove"
                onClick={() => removeExpenseRow(row.key)}
              >
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="gate-btn-ghost" onClick={addExpenseRow}>
            + Add another expense
          </button>
        </div>

        <label>
          Debts added today (deducted from total)
          <input type="number" step="0.01" placeholder="0" value={form.debt_added} onChange={(e) => update('debt_added', e.target.value)} />
        </label>

        <div className="form-row">
          <label>
            Closing float (counted)
            <input type="number" step="0.01" placeholder="0" value={form.closing_float} onChange={(e) => update('closing_float', e.target.value)} />
          </label>
          <label>
            Closing cash (counted)
            <input type="number" step="0.01" placeholder="0" value={form.closing_cash} onChange={(e) => update('closing_cash', e.target.value)} />
          </label>
        </div>

        <label>
          Commission earned (optional)
          <input type="number" step="0.01" placeholder="0" value={form.commission_earned} onChange={(e) => update('commission_earned', e.target.value)} />
        </label>

        <div className="summary-box" style={{ background: '#f5f5f5', padding: 16, borderRadius: 8, marginTop: 16 }}>
          <h4>Summary</h4>
          <div className="form-row">
            <span>Total opening: KES {openingTotal.toFixed(2)}</span>
            <span>Top-up: KES {num(form.float_topup).toFixed(2)}</span>
          </div>
          <div className="form-row">
            <span>Total expenses: KES {totalExpenses.toFixed(2)}</span>
            <span>Debts added: KES {num(form.debt_added).toFixed(2)}</span>
          </div>
          <div className="form-row">
            <span>Expected closing: KES {expectedClosing.toFixed(2)}</span>
            <span>Actual closing: KES {actualClosing.toFixed(2)}</span>
          </div>
          <div className="form-row" style={{ fontWeight: 'bold', color: variance === 0 ? 'green' : variance > 0 ? 'blue' : 'red' }}>
            <span>Variance: {variance > 0 ? '+' : ''}{variance.toFixed(2)}</span>
            <span>{variance === 0 ? '? Balanced' : variance > 0 ? '?? Surplus' : '?? Shortage'}</span>
          </div>
        </div>

        <label className="notes-label">
          Notes
          <textarea rows={2} placeholder="Anything worth flagging about today" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </label>

        {status && (
          <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>
        )}

        <button className="gate-btn" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : 'Save M-Pesa Record'}
        </button>
      </form>

      {/* New Batch Modal */}
      {showBatchModal && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ background: 'white', padding: 24, borderRadius: 12, maxWidth: 500, width: '100%' }}>
            <h3>Start New Batch</h3>
            <p>This will close the current batch and start a new one.</p>
            <div className="form-row">
              <label>
                Opening float for new batch
                <input type="number" step="0.01" value={newBatchData.opening_float} onChange={(e) => setNewBatchData({ ...newBatchData, opening_float: parseFloat(e.target.value) || 0 })} />
              </label>
              <label>
                Opening cash for new batch
                <input type="number" step="0.01" value={newBatchData.opening_cash} onChange={(e) => setNewBatchData({ ...newBatchData, opening_cash: parseFloat(e.target.value) || 0 })} />
              </label>
            </div>
            <label>
              Cost of new water batch
              <input type="number" step="0.01" value={newBatchData.water_cost} onChange={(e) => setNewBatchData({ ...newBatchData, water_cost: parseFloat(e.target.value) || 0 })} />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <button className="gate-btn" onClick={handleStartNewBatch}>Start New Batch</button>
              <button className="gate-btn-ghost" onClick={() => setShowBatchModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
