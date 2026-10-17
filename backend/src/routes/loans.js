const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper to compute due date based on settings
function getDueDate(callback) {
  db.get('SELECT value FROM settings WHERE key = ?', ['loan_duration_days'], (err, row) => {
    const days = err || !row ? 14 : parseInt(row.value, 10);
    const due = new Date();
    due.setDate(due.getDate() + days);
    callback(due.toISOString().split('T')[0]); // YYYY-MM-DD
  });
}

// Issue a book copy to a member
router.post('/issue',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  body('copy_id').isInt(),
  body('member_id').isInt(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { copy_id, member_id } = req.body;
    // Check copy availability
    db.get('SELECT available FROM book_copies WHERE id = ?', [copy_id], (err, copy) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!copy) return res.status(404).json({ message: 'Copy not found' });
      if (copy.available === 0) return res.status(400).json({ message: 'Copy not available' });
      // Check member borrowing limit
      db.get('SELECT value FROM settings WHERE key = ?', ['max_books_per_member'], (err2, row) => {
        const limit = err2 || !row ? 5 : parseInt(row.value, 10);
        db.get('SELECT COUNT(*) AS cnt FROM loans WHERE member_id = ? AND return_date IS NULL', [member_id], (err3, cntRow) => {
          if (err3) return res.status(500).json({ message: err3.message });
          if (cntRow.cnt >= limit) return res.status(400).json({ message: 'Member reached borrowing limit' });
          // Issue loan
          getDueDate((dueDate) => {
            db.run('INSERT INTO loans (copy_id, member_id, due_date) VALUES (?,?,?)', [copy_id, member_id, dueDate], function (err4) {
              if (err4) return res.status(500).json({ message: err4.message });
              // Mark copy unavailable
              db.run('UPDATE book_copies SET available = 0 WHERE id = ?', [copy_id]);
              res.status(201).json({ loan_id: this.lastID, due_date: dueDate });
            });
          });
        });
      });
    });
  });

// Return a book copy
router.post('/return',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  body('loan_id').isInt(),
  (req, res) => {
    const { loan_id } = req.body;
    db.get('SELECT * FROM loans WHERE id = ?', [loan_id], (err, loan) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!loan) return res.status(404).json({ message: 'Loan not found' });
      if (loan.return_date) return res.status(400).json({ message: 'Already returned' });
      const today = new Date().toISOString().split('T')[0];
      db.run('UPDATE loans SET return_date = ?, renewed = renewed WHERE id = ?', [today, loan_id], function (err2) {
        if (err2) return res.status(500).json({ message: err2.message });
        // Mark copy available again
        db.run('UPDATE book_copies SET available = 1 WHERE id = ?', [loan.copy_id]);
        // Check overdue fine
        db.get('SELECT value FROM settings WHERE key = ?', ['fine_per_day'], (err3, row) => {
          const fineRate = err3 || !row ? 0.5 : parseFloat(row.value);
          const due = new Date(loan.due_date);
          const ret = new Date(today);
          const diffDays = Math.floor((ret - due) / (1000 * 60 * 60 * 24));
          if (diffDays > 0) {
            const amount = diffDays * fineRate;
            db.run('INSERT INTO fines (loan_id, amount) VALUES (?,?)', [loan_id, amount]);
          }
          res.json({ message: 'Book returned', overdue_days: diffDays > 0 ? diffDays : 0 });
        });
      });
    });
  });

// Renew a loan (if within limit)
router.post('/renew',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  body('loan_id').isInt(),
  (req, res) => {
    const { loan_id } = req.body;
    db.get('SELECT * FROM loans WHERE id = ?', [loan_id], (err, loan) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!loan) return res.status(404).json({ message: 'Loan not found' });
      if (loan.return_date) return res.status(400).json({ message: 'Already returned' });
      // Check renewal limit
      db.get('SELECT value FROM settings WHERE key = ?', ['renewal_limit'], (err2, row) => {
        const limit = err2 || !row ? 2 : parseInt(row.value, 10);
        if (loan.renewed >= limit) return res.status(400).json({ message: 'Renewal limit reached' });
        getDueDate((newDue) => {
          db.run('UPDATE loans SET due_date = ?, renewed = renewed + 1 WHERE id = ?', [newDue, loan_id], function (err3) {
            if (err3) return res.status(500).json({ message: err3.message });
            res.json({ message: 'Renewed', new_due_date: newDue });
          });
        });
      });
    });
  });

// List active loans
router.get('/active', authenticateToken, (req, res) => {
  const sql = `SELECT l.*, m.name AS member_name, b.title AS book_title, bc.copy_number
    FROM loans l
    JOIN members m ON l.member_id = m.id
    JOIN book_copies bc ON l.copy_id = bc.id
    JOIN books b ON bc.book_id = b.id
    WHERE l.return_date IS NULL
    ORDER BY l.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

// List all loans (history + active)
router.get('/', authenticateToken, (req, res) => {
  const sql = `SELECT l.*, m.name AS member_name, m.member_id AS member_code, b.title AS book_title, bc.copy_number
    FROM loans l
    JOIN members m ON l.member_id = m.id
    JOIN book_copies bc ON l.copy_id = bc.id
    JOIN books b ON bc.book_id = b.id
    ORDER BY l.id DESC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

// List available copies for issuing
router.get('/available-copies', authenticateToken, (req, res) => {
  const sql = `SELECT bc.id, bc.copy_number, bc.book_id, b.title AS book_title, b.isbn
    FROM book_copies bc
    JOIN books b ON bc.book_id = b.id
    WHERE bc.available = 1
    ORDER BY b.title ASC, bc.copy_number ASC`;
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

module.exports = router;
