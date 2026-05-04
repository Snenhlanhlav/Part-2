const jwt = require("jsonwebtoken");

/**
 * Middleware to verify JWT token on protected routes.
 * Token must be sent as a Bearer token in the Authorization header.
 * We use HttpOnly cookies in production for better XSS resistance,
 * but Authorization header is acceptable for API clients.
 */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Access denied. No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { id, username, role }
    next();
  } catch (err) {
    // Do not reveal whether token is expired vs invalid (security best practice)
    return res.status(401).json({ error: "Invalid or expired session. Please log in again." });
  }
};

/**
 * Role-based access control middleware.
 * Usage: authorize("employee") — only employees can access the route.
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: "Access forbidden. Insufficient permissions." });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
