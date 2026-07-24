require('dotenv').config();

const express = require('express');
const cors = require('cors');

const db = require('./db');

const authRoutes = require('./routes/auth');

const { authenticate } = require('./middleware/auth');

const app = express();

const PORT = process.env.PORT || 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

/* -------------------------------------------------- */
/* CORS Configuration */
/* -------------------------------------------------- */

const corsOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: NODE_ENV === 'production' ? corsOrigins : '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json());

/* -------------------------------------------------- */
/* Request Logging (for production) */
/* -------------------------------------------------- */

if (NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  });
}

/* -------------------------------------------------- */
/* Public Routes */
/* -------------------------------------------------- */

app.get('/api/health', (req, res) => {
  try {
    const userCount = db.prepare(
      'SELECT COUNT(*) AS count FROM users'
    ).get().count;

    res.json({
      success: true,
      status: 'ok',
      message: 'Everfresh Water backend is running',
      environment: NODE_ENV,
      users_in_db: userCount
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.use('/api/auth', authRoutes);

/* -------------------------------------------------- */
/* Protected Routes - Require Authentication */
/* -------------------------------------------------- */

app.use('/api/daily-records', authenticate, require('./routes/dailyRecords'));
app.use('/api/mpesa-agent', authenticate, require('./routes/mpesaAgent'));
app.use('/api/water-purchases', authenticate, require('./routes/waterPurchases'));
app.use('/api/bottles', authenticate, require('./routes/bottles'));
app.use('/api/expenses', authenticate, require('./routes/expenses'));
app.use('/api/debts', authenticate, require('./routes/debts'));
app.use('/api/reports', authenticate, require('./routes/reports'));
app.use('/api/batches', authenticate, require('./routes/batches'));

/* -------------------------------------------------- */
/* 404 Handler */
/* -------------------------------------------------- */

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found'
  });
});

/* -------------------------------------------------- */
/* Error Handler */
/* -------------------------------------------------- */

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

/* -------------------------------------------------- */
/* Start Server */
/* -------------------------------------------------- */

app.listen(PORT, () => {
  console.log('====================================');
  console.log(' Everfresh Water Backend');
  console.log('====================================');
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Health: http://localhost:${PORT}/api/health`);
  console.log(`Login: POST http://localhost:${PORT}/api/auth/login`);
  console.log('====================================');
});
