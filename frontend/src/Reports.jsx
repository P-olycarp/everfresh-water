import { useState, useEffect, useCallback } from 'react';
import { api } from './api.js';

export default function Reports() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const load = useCallback(async () => {
    try {
      const params = {};
      if (from) params.from = from;
      if (to) params.to = to;
      setData(await api.getProfitReport(params));
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="panel">
      <h2 className="panel-title">Reports &amp; Profit</h2>
      <p className="panel-desc">Revenue, cost, and profit across all three lines of the business.</p>

      <div className="history-date-filters" style={{ marginBottom: 20 }}>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>to</span>
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>

      {error && <div className="form-error">Could not load report: {error}.</div>}

      {data && (
        <>
          <p className="history-narrative" style={{ marginBottom: 20 }}>{data.narrative}</p>

          <div className="report-grid">
            <div className="report-card">
              <div className="report-card-title">Water</div>
              <div className="report-row"><span>Collected</span><span>KES {data.water.revenue_collected.toLocaleString()}</span></div>
              <div className="report-row"><span>Stock cost</span><span>-KES {data.water.cost_of_stock.toLocaleString()}</span></div>
              <div className="report-row"><span>Expenses</span><span>-KES {data.water.expenses.toLocaleString()}</span></div>
              <div className="report-row report-total"><span>Profit</span><span>KES {data.water.profit.toLocaleString()}</span></div>
            </div>
            <div className="report-card">
              <div className="report-card-title">Bottles</div>
              <div className="report-row"><span>Revenue</span><span>KES {data.bottles.revenue.toLocaleString()}</span></div>
              <div className="report-row"><span>Restock cost</span><span>-KES {data.bottles.cost_of_stock.toLocaleString()}</span></div>
              <div className="report-row report-total"><span>Profit</span><span>KES {data.bottles.profit.toLocaleString()}</span></div>
            </div>
            <div className="report-card">
              <div className="report-card-title">M-Pesa Agent</div>
              <div className="report-row"><span>Commission</span><span>KES {data.mpesa_agent.commission_earned.toLocaleString()}</span></div>
              <div className="report-row"><span>Expenses</span><span>-KES {data.mpesa_agent.expenses.toLocaleString()}</span></div>
              <div className="report-row report-total"><span>Profit</span><span>KES {data.mpesa_agent.profit.toLocaleString()}</span></div>
            </div>
          </div>

          <div className="deficit-preview" style={{ marginTop: 20 }}>
            <div className="deficit-preview-label">Net Profit</div>
            <div className="deficit-preview-value">KES {data.net_profit.toLocaleString()}</div>
          </div>

          <div className="stock-summary" style={{ marginTop: 16 }}>
            <span>Debts outstanding: KES {data.debts_outstanding_all_time.toLocaleString()}</span>
            <span>Shortage not yet collected: KES {data.water.total_shortage_not_collected.toLocaleString()}</span>
          </div>
        </>
      )}
    </div>
  );
}
