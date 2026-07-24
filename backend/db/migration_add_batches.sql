-- Add batches table
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
);

-- Add batch_id to mpesa_agent_records
ALTER TABLE mpesa_agent_records ADD COLUMN batch_id INTEGER REFERENCES batches(id);

-- Add batch_id to daily_records
ALTER TABLE daily_records ADD COLUMN batch_id INTEGER REFERENCES batches(id);

-- Add batch_id to debts
ALTER TABLE debts ADD COLUMN batch_id INTEGER REFERENCES batches(id);

-- Add batch_id to expenses
ALTER TABLE expenses ADD COLUMN batch_id INTEGER REFERENCES batches(id);
