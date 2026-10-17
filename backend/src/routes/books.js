const express = require('express');
const router = express.Router();
const db = require('../db');
const { body, param, query, validationResult } = require('express-validator');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// Helper to fetch book with authors and category
function getBookDetails(id, callback) {
  const sql = `SELECT b.*, c.name AS category_name FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE b.id = ?`;
  db.get(sql, [id], (err, book) => {
    if (err) return callback(err);
    if (!book) return callback(null, null);
    db.all('SELECT a.id, a.name FROM authors a INNER JOIN book_authors ba ON a.id = ba.author_id WHERE ba.book_id = ?', [id], (err2, authors) => {
      if (err2) return callback(err2);
      book.authors = authors;
      callback(null, book);
    });
  });
}

// Create a new book (admin/librarian)
router.post('/',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  body('title').isString().trim(),
  body('isbn').optional().isISBN(),
  body('publisher').optional().isString(),
  body('year').optional().isInt({ min: 1000, max: 2100 }),
  body('total_copies').isInt({ min: 1 }),
  body('category_id').optional().isInt(),
  body('author_ids').isArray({ min: 1 }),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { title, isbn, publisher, year, total_copies, category_id, author_ids } = req.body;
    db.run(`INSERT INTO books (title, isbn, publisher, year, total_copies, category_id) VALUES (?,?,?,?,?,?)`,
      [title, isbn, publisher, year, total_copies, category_id], function (err) {
        if (err) return res.status(500).json({ message: err.message });
        const bookId = this.lastID;
        // Insert authors link
        const stmt = db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?,?)');
        author_ids.forEach(aid => stmt.run(bookId, aid));
        stmt.finalize();
        // Create physical copies
        const copyStmt = db.prepare('INSERT INTO book_copies (book_id, copy_number, available) VALUES (?,?,1)');
        for (let i = 1; i <= total_copies; i++) {
          copyStmt.run(bookId, i);
        }
        copyStmt.finalize();
        res.status(201).json({ id: bookId, title, isbn, total_copies });
      });
  });

// Get list of books with optional search & pagination
router.get('/',
  authenticateToken,
  query('search').optional().isString(),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  (req, res) => {
    const { search = '', page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const like = `%${search}%`;
    const sql = `SELECT b.*, c.name AS category_name FROM books b LEFT JOIN categories c ON b.category_id = c.id WHERE b.title LIKE ? OR b.isbn LIKE ? LIMIT ? OFFSET ?`;
    db.all(sql, [like, like, limit, offset], (err, rows) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json(rows);
    });
  });

// Get single book details
router.get('/:id',
  authenticateToken,
  param('id').isInt(),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    getBookDetails(id, (err, book) => {
      if (err) return res.status(500).json({ message: err.message });
      if (!book) return res.status(404).json({ message: 'Book not found' });
      // Also fetch copy availability counts
      db.get('SELECT COUNT(*) AS total, SUM(available) AS available FROM book_copies WHERE book_id = ?', [id], (err2, stats) => {
        if (err2) return res.status(500).json({ message: err2.message });
        book.total_copies = stats.total;
        book.available_copies = stats.available;
        res.json(book);
      });
    });
  });

// Update book (admin/librarian)
router.put('/:id',
  authenticateToken,
  authorizeRoles('ADMIN', 'LIBRARIAN'),
  param('id').isInt(),
  body('title').optional().isString().trim(),
  body('isbn').optional().isISBN(),
  body('publisher').optional().isString(),
  body('year').optional().isInt({ min: 1000, max: 2100 }),
  body('category_id').optional().isInt(),
  body('author_ids').optional().isArray(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const id = parseInt(req.params.id, 10);
    const fields = [];
    const values = [];
    ['title','isbn','publisher','year','category_id'].forEach(f => {
      if (req.body[f] !== undefined) { fields.push(`${f} = ?`); values.push(req.body[f]); }
    });
    if (fields.length === 0 && !req.body.author_ids) {
      return res.status(400).json({ message: 'No fields to update' });
    }
    const runUpdate = (cb) => {
      if (fields.length > 0) {
        const sql = `UPDATE books SET ${fields.join(', ')} WHERE id = ?`;
        values.push(id);
        db.run(sql, values, function(err) {
          if (err) return cb(err);
          cb(null);
        });
      } else {
        cb(null);
      }
    };
    runUpdate((err) => {
      if (err) return res.status(500).json({ message: err.message });
      if (req.body.author_ids) {
        // Replace author links
        db.run('DELETE FROM book_authors WHERE book_id = ?', [id], (delErr) => {
          if (delErr) return res.status(500).json({ message: delErr.message });
          const stmt = db.prepare('INSERT INTO book_authors (book_id, author_id) VALUES (?,?)');
          req.body.author_ids.forEach(aid => stmt.run(id, aid));
          stmt.finalize();
          res.json({ message: 'Book updated' });
        });
      } else {
        res.json({ message: 'Book updated' });
      }
    });
  });

// Delete (soft‑archive) a book – only admin
router.delete('/:id',
  authenticateToken,
  authorizeRoles('ADMIN'),
  param('id').isInt(),
  (req, res) => {
    const id = parseInt(req.params.id, 10);
    // Instead of hard delete, we could add a flag; for simplicity hard delete if no active copies/loans
    db.get('SELECT COUNT(*) AS active FROM loans WHERE copy_id IN (SELECT id FROM book_copies WHERE book_id = ?) AND return_date IS NULL', [id], (err, row) => {
      if (err) return res.status(500).json({ message: err.message });
      if (row.active > 0) return res.status(400).json({ message: 'Cannot delete book with active loans' });
      db.run('DELETE FROM books WHERE id = ?', [id], function(err2) {
        if (err2) return res.status(500).json({ message: err2.message });
        res.json({ message: 'Book deleted' });
      });
    });
  });

module.exports = router;
