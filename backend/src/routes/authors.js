const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// List authors
router.get('/', authenticateToken, (req, res) => {
  db.all('SELECT * FROM authors', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

// Get author by id
router.get('/:id', authenticateToken, param('id').isInt(), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM authors WHERE id = ?', [id], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!row) return res.status(404).json({ message: 'Author not found' });
    res.json(row);
  });
});

// Create author (admin/librarian)
router.post('/',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  body('name').isString().trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const name = req.body.name.trim();
    db.get('SELECT id FROM authors WHERE LOWER(TRIM(name)) = LOWER(?)', [name], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (row) return res.status(400).json({ message: 'Author already exists' });
      db.run('INSERT INTO authors (name) VALUES (?)', [name], function(err2) {
        if (err2) return res.status(500).json({ message: err2.message });
        res.status(201).json({ id: this.lastID, name });
      });
    });
  });

// Update author
router.put('/:id',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  param('id').isInt(),
  body('name').isString().trim().notEmpty(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = parseInt(req.params.id, 10);
    const name = req.body.name.trim();
    db.get('SELECT id FROM authors WHERE LOWER(TRIM(name)) = LOWER(?) AND id != ?', [name, id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (row) return res.status(400).json({ message: 'Author with this name already exists' });
      db.run('UPDATE authors SET name = ? WHERE id = ?', [name, id], function(err2) {
        if (err2) return res.status(500).json({ message: err2.message });
        res.json({ message: 'Author updated' });
      });
    });
  });

// Delete author (prevent if linked)
router.delete('/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  param('id').isInt(),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.get('SELECT COUNT(*) AS cnt FROM book_authors WHERE author_id = ?', [id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (row.cnt > 0) return res.status(400).json({ message: 'Author linked to books' });
      db.run('DELETE FROM authors WHERE id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ message: err2.message });
        res.json({ message: 'Author deleted' });
      });
    });
  });

module.exports = router;
