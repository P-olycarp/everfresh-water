-- Everfresh Water - Database Schema
-- SQLite. Run automatically on server start (see db/index.js).

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('attendant', 'admin')),
  pin_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The daily reconciliation for WATER sales: machine reading vs cash vs
-- Pochi la Biashara (M-Pesa) vs debts.
CREATE TABLE IF NOT EXISTS daily_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date TEXT NOT NULL,
  attendant_id INTEGER REFERENCES users(id),
  machine_reading REAL NOT NULL,
  cash_counted REAL NOT NULL,
  mpesa_received REAL NOT NULL DEFAULT 0,
  debt_added REAL NOT NULL DEFAULT 0,
  deficit REAL NOT NULL,
  deficit_reason TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- The M-Pesa AGENT line: a separate business (cash-in/cash-out for the
-- public), distinct from water sales.
CREATE TABLE IF NOT EXISTS mpesa_agent_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_date TEXT NOT NULL,
  attendant_id INTEGER REFERENCES users(id),
  opening_float REAL NOT NULL DEFAULT 0,
  float_topup REAL NOT NULL DEFAULT 0,
  closing_float REAL NOT NULL,
  opening_cash REAL NOT NULL DEFAULT 0,
  closing_cash REAL NOT NULL,
  debt_added REAL NOT NULL DEFAULT 0,
  commission_earned REAL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Capital put into buying water (cost of goods for the vending side)
CREATE TABLE IF NOT EXISTS water_purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_date TEXT NOT NULL,
  liters REAL,
  cost REAL NOT NULL,
  supplier TEXT,
  paid_from TEXT NOT NULL DEFAULT 'cash' CHECK (paid_from IN ('cash', 'mpesa')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Bottled water: a separate product line from the vending machine
CREATE TABLE IF NOT EXISTS bottle_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  txn_date TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('restock', 'sale')),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  paid_from TEXT NOT NULL DEFAULT 'cash' CHECK (paid_from IN ('cash', 'mpesa', 'debt', 'n_a')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Daily or monthly running costs
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  expense_date TEXT NOT NULL,
  category TEXT NOT NULL,
  amount REAL NOT NULL,
  frequency TEXT NOT NULL DEFAULT 'daily' CHECK (frequency IN ('daily', 'monthly', 'one_off')),
  paid_from TEXT NOT NULL DEFAULT 'cash' CHECK (paid_from IN ('cash', 'mpesa')),
  business_line TEXT NOT NULL DEFAULT 'water' CHECK (business_line IN ('water', 'mpesa_agent', 'shared')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Customer debts
CREATE TABLE IF NOT EXISTS debts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  debt_date TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  amount REAL NOT NULL,
  source TEXT NOT NULL DEFAULT 'water' CHECK (source IN ('water', 'bottle', 'mpesa_agent')),
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'paid')),
  paid_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_daily_records_date ON daily_records(record_date);
CREATE INDEX IF NOT EXISTS idx_mpesa_agent_records_date ON mpesa_agent_records(record_date);
CREATE INDEX IF NOT EXISTS idx_water_purchases_date ON water_purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_bottle_txn_date ON bottle_transactions(txn_date);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_debts_date ON debts(debt_date);
CREATE INDEX IF NOT EXISTS idx_debts_status ON debts(status);
