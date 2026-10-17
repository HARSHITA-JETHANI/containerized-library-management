const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Login endpoint
router.post('/login',
  body('username').isString().trim(),
  body('password').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
      if (err) return res.status(500).json({ message: 'Database error' });
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(401).json({ message: 'Invalid credentials' });
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });
      res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    });
  }
);

// Register new staff (admin only)
router.post('/register',
  body('username').isString().trim(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['ADMIN','LIBRARIAN','ASSISTANT']),
  async (req, res) => {
    // Auth required
    const auth = require('../middleware/auth');
    auth.authenticateToken(req, res, async () => {
      auth.authorizeRoles('ADMIN')(req, res, async () => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { username, password, role } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password, role) VALUES (?,?,?)', [username, hashed, role], function(err) {
          if (err) return res.status(500).json({ message: err.message });
          res.status(201).json({ id: this.lastID, username, role });
        });
      });
    });
  }
);

const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// List staff users (admin only)
router.get('/users',
  authenticateToken,
  authorizeRoles('ADMIN'),
  (req, res) => {
    db.all('SELECT id, username, role, active, created_at FROM users ORDER BY id ASC', [], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    });
  }
);

// Toggle deactivate user (admin only)
router.delete('/users/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (req.user && req.user.id === id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }
    db.run('UPDATE users SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'User status updated' });
    });
  }
);

module.exports = router;
