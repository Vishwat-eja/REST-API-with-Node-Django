const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { validateRegister, validateLogin } = require('../middleware/validate');
const { authenticateToken } = require('../middleware/auth');

// Public routes
router.post('/register', validateRegister, AuthController.register);
router.post('/login', validateLogin, AuthController.login);

// Protected routes
router.get('/me', authenticateToken, AuthController.getMe);

module.exports = router;
