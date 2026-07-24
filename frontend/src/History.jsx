import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

function fmtDate(d) {
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function WaterHistoryCard({ r }) {
  return (
    <div className={`history-card status-${r.status}`}>
      <div className="history-card-head">
        <div className="history-card-date">{fmtDate(r.record_date)}</div>
        <div className={`history-badge badge-${r.status}`}>
          {r.status === 'shortage' && `Short KES ${Math.abs(r.deficit).toLocaleString()}`}
          {r.status === 'surplus' && `Surplus KES ${Math.abs(r.deficit).toLocaleString()}`}
          {r.status === 'balanced' && 'Balanced'}
        </div>
      </div>
      {r.attendant_name && <div className="history-attendant">Attendant: {r.attendant_name}</div>}
      <p className="history-narrative">{r.narrative}</p>
      <div className="history-figures">
        <span>Machine: KES {r.machine_reading.toLocaleString()}</span>
        <span>Cash: KES {r.cash_counted.toLocaleString()}</span>
        <span>M-Pesa: KES {r.mpesa_received.toLocaleString()}</span>
        <span>Debt: KES {r.debt_added.toLocaleString()}</span>
      </div>
      {r.notes && <div className="history-notes">Notes: {r.notes}</div>}
    </div>
  );
}

function MpesaHistoryCard({ r }) {
  const variance = r.variance;
  const status = variance === 0 ? 'balanced' : variance < 0 ? 'shortage' : 'surplus';
  return (
    <div className={`history-card status-${status}`}>
      <div className="history-card-head">
        <div className="history-card-date">{fmtDate(r.record_date)}</div>
        <div className={`history-badge badge-${status}`}>
          {status === 'shortage' && `Short KES ${Math.abs(variance).toLocaleString()}`}
          {status === 'surplus' && `Extra KES ${Math.abs(variance).toLocaleString()}`}
          {status === 'balanced' && 'Matches'}
        </div>
      </div>
      {r.attendant_name && <div className="history-attendant">Attendant: {r.attendant_name}</div>}
      <p className="history-narrative">{r.narrative}</p>
      <div className="history-figures">
        <span>Opening: KES {r.opening_float.toLocaleString()}</span>
        <span>Top-up: KES {r.float_topup.toLocaleString()}</span>
        {r.water_stock_bought_mpesa > 0 && <span>Water bought: KES {r.water_stock_bought_mpesa.toLocaleString()}</span>}
        {r.expenses_paid_mpesa > 0 && <span>Expenses: KES {r.expenses_paid_mpesa.toLocaleString()}</span>}
        <span>Expected closing: KES {r.expected_closing.toLocaleString()}</span>
        <span>Actual closing: KES {r.closing_float.toLocaleString()}</span>
      </div>
      {r.notes && <div className="history-notes">Notes: {r.notes}</div>}
    </div>
  );
}

export default function History() {
  const [line, setLine] = useState('water');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      const data = line === 'water' ? await api.getWaterHistory(params) : await api.getMpesaHistory(params);
      setRows(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [line, from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="panel">
      <h2 className="panel-title">History</h2>
      <p className="panel-desc">
        A day-by-day explanation of how the money moved, in plain language &mdash;
        not just raw numbers.
      </p>

      <div className="history-controls">
        <div className="history-line-toggle">
          <button className={line === 'water' ? 'active' : ''} onClick={() => setLine('water')}>Water Sales</button>
          <button className={line === 'mpesa' ? 'active' : ''} onClick={() => setLine('mpesa')}>M-Pesa Agent</button>
        </div>
        <div className="history-date-filters">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <span>to</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {loading && <div className="placeholder-note">Loading\u2026</div>}
      {error && <div className="form-error">Could not load history: {error}. Is the backend running?</div>}
      {!loading && !error && rows.length === 0 && (
        <div className="placeholder-note">No records yet for this range.</div>
      )}

      <div className="history-list">
        {rows.map((r) => (line === 'water' ? <WaterHistoryCard key={r.id} r={r} /> : <MpesaHistoryCard key={r.id} r={r} />))}
      </div>
    </div>
  );
}
