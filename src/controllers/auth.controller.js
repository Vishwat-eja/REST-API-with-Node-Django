const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      username: user.username
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

class AuthController {
  static async register(req, res, next) {
    try {
      const { username, email, password } = req.body;

      // Check if email already registered
      const existingEmail = UserModel.findByEmail(email);
      if (existingEmail) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'An account with this email address already exists.'
        });
      }

      // Check if username already taken
      const existingUsername = UserModel.findByUsername(username);
      if (existingUsername) {
        return res.status(409).json({
          success: false,
          error: 'Conflict',
          message: 'This username is already taken. Please choose another.'
        });
      }

      // Hash password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Create user
      const user = UserModel.create({
        username,
        email,
        passwordHash
      });

      // Generate JWT
      const token = generateToken(user);

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async login(req, res, next) {
    try {
      const { password } = req.body;
      const identifier = req.loginIdentifier;

      // Find user by email or username
      const user = UserModel.findByEmailOrUsername(identifier);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials. Please verify your email/username and password.'
        });
      }

      // Compare password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Invalid credentials. Please verify your email/username and password.'
        });
      }

      // Generate JWT
      const token = generateToken(user);

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at
          },
          token
        }
      });
    } catch (err) {
      next(err);
    }
  }

  static async getMe(req, res, next) {
    try {
      const user = UserModel.findById(req.user.id);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'Not Found',
          message: 'User account not found.'
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            createdAt: user.created_at
          }
        }
      });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
