import { useState, useMemo } from 'react';
import { api } from './api.js';

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

const EMPTY_FORM = {
  record_date: todayISO(),
  attendant_name: '',
  machine_reading: '',
  cash_counted: '',
  mpesa_received: '',
  debt_added: '',
  deficit_reason: '',
  notes: '',
};

function num(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

export default function DailyEntry() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const deficit = useMemo(() => {
    const collected = num(form.cash_counted) + num(form.mpesa_received) + num(form.debt_added);
    return Math.round((num(form.machine_reading) - collected) * 100) / 100;
  }, [form.machine_reading, form.cash_counted, form.mpesa_received, form.debt_added]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);

    if (!form.record_date || form.machine_reading === '' || form.cash_counted === '') {
      setStatus({ type: 'error', message: 'Date, machine reading, and cash received are required.' });
      return;
    }

    setSubmitting(true);
    try {
      await api.createDailyRecord({
        record_date: form.record_date,
        machine_reading: num(form.machine_reading),
        cash_counted: num(form.cash_counted),
        mpesa_received: num(form.mpesa_received),
        debt_added: num(form.debt_added),
        deficit_reason: form.deficit_reason || null,
        notes: form.attendant_name
          ? `Attendant: ${form.attendant_name}${form.notes ? ' - ' + form.notes : ''}`
          : form.notes || null,
      });
      setStatus({ type: 'success', message: 'Saved. Today\u2019s water record has been recorded.' });
      setForm(EMPTY_FORM);
    } catch (err) {
      setStatus({
        type: 'error',
        message: `Could not save: ${err.message}. Is the backend running at localhost:4000?`,
      });
    } finally {
      setSubmitting(false);
    }
  }

  const deficitLabel = deficit > 0 ? 'Shortage' : deficit < 0 ? 'Surplus' : 'Balanced';
  const deficitClass = deficit > 0 ? 'deficit-short' : deficit < 0 ? 'deficit-surplus' : 'deficit-even';

  return (
    <div className="panel">
      <h2 className="panel-title">Daily Entry &mdash; Water Sales</h2>
      <p className="panel-desc">
        Enter what the machine says was dispensed, then what was actually collected
        for water &mdash; cash, M-Pesa, and any debt. Debt counts as collected money
        right away &mdash; it will simply need to be followed up and settled later.
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
            Machine reading (KES)
            <input type="number" step="0.01" placeholder="0" value={form.machine_reading} onChange={(e) => update('machine_reading', e.target.value)} />
          </label>
          <label>
            Cash received for water alone
            <input type="number" step="0.01" placeholder="0" value={form.cash_counted} onChange={(e) => update('cash_counted', e.target.value)} />
          </label>
        </div>

        <div className="form-row">
          <label>
            M-Pesa received for water only
            <input type="number" step="0.01" placeholder="0" value={form.mpesa_received} onChange={(e) => update('mpesa_received', e.target.value)} />
          </label>
          <label>
            Debt added today
            <input type="number" step="0.01" placeholder="0" value={form.debt_added} onChange={(e) => update('debt_added', e.target.value)} />
          </label>
        </div>

        <label>
          Deficit reason (if any)
          <select value={form.deficit_reason} onChange={(e) => update('deficit_reason', e.target.value)}>
            <option value="">&mdash; select &mdash;</option>
            <option value="non_standard_container">Non-standard container</option>
            <option value="spillage">Spillage</option>
            <option value="other">Other</option>
          </select>
        </label>

        <label className="notes-label">
          Notes
          <textarea rows={2} placeholder="Anything worth flagging about today" value={form.notes} onChange={(e) => update('notes', e.target.value)} />
        </label>

        <div className={`deficit-preview ${deficitClass}`}>
          <div className="deficit-preview-label">{deficitLabel}</div>
          <div className="deficit-preview-value">{deficit > 0 ? '+' : ''}{deficit.toFixed(2)}</div>
        </div>

        {status && (
          <div className={status.type === 'success' ? 'form-success' : 'form-error'}>{status.message}</div>
        )}

        <button className="gate-btn" type="submit" disabled={submitting}>
          {submitting ? 'Saving\u2026' : 'Save today\u2019s record'}
        </button>
      </form>
    </div>
  );
}
