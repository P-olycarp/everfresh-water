const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { from, to, type } = req.query;
  let sql = 'SELECT * FROM bottle_transactions WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND txn_date >= ?'; params.push(from); }
  if (to) { sql += ' AND txn_date <= ?'; params.push(to); }
  if (type) { sql += ' AND type = ?'; params.push(type); }
  sql += ' ORDER BY txn_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

// Current stock on hand, plus all-time money totals for this product line -
// bottle sales run on their own money, separate from water and M-Pesa.
router.get('/stock', (req, res) => {
  const restocked = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM bottle_transactions WHERE type = 'restock'`).get().n;
  const sold = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM bottle_transactions WHERE type = 'sale'`).get().n;
  const totalSalesRevenue = db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM bottle_transactions WHERE type = 'sale'`).get().n;
  const totalPurchaseCost = db.prepare(`SELECT COALESCE(SUM(amount),0) AS n FROM bottle_transactions WHERE type = 'restock'`).get().n;
  const profit = Math.round((totalSalesRevenue - totalPurchaseCost) * 100) / 100;
  res.json({
    restocked,
    sold,
    in_stock: restocked - sold,
    total_sales_revenue: totalSalesRevenue,
    total_purchase_cost: totalPurchaseCost,
    profit,
  });
});

router.post('/', (req, res) => {
  const { txn_date, type, quantity, unit_price, paid_from = 'cash', notes } = req.body;
  if (!txn_date || !type || quantity == null || unit_price == null) {
    return res.status(400).json({ error: 'txn_date, type, quantity, and unit_price are required' });
  }
  if (!['restock', 'sale'].includes(type)) {
    return res.status(400).json({ error: "type must be 'restock' or 'sale'" });
  }
  if (type === 'sale') {
    const restocked = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM bottle_transactions WHERE type = 'restock'`).get().n;
    const sold = db.prepare(`SELECT COALESCE(SUM(quantity),0) AS n FROM bottle_transactions WHERE type = 'sale'`).get().n;
    if (quantity > restocked - sold) {
      return res.status(400).json({ error: `Only ${restocked - sold} bottles in stock` });
    }
  }
  const amount = Math.round(quantity * unit_price * 100) / 100;
  const stmt = db.prepare(`
    INSERT INTO bottle_transactions (txn_date, type, quantity, unit_price, amount, paid_from, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(txn_date, type, quantity, unit_price, amount, paid_from, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM bottle_transactions WHERE id = ?').get(result.lastInsertRowid));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM bottle_transactions WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Transaction not found' });
  res.json({ deleted: true });
});

module.exports = router;
