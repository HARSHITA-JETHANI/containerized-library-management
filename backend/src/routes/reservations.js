const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Create reservation (admin/librarian/assistant)
router.post('/',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'),
  body('book_id').isInt(),
  body('member_id').isInt(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({errors: errors.array()});
    const {book_id, member_id} = req.body;
    // Prevent duplicate active reservation for same book/member
    db.get('SELECT COUNT(*) AS cnt FROM reservations WHERE book_id = ? AND member_id = ? AND status = "PENDING"', [book_id, member_id], (err, row) => {
      if (err) return res.status(500).json({message: err.message});
      if (row.cnt > 0) return res.status(400).json({message: 'Active reservation already exists for this book and member'});
      db.run('INSERT INTO reservations (book_id, member_id) VALUES (?,?)', [book_id, member_id], function(err2){
        if (err2) return res.status(500).json({message: err2.message});
        res.status(201).json({id: this.lastID, book_id, member_id, status: 'PENDING'});
      });
    });
  });

// List reservations (filter by status)
router.get('/', authenticateToken, (req, res) => {
  const status = req.query.status;
  let sql = `SELECT r.*, b.title AS book_title, m.name AS member_name, m.member_id AS member_code,
    ROW_NUMBER() OVER (PARTITION BY r.book_id, r.status ORDER BY r.id ASC) AS queue_position
    FROM reservations r
    JOIN books b ON r.book_id = b.id
    JOIN members m ON r.member_id = m.id`;
  const params = [];
  if (status) {
    sql += ' WHERE r.status = ?';
    params.push(status);
  }
  sql += ' ORDER BY r.id DESC';
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({message: err.message});
    res.json(rows);
  });
});

// Fulfill reservation (admin/librarian)
router.put('/:id/fulfill',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN'),
  param('id').isInt(),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    db.run('UPDATE reservations SET status = "FULFILLED" WHERE id = ?', [id], function(err) {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Reservation fulfilled' });
    });
  });

// Cancel reservation (admin/librarian)
router.delete('/:id',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN'),
  param('id').isInt(),
  (req, res) => {
    const id = parseInt(req.params.id,10);
    db.run('UPDATE reservations SET status = "CANCELLED" WHERE id = ?', [id], function(err){
      if (err) return res.status(500).json({message: err.message});
      res.json({message: 'Reservation cancelled'});
    });
  });

module.exports = router;
