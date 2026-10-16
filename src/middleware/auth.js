const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_change_in_production_12345!';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Authentication Required',
      message: 'Authorization header is missing. Please provide a Bearer token in the format: Authorization: Bearer <token>'
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({
      success: false,
      error: 'Invalid Token Format',
      message: 'Authorization header must follow the format: Bearer <token>'
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists in database
    const user = UserModel.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'User Not Found',
        message: 'The user account associated with this token no longer exists.'
      });
    }

    req.user = {
      id: user.id,
      username: user.username,
      email: user.email
    };

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Token Expired',
        message: 'Your authorization token has expired. Please log in again.'
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Invalid Token',
      message: 'The provided authorization token is invalid.'
    });
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
