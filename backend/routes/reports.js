const express = require('express');
const db = require('../db');

const router = express.Router();

function money(n) {
  return `KES ${Number(n || 0).toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

router.get('/water-history', (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT dr.*, u.name AS attendant_name FROM daily_records dr LEFT JOIN users u ON u.id = dr.attendant_id WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND dr.record_date >= ?'; params.push(from); }
  if (to) { sql += ' AND dr.record_date <= ?'; params.push(to); }
  sql += ' ORDER BY dr.record_date DESC, dr.id DESC';

  const rows = db.prepare(sql).all(...params);

  const enriched = rows.map((r) => {
    const collected = r.cash_counted + r.mpesa_received + r.debt_added;
    const status = r.deficit > 0 ? 'shortage' : r.deficit < 0 ? 'surplus' : 'balanced';

    const parts = [];
    parts.push(`The machine recorded ${money(r.machine_reading)} dispensed.`);
    const collectedParts = [];
    if (r.cash_counted) collectedParts.push(`${money(r.cash_counted)} cash`);
    if (r.mpesa_received) collectedParts.push(`${money(r.mpesa_received)} M-Pesa (Pochi la Biashara)`);
    if (r.debt_added) collectedParts.push(`${money(r.debt_added)} recorded as customer debt (already counted as earned)`);
    parts.push(
      collectedParts.length
        ? `Collected: ${collectedParts.join(' + ')} = ${money(collected)} accounted for.`
        : `Nothing was collected against it.`
    );
    if (status === 'shortage') {
      parts.push(`This leaves an unexplained shortage of ${money(r.deficit)}${r.deficit_reason ? ` (reason given: ${r.deficit_reason.replace(/_/g, ' ')})` : ' (no reason given yet)'}.`);
    } else if (status === 'surplus') {
      parts.push(`This is ${money(Math.abs(r.deficit))} more than the machine accounts for (surplus, e.g. rounding or an under-recorded sale).`);
    } else {
      parts.push(`This balances exactly - no shortage or surplus.`);
    }

    return {
      ...r,
      collected_total: Math.round(collected * 100) / 100,
      status,
      narrative: parts.join(' '),
    };
  });

  res.json(enriched);
});

router.get('/mpesa-history', (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT mr.*, u.name AS attendant_name FROM mpesa_agent_records mr LEFT JOIN users u ON u.id = mr.attendant_id WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND mr.record_date >= ?'; params.push(from); }
  if (to) { sql += ' AND mr.record_date <= ?'; params.push(to); }
  sql += ' ORDER BY mr.record_date DESC, mr.id DESC';

  const rows = db.prepare(sql).all(...params);

  const waterStockStmt = db.prepare(
    `SELECT COALESCE(SUM(cost),0) AS total FROM water_purchases WHERE purchase_date = ? AND paid_from = 'mpesa'`
  );
  const expensesStmt = db.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM expenses WHERE expense_date = ? AND paid_from = 'mpesa' AND business_line IN ('mpesa_agent','shared')`
  );

  const enriched = rows.map((r) => {
    const waterStockBought = waterStockStmt.get(r.record_date).total;
    const expensesPaid = expensesStmt.get(r.record_date).total;
    const expectedClosing = Math.round(
      (r.opening_float + r.float_topup - waterStockBought - expensesPaid) * 100
    ) / 100;
    const variance = Math.round((r.closing_float - expectedClosing) * 100) / 100;

    const parts = [];
    parts.push(`Started the day with a float of ${money(r.opening_float)}.`);
    if (r.float_topup) parts.push(`Topped up ${money(r.float_topup)}.`);
    if (waterStockBought) parts.push(`${money(waterStockBought)} was sent out via M-Pesa to buy a new batch of water stock, so it left the agent float.`);
    if (expensesPaid) parts.push(`${money(expensesPaid)} went to M-Pesa-paid expenses.`);
    parts.push(`Expected closing float: ${money(expectedClosing)}.`);
    if (variance === 0) {
      parts.push(`The attendant's count matches exactly.`);
    } else if (variance < 0) {
      parts.push(`The attendant counted ${money(r.closing_float)} - short by ${money(Math.abs(variance))}.`);
    } else {
      parts.push(`The attendant counted ${money(r.closing_float)} - ${money(variance)} more than expected.`);
    }
    parts.push(`Cash at hand started at ${money(r.opening_cash)} and ended the day at ${money(r.closing_cash)}.`);
    if (r.debt_added) parts.push(`${money(r.debt_added)} of today's agent business was on customer debt (already counted as earned).`);
    if (r.commission_earned) parts.push(`Commission earned today: ${money(r.commission_earned)}.`);

    return {
      ...r,
      water_stock_bought_mpesa: waterStockBought,
      expenses_paid_mpesa: expensesPaid,
      expected_closing: expectedClosing,
      variance,
      narrative: parts.join(' '),
    };
  });

  res.json(enriched);
});

