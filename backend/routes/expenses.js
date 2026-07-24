const express = require('express');
const db = require('../db');

const router = express.Router();

// IMPORTANT: Debts are a FOLLOW-UP LEDGER ONLY. The money was already
// counted as revenue on the day it was earned (inside daily_records.debt_added
// or mpesa_agent_records.debt_added). Marking a debt "paid" here just tracks
// that the attendant successfully collected it later - it never re-opens or
// edits the original day's totals.

router.get('/', (req, res) => {
  const { from, to, status, source } = req.query;
  let sql = 'SELECT * FROM debts WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND debt_date >= ?'; params.push(from); }
  if (to) { sql += ' AND debt_date <= ?'; params.push(to); }
  if (status) { sql += ' AND status = ?'; params.push(status); }
  if (source) { sql += ' AND source = ?'; params.push(source); }
  sql += ' ORDER BY status ASC, debt_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.post('/', (req, res) => {
  const { debt_date, customer_name, amount, source = 'water', notes } = req.body;
  if (!debt_date || !customer_name || amount == null) {
    return res.status(400).json({ error: 'debt_date, customer_name, and amount are required' });
  }
  const stmt = db.prepare(`
    INSERT INTO debts (debt_date, customer_name, amount, source, notes)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(debt_date, customer_name, amount, source, notes || null);
  res.status(201).json(db.prepare('SELECT * FROM debts WHERE id = ?').get(result.lastInsertRowid));
});

// Mark as paid / follow up - does NOT touch daily_records or mpesa_agent_records.
router.patch('/:id/pay', (req, res) => {
  const existing = db.prepare('SELECT * FROM debts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Debt not found' });
  const paid_date = req.body.paid_date || new Date().toISOString().slice(0, 10);
  db.prepare(`UPDATE debts SET status = 'paid', paid_date = ? WHERE id = ?`).run(paid_date, req.params.id);
  res.json(db.prepare('SELECT * FROM debts WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM debts WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Debt not found' });
  res.json({ deleted: true });
});

module.exports = router;
