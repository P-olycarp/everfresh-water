const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', (req, res) => {
  const { from, to } = req.query;
  let sql = 'SELECT * FROM mpesa_agent_records WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND record_date >= ?'; params.push(from); }
  if (to) { sql += ' AND record_date <= ?'; params.push(to); }
  sql += ' ORDER BY record_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM mpesa_agent_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Record not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const {
    record_date, attendant_id,
    opening_float = 0, float_topup = 0, closing_float,
    opening_cash = 0, closing_cash,
    debt_added = 0, commission_earned, notes,
  } = req.body;

  if (!record_date || closing_float == null || closing_cash == null) {
    return res.status(400).json({ error: 'record_date, closing_float, and closing_cash are required' });
  }

  const stmt = db.prepare(`
    INSERT INTO mpesa_agent_records
      (record_date, attendant_id, opening_float, float_topup, closing_float,
       opening_cash, closing_cash, debt_added, commission_earned, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    record_date, attendant_id || null, opening_float, float_topup, closing_float,
    opening_cash, closing_cash, debt_added, commission_earned == null ? null : commission_earned, notes || null
  );

  res.status(201).json(db.prepare('SELECT * FROM mpesa_agent_records WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM mpesa_agent_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Record not found' });

  const m = { ...existing, ...req.body };

  db.prepare(`
    UPDATE mpesa_agent_records SET
      record_date = ?, attendant_id = ?, opening_float = ?, float_topup = ?,
      closing_float = ?, opening_cash = ?, closing_cash = ?, debt_added = ?,
      commission_earned = ?, notes = ?
    WHERE id = ?
  `).run(
    m.record_date, m.attendant_id, m.opening_float, m.float_topup,
    m.closing_float, m.opening_cash, m.closing_cash, m.debt_added,
    m.commission_earned, m.notes,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM mpesa_agent_records WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM mpesa_agent_records WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Record not found' });
  res.json({ deleted: true });
});

module.exports = router;
