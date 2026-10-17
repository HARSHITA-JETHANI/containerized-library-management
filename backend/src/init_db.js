require('dotenv').config();
const db = require('./db');
const bcrypt = require('bcrypt');

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

async function init() {
  try {
    // Users table (staff)
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','LIBRARIAN','ASSISTANT')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

    // Members table
    await run(`CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department TEXT,
      course TEXT,
      join_date DATE DEFAULT (date('now')),
      active INTEGER NOT NULL DEFAULT 1
    );`);

    // Authors table
    await run(`CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );`);

    // Categories table
    await run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );`);

    // Books table
    await run(`CREATE TABLE IF NOT EXISTS books (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      isbn TEXT UNIQUE,
      publisher TEXT,
      year INTEGER,
      total_copies INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER,
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );`);

    // Book-Authors many-to-many
    await run(`CREATE TABLE IF NOT EXISTS book_authors (
      book_id INTEGER,
      author_id INTEGER,
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (author_id) REFERENCES authors(id)
    );`);

    // Book copies table (individual physical copies)
    await run(`CREATE TABLE IF NOT EXISTS book_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      copy_number INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      UNIQUE (book_id, copy_number),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );`);

    // Loans table
    await run(`CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      copy_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      issue_date DATE NOT NULL DEFAULT (date('now')),
      due_date DATE NOT NULL,
      return_date DATE,
      renewed INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (copy_id) REFERENCES book_copies(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );`);

    // Reservations table
    await run(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      request_date DATE NOT NULL DEFAULT (date('now')),
      status TEXT NOT NULL CHECK (status IN ('PENDING','FULFILLED','CANCELLED')) DEFAULT 'PENDING',
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );`);

    // Fines table
    await run(`CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );`);

    // Settings table (key/value)
    await run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);

    // Seed default admin user (password: admin123)
    const hashed = await bcrypt.hash('admin123', 10);
    await run(`INSERT OR IGNORE INTO users (username, password, role) VALUES ('admin', '${hashed}', 'ADMIN');`);

    // Seed some settings
    const defaults = [
      ['library_name', 'College Library'],
      ['loan_duration_days', '14'],
      ['max_books_per_member', '5'],
      ['renewal_limit', '2'],
      ['fine_per_day', '0.5'],
      ['reservation_pickup_days', '3']
    ];
    for (const [k, v] of defaults) {
      await run(`INSERT OR IGNORE INTO settings (key, value) VALUES ('${k}', '${v}');`);
    }

    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Initialization error:', err);
  } finally {
    db.close();
  }
}

init();
