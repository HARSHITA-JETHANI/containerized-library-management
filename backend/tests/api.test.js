const request = require('supertest');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_jest_suite';

const db = require('../src/db');
const { app } = require('../src/server');

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

describe('Backend API Integration Tests', () => {
  let adminToken;
  let librarianToken;

  beforeAll(async () => {
    // Initialize in-memory test database tables
    await run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('ADMIN','LIBRARIAN','ASSISTANT')),
      active INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );`);

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

    await run(`CREATE TABLE IF NOT EXISTS authors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );`);

    await run(`CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );`);

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

    await run(`CREATE TABLE IF NOT EXISTS book_authors (
      book_id INTEGER,
      author_id INTEGER,
      PRIMARY KEY (book_id, author_id),
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (author_id) REFERENCES authors(id)
    );`);

    await run(`CREATE TABLE IF NOT EXISTS book_copies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      copy_number INTEGER NOT NULL,
      available INTEGER NOT NULL DEFAULT 1,
      UNIQUE (book_id, copy_number),
      FOREIGN KEY (book_id) REFERENCES books(id)
    );`);

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

    await run(`CREATE TABLE IF NOT EXISTS reservations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      book_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      request_date DATE NOT NULL DEFAULT (date('now')),
      status TEXT NOT NULL CHECK (status IN ('PENDING','FULFILLED','CANCELLED')) DEFAULT 'PENDING',
      FOREIGN KEY (book_id) REFERENCES books(id),
      FOREIGN KEY (member_id) REFERENCES members(id)
    );`);

    await run(`CREATE TABLE IF NOT EXISTS fines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      paid INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (loan_id) REFERENCES loans(id)
    );`);

    await run(`CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );`);

    // Seed test admin user
    const hashed = await bcrypt.hash('admin123', 6);
    await run(`INSERT INTO users (username, password, role) VALUES ('admin', '${hashed}', 'ADMIN');`);

    // Generate tokens
    adminToken = jwt.sign({ id: 1, username: 'admin', role: 'ADMIN' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    librarianToken = jwt.sign({ id: 2, username: 'lib', role: 'LIBRARIAN' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  });

  afterAll((done) => {
    db.close(done);
  });

  describe('GET /api/health', () => {
    it('returns 200 and status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('POST /api/auth/login', () => {
    it('successfully logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'admin123' });
      expect(res.status).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.username).toBe('admin');
      expect(res.body.user.role).toBe('ADMIN');
    });

    it('rejects invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'wrongpassword' });
      expect(res.status).toBe(401);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });

  describe('Categories API', () => {
    let catId;

    it('creates a new category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Computer Science' });
      expect(res.status).toBe(201);
      expect(res.body.name).toBe('Computer Science');
      catId = res.body.id;
    });

    it('lists categories including newly created', async () => {
      const res = await request(app)
        .get('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(c => c.name === 'Computer Science')).toBe(true);
    });

    it('prevents creating duplicate category', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Computer Science' });
      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Category already exists');
    });

    it('updates category name', async () => {
      const res = await request(app)
        .put(`/api/categories/${catId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Information Technology' });
      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Category updated');
    });
  });

  describe('Members API', () => {
    let memberDbId;

    it('registers a new member', async () => {
      const res = await request(app)
        .post('/api/members')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          member_id: 'MEM-CI-001',
          name: 'Priya Sharma',
          email: 'priya.ci@example.com',
          department: 'Computer Science',
          course: 'B.Tech'
        });
      expect(res.status).toBe(201);
      expect(res.body.member_id).toBe('MEM-CI-001');
      memberDbId = res.body.id;
    });

    it('retrieves member details by id', async () => {
      const res = await request(app)
        .get(`/api/members/${memberDbId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe('Priya Sharma');
      expect(Array.isArray(res.body.loans)).toBe(true);
    });

    it('lists all members', async () => {
      const res = await request(app)
        .get('/api/members')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some(m => m.member_id === 'MEM-CI-001')).toBe(true);
    });
  });

  describe('Authors API', () => {
    it('creates and lists authors', async () => {
      const createRes = await request(app)
        .post('/api/authors')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Robert C. Martin' });
      expect(createRes.status).toBe(201);
      expect(createRes.body.name).toBe('Robert C. Martin');

      const listRes = await request(app)
        .get('/api/authors')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(listRes.status).toBe(200);
      expect(Array.isArray(listRes.body)).toBe(true);
      expect(listRes.body.some(a => a.name === 'Robert C. Martin')).toBe(true);
    });
  });
});
