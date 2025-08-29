const express = require('express');
const { body, validationResult } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/payments/deposit
// @desc    Record a stablecoin deposit intent or on-chain receipt
// @access  Private
router.post('/deposit', [
  body('email').isEmail().withMessage('Valid email required'),
  body('token_symbol').isIn(['USDC', 'USDT']).withMessage('Supported stablecoin required'),
  body('amount').isString().withMessage('Amount should be a string value'),
  body('network').isIn(['ALKEBULEUM', 'SEPOLIA', 'LOCALHOST']).withMessage('Supported network required'),
  body('tx_hash').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }

  const { email, token_symbol, amount, network, tx_hash } = req.body;

  try {
    const user = await getRow('SELECT id FROM users WHERE email = ? AND is_active = 1', [email]);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const result = await runQuery(
      'INSERT INTO user_deposits (user_id, token_symbol, amount, tx_hash, network, status) VALUES (?, ?, ?, ?, ?, ?)',
      [user.id, token_symbol, amount, tx_hash || null, network, tx_hash ? 'confirmed' : 'pending']
    );

    const deposit = await getRow('SELECT * FROM user_deposits WHERE id = ?', [result.id]);
    logger.info('Deposit recorded', { userId: user.id, token_symbol, amount, network });
    res.status(201).json({ success: true, data: { deposit } });
  } catch (error) {
    logger.error('Deposit recording failed', error);
    res.status(500).json({ success: false, error: 'Deposit recording failed' });
  }
}));

module.exports = router;


