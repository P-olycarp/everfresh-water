const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'everfresh-secret';

router.post('/login', (req, res) => {
  try {
    const { pin } = req.body;
    
    if (!pin) {
      return res.status(400).json({ error: 'PIN is required' });
    }

    const users = db.prepare('SELECT * FROM users WHERE active = 1').all();
    console.log('Users found:', users.length);
    
    const matched = users.find((u) => {
      console.log('Checking user:', u.name, 'pin_hash:', u.pin_hash ? 'exists' : 'missing');
      return bcrypt.compareSync(String(pin), u.pin_hash);
    });

    if (!matched) {
      return res.status(401).json({ error: 'Invalid PIN' });
    }

    const token = jwt.sign(
      { id: matched.id, name: matched.name, role: matched.role },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: matched.id,
        name: matched.name,
        role: matched.role,
      },
    });
  } catch (err) {
    console.error('LOGIN ERROR:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
