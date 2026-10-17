const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

router.get('/', authenticateToken, authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'), (req, res) => {
  const result = {};
  db.get('SELECT COUNT(*) AS total FROM books', [], (err, row) => {
    if (err) return res.status(500).json({ message: err.message });
    result.total_books = (row && row.total) ? row.total : 0;
    db.get('SELECT COUNT(*) AS available FROM book_copies WHERE available = 1', [], (err2, row2) => {
      if (err2) return res.status(500).json({ message: err2.message });
      result.available_copies = (row2 && row2.available) ? row2.available : 0;
      db.get('SELECT COUNT(*) AS issued FROM loans WHERE return_date IS NULL', [], (err3, row3) => {
        if (err3) return res.status(500).json({ message: err3.message });
        result.issued_books = (row3 && row3.issued) ? row3.issued : 0;
        db.get('SELECT COUNT(*) AS members FROM members WHERE active = 1', [], (err4, row4) => {
          if (err4) return res.status(500).json({ message: err4.message });
          result.active_members = (row4 && row4.members) ? row4.members : 0;
          db.get("SELECT COUNT(*) AS overdue FROM loans WHERE return_date IS NULL AND due_date < date('now')", [], (err5, row5) => {
            if (err5) return res.status(500).json({ message: err5.message });
            result.overdue_loans = (row5 && row5.overdue) ? row5.overdue : 0;
            db.get("SELECT COUNT(*) AS pending FROM reservations WHERE status = 'PENDING'", [], (err6, row6) => {
              if (err6) return res.status(500).json({ message: err6.message });
              result.pending_reservations = (row6 && row6.pending) ? row6.pending : 0;
              db.get('SELECT COALESCE(SUM(amount - paid), 0) AS outstanding FROM fines WHERE (amount - paid) > 0', [], (err7, row7) => {
                if (err7) return res.status(500).json({ message: err7.message });
                result.outstanding_fines = (row7 && row7.outstanding) ? row7.outstanding : 0;
                res.json(result);
              });
            });
          });
        });
      });
    });
  });
});

// Analytics / reports endpoint
router.get('/reports', authenticateToken, authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'), (req, res) => {
  const reports = {};
  db.all(`SELECT c.name, COUNT(b.id) AS book_count, COALESCE(SUM(b.total_copies), 0) AS copy_count
    FROM categories c
    LEFT JOIN books b ON c.id = b.category_id
    GROUP BY c.id`, [], (err1, categories) => {
    if (err1) return res.status(500).json({ message: err1.message });
    reports.categories = categories || [];

    db.all(`SELECT b.title, COUNT(l.id) AS issue_count
      FROM books b
      JOIN book_copies bc ON b.id = bc.book_id
      JOIN loans l ON bc.id = l.copy_id
      GROUP BY b.id
      ORDER BY issue_count DESC
      LIMIT 5`, [], (err2, popularBooks) => {
      if (err2) return res.status(500).json({ message: err2.message });
      reports.popular_books = popularBooks || [];

      db.all(`SELECT
        COUNT(CASE WHEN return_date IS NULL AND due_date >= date('now') THEN 1 END) AS active_loans,
        COUNT(CASE WHEN return_date IS NULL AND due_date < date('now') THEN 1 END) AS overdue_loans,
        COUNT(CASE WHEN return_date IS NOT NULL THEN 1 END) AS returned_loans
        FROM loans`, [], (err3, circulation) => {
        if (err3) return res.status(500).json({ message: err3.message });
        reports.circulation = circulation[0] || {};

        db.get(`SELECT COUNT(*) AS total_fines, COALESCE(SUM(amount),0) AS total_assessed, COALESCE(SUM(paid),0) AS total_collected, COALESCE(SUM(amount - paid),0) AS total_outstanding FROM fines`, [], (err4, finesSummary) => {
          if (err4) return res.status(500).json({ message: err4.message });
          reports.fines = finesSummary || {};
          res.json(reports);
        });
      });
    });
  });
});

module.exports = router;
