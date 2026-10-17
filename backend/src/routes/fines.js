const express = require('express');
const router = express.Router();
const db = require('../db');
const { param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// List all fines (admin/librarian/assistant)
router.get('/',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'),
  (req, res) => {
    const sql = `SELECT f.*, (f.amount - f.paid) AS outstanding,
      m.id AS member_id, m.name AS member_name, m.member_id AS member_code,
      b.title AS book_title, l.due_date, l.return_date
      FROM fines f
      JOIN loans l ON f.loan_id = l.id
      JOIN members m ON l.member_id = m.id
      JOIN book_copies bc ON l.copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      ORDER BY f.id DESC`;
    db.all(sql, [], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    });
  }
);

// Get fines for a member (admin/librarian/assistant)
router.get('/member/:memberId',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'),
  param('memberId').isInt(),
  (req, res) => {
    const memberId = parseInt(req.params.memberId,10);
    const sql = `SELECT f.*, l.due_date, l.return_date FROM fines f JOIN loans l ON f.loan_id = l.id WHERE l.member_id = ?`;
    db.all(sql, [memberId], (err, rows) => {
      if (err) return res.status(500).json({message: err.message});
      res.json(rows);
    });
  }
);

// Pay a fine (partial or full)
router.post('/pay/:fineId',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN'),
  param('fineId').isInt(),
  (req, res) => {
    const fineId = parseInt(req.params.fineId,10);
    const { amount } = req.body; // amount to pay
    if (amount === undefined) return res.status(400).json({message:'Amount required'});
    db.get('SELECT amount, paid FROM fines WHERE id = ?', [fineId], (err, fine) => {
      if (err) return res.status(500).json({message: err.message});
      if (!fine) return res.status(404).json({message:'Fine not found'});
      const newPaid = fine.paid + amount;
      if (newPaid > fine.amount) return res.status(400).json({message:'Payment exceeds outstanding amount'});
      db.run('UPDATE fines SET paid = ? WHERE id = ?', [newPaid, fineId], function(err2){
        if (err2) return res.status(500).json({message: err2.message});
        res.json({message:'Payment recorded', fineId, paid: newPaid, outstanding: fine.amount - newPaid});
      });
    });
  }
);

module.exports = router;
