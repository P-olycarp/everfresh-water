require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRoutes = require('./routes/auth');
const { authenticate } = require('./middleware/auth');

const app = express();
const NODE_ENV = process.env.NODE_ENV || 'development';

// CORS
const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'https://everfresh-water.vercel.app'];

app.use(cors({
  origin: NODE_ENV === 'production' ? corsOrigins : '*',
  credentials: true
}));

app.use(express.json());

// Health Check
app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;
    res.json({
      success: true,
      status: 'ok',
      message: 'Everfresh Water backend is running',
      users_in_db: userCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

// Auth Routes
app.use('/api/auth', authRoutes);

// Protected Routes
app.use('/api/daily-records', authenticate, require('./routes/dailyRecords'));
app.use('/api/mpesa-agent', authenticate, require('./routes/mpesaAgent'));
app.use('/api/water-purchases', authenticate, require('./routes/waterPurchases'));
app.use('/api/bottles', authenticate, require('./routes/bottles'));
app.use('/api/expenses', authenticate, require('./routes/expenses'));
app.use('/api/debts', authenticate, require('./routes/debts'));
app.use('/api/reports', authenticate, require('./routes/reports'));
app.use('/api/batches', authenticate, require('./routes/batches'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Export for Vercel
module.exports = app;
