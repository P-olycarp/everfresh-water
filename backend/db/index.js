const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { DatabaseSync } = require('node:sqlite');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'everfresh.db');
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
db.exec(schema);

// Run migrations
function runMigrations() {
  // Check if batches table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='batches'").get();
  
  if (!tables) {
    console.log('Running migrations...');
    
    // Create batches table
    db.exec(`
      CREATE TABLE IF NOT EXISTS batches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        batch_number TEXT NOT NULL UNIQUE,
        start_date TEXT NOT NULL,
        end_date TEXT,
        opening_float REAL NOT NULL DEFAULT 0,
        opening_cash REAL NOT NULL DEFAULT 0,
        total_water_cost REAL NOT NULL DEFAULT 0,
        total_revenue REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);
    
    // Add batch_id columns
    try {
      db.exec('ALTER TABLE mpesa_agent_records ADD COLUMN batch_id INTEGER REFERENCES batches(id)');
    } catch (e) {}
    try {
      db.exec('ALTER TABLE daily_records ADD COLUMN batch_id INTEGER REFERENCES batches(id)');
    } catch (e) {}
    try {
      db.exec('ALTER TABLE debts ADD COLUMN batch_id INTEGER REFERENCES batches(id)');
    } catch (e) {}
    try {
      db.exec('ALTER TABLE expenses ADD COLUMN batch_id INTEGER REFERENCES batches(id)');
    } catch (e) {}
    
    // Create default batch if none exists
    const batchCount = db.prepare('SELECT COUNT(*) AS count FROM batches').get().count;
    if (batchCount === 0) {
      const batchNumber = `BATCH-${new Date().toISOString().slice(0, 10)}-001`;
      db.prepare(`
        INSERT INTO batches (batch_number, start_date, opening_float, opening_cash)
        VALUES (?, ?, ?, ?)
      `).run(batchNumber, new Date().toISOString().slice(0, 10), 0, 0);
      console.log('Default batch created:', batchNumber);
    }
    
    console.log('Migrations completed!');
  }
}

runMigrations();

const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

if (userCount === 0) {
  console.log('Creating default users...');

  const insertUser = db.prepare(`
    INSERT INTO users (name, role, pin_hash)
    VALUES (?, ?, ?)
  `);

  const adminHash = bcrypt.hashSync('2580', 10);
  const attendantHash = bcrypt.hashSync('1234', 10);

  insertUser.run('Owner', 'admin', adminHash);
  insertUser.run('Attendant', 'attendant', attendantHash);

  console.log('--------------------------------');
  console.log('Default accounts created');
  console.log('Admin PIN: 2580');
  console.log('Attendant PIN: 1234');
  console.log('--------------------------------');
}

module.exports = db;
