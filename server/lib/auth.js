/**
 * auth.js – Authentication middleware helpers
 */
const jwt = require('jsonwebtoken');

/**
 * Express middleware that verifies a JWT from the Authorization header.
 * Attaches decoded payload to req.user if valid.
 * Responds with 401 if token is missing or invalid.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  try {
    const token = authHeader.split(' ')[1];
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Optional auth – if a valid token is present, attach user info.
 * Does NOT block the request if no token is provided.
 */
function optionalAuth(req, _res, next) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      req.user = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      // token invalid – proceed without user
    }
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
