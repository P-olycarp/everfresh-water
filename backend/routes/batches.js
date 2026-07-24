const express = require('express');
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Get current active batch
router.get('/active', (req, res) => {
  try {
    let batch = db.prepare(
      'SELECT * FROM batches WHERE status = "active" ORDER BY id DESC LIMIT 1'
    ).get();
    
    if (!batch) {
      // Create default batch if none exists
      const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10)}-001`;
      const stmt = db.prepare(`
        INSERT INTO batches (batch_number, start_date, opening_float, opening_cash)
        VALUES (?, ?, ?, ?)
      `);
      const result = stmt.run(batchNumber, new Date().toISOString().slice(0, 10), 0, 0);
      batch = db.prepare('SELECT * FROM batches WHERE id = ?').get(result.lastInsertRowid);
    }
    
    res.json(batch);
  } catch (err) {
    console.error('Error getting active batch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Start new batch
router.post('/start', requireAdmin, (req, res) => {
  try {
    const { opening_float = 0, opening_cash = 0, water_cost = 0 } = req.body;
    
    // Close current active batch
    db.prepare(`
      UPDATE batches SET end_date = ?, status = 'closed'
      WHERE status = 'active'
    `).run(new Date().toISOString().slice(0, 10));
    
    // Create new batch
    const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10)}-${Date.now().toString().slice(-4)}`;
    const stmt = db.prepare(`
      INSERT INTO batches (batch_number, start_date, opening_float, opening_cash, total_water_cost)
      VALUES (?, ?, ?, ?, ?)
    `);
    const result = stmt.run(batchNumber, new Date().toISOString().slice(0, 10), opening_float, opening_cash, water_cost);
    
    const newBatch = db.prepare('SELECT * FROM batches WHERE id = ?').get(result.lastInsertRowid);
    res.json(newBatch);
  } catch (err) {
    console.error('Error starting new batch:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all batches
router.get('/', (req, res) => {
  try {
    const batches = db.prepare(
      'SELECT * FROM batches ORDER BY id DESC'
    ).all();
    res.json(batches);
  } catch (err) {
    console.error('Error getting batches:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
