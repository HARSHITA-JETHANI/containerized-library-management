const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.NODE_ENV === 'test' ? ':memory:' : path.resolve(__dirname, '../../library.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Failed to connect to SQLite database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database at', dbPath);
});

module.exports = db;