router.get('/profit', (req, res) => {
  const { from, to } = req.query;
  const dateFilter = (col) => {
    const clauses = [];
    const params = [];
    if (from) { clauses.push(`${col} >= ?`); params.push(from); }
    if (to) { clauses.push(`${col} <= ?`); params.push(to); }
    return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
  };

  const dr = dateFilter('record_date');
  const waterRevenueRow = db.prepare(
    `SELECT COALESCE(SUM(cash_counted + mpesa_received + debt_added),0) AS total,
            COALESCE(SUM(CASE WHEN deficit > 0 THEN deficit ELSE 0 END),0) AS total_shortage
     FROM daily_records ${dr.where}`
  ).get(...dr.params);

  const wp = dateFilter('purchase_date');
  const waterCost = db.prepare(`SELECT COALESCE(SUM(cost),0) AS total FROM water_purchases ${wp.where}`).get(...wp.params).total;

  const bt = dateFilter('txn_date');
  const bottleSaleWhere = bt.where ? `${bt.where} AND type = 'sale'` : `WHERE type = 'sale'`;
  const bottleRestockWhere = bt.where ? `${bt.where} AND type = 'restock'` : `WHERE type = 'restock'`;
  const bottleRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM bottle_transactions ${bottleSaleWhere}`).get(...bt.params).total;
  const bottleCost = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM bottle_transactions ${bottleRestockWhere}`).get(...bt.params).total;

  const mr = dateFilter('record_date');
  const mpesaCommission = db.prepare(`SELECT COALESCE(SUM(commission_earned),0) AS total FROM mpesa_agent_records ${mr.where}`).get(...mr.params).total;

  const ex = dateFilter('expense_date');
  const expenseRows = db.prepare(`SELECT business_line, COALESCE(SUM(amount),0) AS total FROM expenses ${ex.where} GROUP BY business_line`).all(...ex.params);
  const expensesByLine = { water: 0, mpesa_agent: 0, shared: 0 };
  expenseRows.forEach((row) => { expensesByLine[row.business_line] = row.total; });
  const totalExpenses = expensesByLine.water + expensesByLine.mpesa_agent + expensesByLine.shared;

  const waterProfit = Math.round((waterRevenueRow.total - waterCost - expensesByLine.water) * 100) / 100;
  const bottleProfit = Math.round((bottleRevenue - bottleCost) * 100) / 100;
  const mpesaProfit = Math.round((mpesaCommission - expensesByLine.mpesa_agent) * 100) / 100;
  const netProfit = Math.round((waterProfit + bottleProfit + mpesaProfit - expensesByLine.shared) * 100) / 100;

  const debtsOutstanding = db.prepare(`SELECT COALESCE(SUM(amount),0) AS total FROM debts WHERE status = 'unpaid'`).get().total;

  res.json({
    period: { from: from || null, to: to || null },
    water: {
      revenue_collected: waterRevenueRow.total,
      cost_of_stock: waterCost,
      expenses: expensesByLine.water,
      profit: waterProfit,
      total_shortage_not_collected: waterRevenueRow.total_shortage,
    },
    bottles: {
      revenue: bottleRevenue,
      cost_of_stock: bottleCost,
      profit: bottleProfit,
    },
    mpesa_agent: {
      commission_earned: mpesaCommission,
      expenses: expensesByLine.mpesa_agent,
      profit: mpesaProfit,
    },
    shared_expenses: expensesByLine.shared,
    total_expenses: totalExpenses,
    net_profit: netProfit,
    debts_outstanding_all_time: debtsOutstanding,
    narrative:
      `Water: ${money(waterRevenueRow.total)} collected minus ${money(waterCost)} stock cost minus ${money(expensesByLine.water)} expenses = ${money(waterProfit)} profit. ` +
      `Bottles: ${money(bottleRevenue)} revenue minus ${money(bottleCost)} restock cost = ${money(bottleProfit)} profit. ` +
      `M-Pesa agent: ${money(mpesaCommission)} commission minus ${money(expensesByLine.mpesa_agent)} expenses = ${money(mpesaProfit)} profit. ` +
      `After ${money(expensesByLine.shared)} shared expenses, net profit is ${money(netProfit)}. ` +
      `(${money(debtsOutstanding)} is still outstanding in unpaid customer debts, not a loss - just not yet collected.)`,
  });
});

module.exports = router;
