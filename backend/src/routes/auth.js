const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ethers } = require('ethers');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Generate JWT Token
const generateToken = (userId, walletAddress) => {
  return jwt.sign(
    { userId, walletAddress },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Verify Ethereum signature
const verifySignature = (message, signature, address) => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification failed:', error);
    return false;
  }
};

// @route   POST /api/auth/register
// @desc    Register a new user (email/password)
// @access  Public
router.post('/register', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('username').optional().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
  body('first_name').optional().isLength({ min: 2 }).withMessage('First name must be at least 2 characters'),
  body('last_name').optional().isLength({ min: 2 }).withMessage('Last name must be at least 2 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('country').optional().isLength({ min: 2 }).withMessage('Country must be at least 2 characters')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, password, username, first_name, last_name, phone, country } = req.body;

  try {
    // Check if user already exists
    const existingUser = await getRow(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this wallet address, email, or username already exists'
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    // Create new user
    const result = await runQuery(
      `INSERT INTO users (wallet_address, email, username, password_hash, first_name, last_name, phone, country) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [null, email, username, passwordHash, first_name, last_name, phone, country]
    );

    // Get the created user
    const newUser = await getRow(
      'SELECT id, wallet_address, email, username, first_name, last_name, kyc_status, created_at FROM users WHERE id = ?',
      [result.id]
    );

    // Generate JWT token
    const token = generateToken(newUser.id, newUser.wallet_address || null);

    logger.info('User registered successfully:', { userId: newUser.id, email: email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: newUser,
        token
      }
    });
  } catch (error) {
    logger.error('User registration failed:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    });
  }
}));

// @route   POST /api/auth/login
// @desc    Authenticate user with email/password
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { email, password } = req.body;

  try {
    // Get user by email
    const user = await getRow(
      'SELECT id, wallet_address, email, username, first_name, last_name, kyc_status, is_active, password_hash, created_at FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Validate password
    const matches = await bcrypt.compare(password, user.password_hash || '');
    if (!matches) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.wallet_address || null);

    logger.info('User logged in successfully:', { userId: user.id, walletAddress: user.wallet_address });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error('User login failed:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    });
  }
}));

// @route   POST /api/auth/wallet-connect
// @desc    Connect wallet to existing account
// @access  Public
router.post('/wallet-connect', [
  body('wallet_address').isEthereumAddress().withMessage('Valid Ethereum address required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('signature').notEmpty().withMessage('Signature is required'),
  body('email').isEmail().withMessage('Valid email required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { wallet_address, message, signature, email } = req.body;

  try {
    // Verify signature
    if (!verifySignature(message, signature, wallet_address)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Check if wallet is already connected
    const existingWallet = await getRow(
      'SELECT id FROM users WHERE wallet_address = ?',
      [wallet_address]
    );

    if (existingWallet) {
      return res.status(400).json({
        success: false,
        error: 'Wallet is already connected to another account'
      });
    }

    // Find user by email
    const user = await getRow(
      'SELECT id, wallet_address, email, username, first_name, last_name, kyc_status, is_active FROM users WHERE email = ?',
      [email]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        success: false,
        error: 'Account is deactivated'
      });
    }

    // Update user with wallet address
    await runQuery(
      'UPDATE users SET wallet_address = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [wallet_address, user.id]
    );

    // Get updated user
    const updatedUser = await getRow(
      'SELECT id, wallet_address, email, username, first_name, last_name, kyc_status, created_at FROM users WHERE id = ?',
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(updatedUser.id, updatedUser.wallet_address);

    logger.info('Wallet connected successfully:', { userId: updatedUser.id, walletAddress: wallet_address });

    res.json({
      success: true,
      message: 'Wallet connected successfully',
      data: {
        user: updatedUser,
        token
      }
    });
  } catch (error) {
    logger.error('Wallet connection failed:', error);
    res.status(500).json({
      success: false,
      error: 'Wallet connection failed'
    });
  }
}));

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', asyncHandler(async (req, res) => {
  // This would typically use auth middleware to get user from JWT
  // For now, we'll require wallet_address in query params
  const { wallet_address } = req.query;

  if (!wallet_address) {
    return res.status(400).json({
      success: false,
      error: 'Wallet address is required'
    });
  }

  try {
    const user = await getRow(
      'SELECT id, wallet_address, email, username, first_name, last_name, phone, country, kyc_status, kyc_verified_at, profile_image_url, created_at FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    logger.error('Get user profile failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    });
  }
}));

// @route   POST /api/auth/refresh
// @desc    Refresh JWT token
// @access  Public
router.post('/refresh', [
  body('wallet_address').isEthereumAddress().withMessage('Valid Ethereum address required'),
  body('message').notEmpty().withMessage('Message is required'),
  body('signature').notEmpty().withMessage('Signature is required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { wallet_address, message, signature } = req.body;

  try {
    // Verify signature
    if (!verifySignature(message, signature, wallet_address)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }

    // Get user
    const user = await getRow(
      'SELECT id, wallet_address FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Generate new JWT token
    const token = generateToken(user.id, user.wallet_address);

    logger.info('Token refreshed successfully:', { userId: user.id, walletAddress: wallet_address });

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: { token }
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    res.status(500).json({
      success: false,
      error: 'Token refresh failed'
    });
  }
}));

module.exports = router;
