const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// List members (admin/librarian/assistant)
router.get('/', authenticateToken, authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'), (req, res) => {
  db.all('SELECT * FROM members', [], (err, rows) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(rows);
  });
});

// Get member details (admin/librarian/assistant)
router.get('/:id', authenticateToken, authorizeRoles('ADMIN','LIBRARIAN','ASSISTANT'), param('id').isInt(), (req, res) => {
  const id = parseInt(req.params.id, 10);
  db.get('SELECT * FROM members WHERE id = ?', [id], (err, member) => {
    if (err) return res.status(500).json({ message: err.message });
    if (!member) return res.status(404).json({ message: 'Member not found' });
    db.all(`
      SELECT l.*, b.title, bc.copy_number
      FROM loans l
      JOIN book_copies bc ON l.copy_id = bc.id
      JOIN books b ON bc.book_id = b.id
      WHERE l.member_id = ?
      ORDER BY l.issue_date DESC
    `, [id], (err2, loans) => {
      if (err2) return res.status(500).json({ message: err2.message });
      member.loans = loans || [];
      res.json(member);
    });
  });
});

// Register new member (admin/librarian)
router.post('/',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN'),
  body('member_id').isString().trim(),
  body('name').isString().trim(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('department').optional().isString(),
  body('course').optional().isString(),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { member_id, name, email, phone, department, course } = req.body;
    db.get('SELECT id FROM members WHERE LOWER(TRIM(member_id)) = LOWER(?)', [member_id.trim()], (err, memRow) => {
      if (err) return res.status(500).json({ message: err.message });
      if (memRow) return res.status(400).json({ message: 'Member ID already registered' });
      if (email && email.trim()) {
        db.get('SELECT id FROM members WHERE LOWER(TRIM(email)) = LOWER(?)', [email.trim()], (err2, emailRow) => {
          if (err2) return res.status(500).json({ message: err2.message });
          if (emailRow) return res.status(400).json({ message: 'Email address already registered' });
          db.run('INSERT INTO members (member_id, name, email, phone, department, course) VALUES (?,?,?,?,?,?)',
            [member_id.trim(), name.trim(), email.trim(), phone ? phone.trim() : null, department ? department.trim() : null, course ? course.trim() : null], function(err3) {
              if (err3) return res.status(500).json({ message: err3.message });
              res.status(201).json({ id: this.lastID, member_id, name });
            });
        });
      } else {
        db.run('INSERT INTO members (member_id, name, email, phone, department, course) VALUES (?,?,?,?,?,?)',
          [member_id.trim(), name.trim(), null, phone ? phone.trim() : null, department ? department.trim() : null, course ? course.trim() : null], function(err3) {
            if (err3) return res.status(500).json({ message: err3.message });
            res.status(201).json({ id: this.lastID, member_id, name });
          });
      }
    });
  });

// Update member (admin/librarian)
router.put('/:id',
  authenticateToken,
  authorizeRoles('ADMIN','LIBRARIAN'),
  param('id').isInt(),
  body('name').optional().isString(),
  body('email').optional().isEmail(),
  body('phone').optional().isString(),
  body('department').optional().isString(),
  body('course').optional().isString(),
  body('active').optional().isInt({min:0,max:1}),
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = parseInt(req.params.id,10);
    const fields=[]; const values=[];
    ['name','email','phone','department','course','active'].forEach(f=>{
      if(req.body[f]!==undefined){fields.push(`${f} = ?`); values.push(req.body[f]);}
    });
    if(fields.length===0) return res.status(400).json({message:'No fields to update'});
    const sql = `UPDATE members SET ${fields.join(', ')} WHERE id = ?`;
    values.push(id);
    db.run(sql, values, function(err){
      if(err) return res.status(500).json({message: err.message});
      res.json({message:'Member updated'});
    });
  });

// Deactivate member (admin)
router.delete('/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  param('id').isInt(),
  (req,res)=>{
    const id = parseInt(req.params.id,10);
    db.run('UPDATE members SET active = 0 WHERE id = ?', [id], function(err){
      if(err) return res.status(500).json({message: err.message});
      res.json({message:'Member deactivated'});
    });
  });

module.exports = router;
