require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const authRouter = require('./routes/auth');
const booksRouter = require('./routes/books');
const categoriesRouter = require('./routes/categories');
const authorsRouter = require('./routes/authors');
const membersRouter = require('./routes/members');
const loansRouter = require('./routes/loans');
const reservationsRouter = require('./routes/reservations');
const finesRouter = require('./routes/fines');
const dashboardRouter = require('./routes/dashboard');
const settingsRouter = require('./routes/settings');

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({status: 'ok', timestamp: new Date().toISOString()});
});

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/books', booksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/authors', authorsRouter);
app.use('/api/members', membersRouter);
app.use('/api/loans', loansRouter);
app.use('/api/reservations', reservationsRouter);
app.use('/api/fines', finesRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/users', authRouter);

const PORT = process.env.PORT || 5000;
let server;
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, () => {
    console.log(`Backend server listening on port ${PORT}`);
  });
}

module.exports = { app, server };

