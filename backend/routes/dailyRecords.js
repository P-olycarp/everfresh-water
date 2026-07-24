const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Debts are treated as ALREADY ACCOUNTED revenue - once an attendant
// records a debt, that money counts as collected (the customer owes the
// SHOP, not the till). So "collected" = cash + mpesa + debt.
// deficit = what the machine says was dispensed, minus what was actually
// collected in any form. Positive = real unexplained shortage
// (spillage / bad containers). Negative = surplus.
function calcDeficit({ machine_reading, cash_counted, mpesa_received, debt_added }) {
  const collected = (cash_counted || 0) + (mpesa_received || 0) + (debt_added || 0);
  return Math.round((machine_reading - collected) * 100) / 100;
}

router.get('/', (req, res) => {
  const { from, to, attendant_id } = req.query;
  let sql = 'SELECT * FROM daily_records WHERE 1=1';
  const params = [];
  if (from) { sql += ' AND record_date >= ?'; params.push(from); }
  if (to) { sql += ' AND record_date <= ?'; params.push(to); }
  if (attendant_id) { sql += ' AND attendant_id = ?'; params.push(attendant_id); }
  sql += ' ORDER BY record_date DESC, id DESC';
  res.json(db.prepare(sql).all(...params));
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Daily record not found' });
  res.json(row);
});

router.post('/', (req, res) => {
  const {
    record_date, attendant_id, machine_reading,
    cash_counted, mpesa_received = 0, debt_added = 0, deficit_reason, notes,
  } = req.body;

  if (!record_date || machine_reading == null || cash_counted == null) {
    return res.status(400).json({ error: 'record_date, machine_reading, and cash_counted are required' });
  }

  const deficit = calcDeficit({ machine_reading, cash_counted, mpesa_received, debt_added });

  const stmt = db.prepare(`
    INSERT INTO daily_records
      (record_date, attendant_id, machine_reading, cash_counted,
       mpesa_received, debt_added, deficit, deficit_reason, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    record_date, attendant_id || null, machine_reading, cash_counted,
    mpesa_received, debt_added, deficit, deficit_reason || null, notes || null
  );

  res.status(201).json(db.prepare('SELECT * FROM daily_records WHERE id = ?').get(result.lastInsertRowid));
});

// NOTE: admin only - attendants can create records but not edit/delete them.
router.put('/:id', requireAdmin, (req, res) => {
  const existing = db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Daily record not found' });

  const merged = { ...existing, ...req.body };
  const deficit = calcDeficit(merged);

  db.prepare(`
    UPDATE daily_records SET
      record_date = ?, attendant_id = ?, machine_reading = ?,
      cash_counted = ?, mpesa_received = ?, debt_added = ?, deficit = ?,
      deficit_reason = ?, notes = ?
    WHERE id = ?
  `).run(
    merged.record_date, merged.attendant_id, merged.machine_reading,
    merged.cash_counted, merged.mpesa_received, merged.debt_added, deficit,
    merged.deficit_reason, merged.notes, req.params.id
  );

  res.json(db.prepare('SELECT * FROM daily_records WHERE id = ?').get(req.params.id));
});

router.delete('/:id', requireAdmin, (req, res) => {
  const result = db.prepare('DELETE FROM daily_records WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Daily record not found' });
  res.json({ deleted: true });
});

module.exports = router;
