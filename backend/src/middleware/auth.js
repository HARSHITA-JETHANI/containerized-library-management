const jwt = require('jsonwebtoken');
const db = require('../db');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({message: 'Missing token'});
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({message: 'Invalid token'});
    req.user = user; // {id, username, role}
    next();
  });
}

function authorizeRoles(...allowed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({message: 'Unauthenticated'});
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({message: 'Forbidden: insufficient role'});
    }
    next();
  };
}

module.exports = {authenticateToken, authorizeRoles};
