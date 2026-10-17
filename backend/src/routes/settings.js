const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Get all settings (admin only)
router.get('/', authenticateToken, authorizeRoles('ADMIN'), (req, res) => {
  db.all('SELECT * FROM settings', [], (err, rows) => {
    if (err) return res.status(500).json({message: err.message});
    res.json(rows);
  });
});

// Update a setting (admin)
router.put('/:key',
  authenticateToken,
  authorizeRoles('ADMIN'),
  param('key').isString(),
  body('value').isString(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()});
    const key = req.params.key;
    const {value} = req.body;
    db.run('INSERT INTO settings (key, value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [key, value], function(err){
      if (err) return res.status(500).json({message: err.message});
      res.json({message: 'Setting saved', key, value});
    });
  });

module.exports = router;
