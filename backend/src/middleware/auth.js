const jwt = require('jsonwebtoken');
const { getQuery } = require('../utils/database');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user details from database
    const user = await getQuery(
      'SELECT id, username, email, role, full_name, is_active FROM users WHERE id = ? AND is_active = 1',
      [decoded.userId]
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid token - user not found' });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: userRole
      });
    }

    next();
  };
};

const requireAdmin = requireRole('admin');
const requireEvaluator = requireRole(['evaluator', 'admin']);
const requireRegistrationDesk = requireRole(['registration_desk', 'admin']);
const requireInvigilator = requireRole(['invigilator', 'admin']);

module.exports = {
  authenticateToken,
  requireRole,
  requireAdmin,
  requireEvaluator,
  requireRegistrationDesk,
  requireInvigilator
};

