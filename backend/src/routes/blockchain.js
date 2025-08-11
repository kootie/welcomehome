const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');
const { ethers } = require('ethers');

const router = express.Router();

// @route   POST /api/blockchain/transactions
// @desc    Record a new blockchain transaction
// @access  Private
router.post('/transactions', [
  body('transaction_hash').notEmpty().withMessage('Transaction hash required'),
  body('from_address').isEthereumAddress().withMessage('Valid from address required'),
  body('to_address').isEthereumAddress().withMessage('Valid to address required'),
  body('property_token_id').optional().isInt({ min: 1 }).withMessage('Valid property token ID required'),
  body('token_amount').optional().isInt({ min: 1 }).withMessage('Token amount must be at least 1'),
  body('transaction_type').isIn(['purchase', 'sale', 'transfer', 'mint', 'burn', 'governance']).withMessage('Valid transaction type required'),
  body('gas_used').optional().isInt({ min: 0 }).withMessage('Gas used must be a positive number'),
  body('gas_price').optional().isFloat({ min: 0 }).withMessage('Gas price must be a positive number'),
  body('block_number').optional().isInt({ min: 0 }).withMessage('Block number must be a positive number')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    transaction_hash,
    from_address,
    to_address,
    property_token_id,
    token_amount,
    transaction_type,
    gas_used,
    gas_price,
    block_number
  } = req.body;

  try {
    // Check if transaction already exists
    const existingTransaction = await getRow(
      'SELECT id FROM transactions WHERE transaction_hash = ?',
      [transaction_hash]
    );

    if (existingTransaction) {
      return res.status(400).json({
        success: false,
        error: 'Transaction already exists'
      });
    }

    // Create transaction record
    const result = await runQuery(
      `INSERT INTO transactions (
        transaction_hash, from_address, to_address, property_token_id,
        token_amount, transaction_type, gas_used, gas_price, block_number
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [transaction_hash, from_address, to_address, property_token_id, token_amount, transaction_type, gas_used, gas_price, block_number]
    );

    // Get the created transaction
    const newTransaction = await getRow(
      'SELECT * FROM transactions WHERE id = ?',
      [result.id]
    );

    logger.info('Blockchain transaction recorded successfully:', { 
      transactionId: result.id, 
      transactionHash: transaction_hash,
      type: transaction_type
    });

    res.status(201).json({
      success: true,
      message: 'Transaction recorded successfully',
      data: { transaction: newTransaction }
    });
  } catch (error) {
    logger.error('Transaction recording failed:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction recording failed'
    });
  }
}));

// @route   GET /api/blockchain/transactions
// @desc    Get all blockchain transactions with filtering and pagination
// @access  Public
router.get('/transactions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('transaction_type').optional().isIn(['purchase', 'sale', 'transfer', 'mint', 'burn', 'governance']).withMessage('Valid transaction type required'),
  query('transaction_status').optional().isIn(['pending', 'confirmed', 'failed']).withMessage('Valid transaction status required'),
  query('address').optional().isEthereumAddress().withMessage('Valid Ethereum address required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const {
    page = 1,
    limit = 10,
    transaction_type,
    transaction_status,
    address
  } = req.query;

  try {
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (transaction_type) {
      whereClause += ' AND t.transaction_type = ?';
      params.push(transaction_type);
    }

    if (transaction_status) {
      whereClause += ' AND t.transaction_status = ?';
      params.push(transaction_status);
    }

    if (address) {
      whereClause += ' AND (t.from_address = ? OR t.to_address = ?)';
      params.push(address, address);
    }

    // Get total count
    const countResult = await getRow(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get transactions with pagination
    const transactions = await getAllRows(
      `SELECT t.*, pt.token_symbol, p.name as property_name
       FROM transactions t
       LEFT JOIN property_tokens pt ON t.property_token_id = pt.id
       LEFT JOIN properties p ON pt.property_id = p.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    });
  } catch (error) {
    logger.error('Get blockchain transactions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain transactions'
    });
  }
}));

// @route   GET /api/blockchain/transactions/:hash
// @desc    Get blockchain transaction by hash
// @access  Public
router.get('/transactions/:hash', asyncHandler(async (req, res) => {
  const { hash } = req.params;

  try {
    const transaction = await getRow(
      `SELECT t.*, pt.token_symbol, pt.blockchain_address, p.name as property_name,
              p.location as property_location, p.property_type
       FROM transactions t
       LEFT JOIN property_tokens pt ON t.property_token_id = pt.id
       LEFT JOIN properties p ON pt.property_id = p.id
       WHERE t.transaction_hash = ?`,
      [hash]
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });
  } catch (error) {
    logger.error('Get blockchain transaction failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain transaction'
    });
  }
}));

// @route   PUT /api/blockchain/transactions/:hash/status
// @desc    Update transaction status
// @access  Private
router.put('/transactions/:hash/status', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('new_status').isIn(['pending', 'confirmed', 'failed']).withMessage('Valid status required'),
  body('block_number').optional().isInt({ min: 0 }).withMessage('Block number must be a positive number'),
  body('gas_used').optional().isInt({ min: 0 }).withMessage('Gas used must be a positive number'),
  body('gas_price').optional().isFloat({ min: 0 }).withMessage('Gas price must be a positive number')
], asyncHandler(async (req, res) => {
  const { hash } = req.params;
  const { wallet_address, new_status, block_number, gas_used, gas_price } = req.body;

  try {
    // Check if transaction exists
    const transaction = await getRow(
      'SELECT * FROM transactions WHERE transaction_hash = ?',
      [hash]
    );

    if (!transaction) {
      return res.status(404).json({
        success: false,
        error: 'Transaction not found'
      });
    }

    // Check if user has permission (this would typically use auth middleware)
    const user = await getRow(
      'SELECT id FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Build update query
    const updateFields = ['transaction_status = ?'];
    const updateValues = [new_status];

    if (new_status === 'confirmed') {
      updateFields.push('confirmed_at = CURRENT_TIMESTAMP');
      
      if (block_number) {
        updateFields.push('block_number = ?');
        updateValues.push(block_number);
      }
      
      if (gas_used) {
        updateFields.push('gas_used = ?');
        updateValues.push(gas_used);
      }
      
      if (gas_price) {
        updateFields.push('gas_price = ?');
        updateValues.push(gas_price);
      }
    }

    updateValues.push(hash);

    // Update transaction
    await runQuery(
      `UPDATE transactions SET ${updateFields.join(', ')} WHERE transaction_hash = ?`,
      updateValues
    );

    // Get updated transaction
    const updatedTransaction = await getRow(
      'SELECT * FROM transactions WHERE transaction_hash = ?',
      [hash]
    );

    logger.info('Transaction status updated successfully:', { 
      transactionHash: hash, 
      newStatus: new_status,
      updatedBy: user.id
    });

    res.json({
      success: true,
      message: 'Transaction status updated successfully',
      data: { transaction: updatedTransaction }
    });
  } catch (error) {
    logger.error('Transaction status update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Transaction status update failed'
    });
  }
}));

// @route   POST /api/blockchain/verify-signature
// @desc    Verify Ethereum signature
// @access  Public
router.post('/verify-signature', [
  body('message').notEmpty().withMessage('Message required'),
  body('signature').notEmpty().withMessage('Signature required'),
  body('address').isEthereumAddress().withMessage('Valid Ethereum address required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { message, signature, address } = req.body;

  try {
    // Verify signature
    let isValid = false;
    let recoveredAddress = '';

    try {
      recoveredAddress = ethers.verifyMessage(message, signature);
      isValid = recoveredAddress.toLowerCase() === address.toLowerCase();
    } catch (error) {
      logger.error('Signature verification failed:', error);
      isValid = false;
    }

    res.json({
      success: true,
      data: {
        is_valid: isValid,
        recovered_address: recoveredAddress,
        expected_address: address,
        message: message
      }
    });
  } catch (error) {
    logger.error('Signature verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'Signature verification failed'
    });
  }
}));

// @route   GET /api/blockchain/stats
// @desc    Get blockchain statistics
// @access  Public
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get total transactions count
    const totalTransactions = await getRow(
      'SELECT COUNT(*) as total FROM transactions'
    );

    // Get confirmed transactions count
    const confirmedTransactions = await getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE transaction_status = ?',
      ['confirmed']
    );

    // Get pending transactions count
    const pendingTransactions = await getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE transaction_status = ?',
      ['pending']
    );

    // Get total gas used
    const totalGasUsed = await getRow(
      'SELECT SUM(gas_used) as total FROM transactions WHERE gas_used IS NOT NULL'
    );

    // Get total gas cost (in wei)
    const totalGasCost = await getRow(
      'SELECT SUM(gas_used * gas_price) as total FROM transactions WHERE gas_used IS NOT NULL AND gas_price IS NOT NULL'
    );

    // Get transaction type distribution
    const transactionTypes = await getAllRows(
      `SELECT transaction_type, COUNT(*) as count 
       FROM transactions 
       GROUP BY transaction_type 
       ORDER BY count DESC`
    );

    // Get recent transactions
    const recentTransactions = await getAllRows(
      `SELECT t.transaction_hash, t.transaction_type, t.transaction_status, t.created_at,
              pt.token_symbol, p.name as property_name
       FROM transactions t
       LEFT JOIN property_tokens pt ON t.property_token_id = pt.id
       LEFT JOIN properties p ON pt.property_id = p.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );

    res.json({
      success: true,
      data: {
        total_transactions: totalTransactions.total,
        confirmed_transactions: confirmedTransactions.total,
        pending_transactions: pendingTransactions.total,
        total_gas_used: totalGasUsed.total || 0,
        total_gas_cost_wei: totalGasCost.total || 0,
        transaction_types: transactionTypes,
        recent_transactions: recentTransactions
      }
    });
  } catch (error) {
    logger.error('Get blockchain stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get blockchain stats'
    });
  }
}));

// @route   GET /api/blockchain/address/:address
// @desc    Get blockchain activity for a specific address
// @access  Public
router.get('/address/:address', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { address } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Validate address format
    if (!ethers.isAddress(address)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Ethereum address format'
      });
    }

    // Get total count of transactions for this address
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE from_address = ? OR to_address = ?',
      [address, address]
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get transactions for this address
    const transactions = await getAllRows(
      `SELECT t.*, pt.token_symbol, p.name as property_name
       FROM transactions t
       LEFT JOIN property_tokens pt ON t.property_token_id = pt.id
       LEFT JOIN properties p ON pt.property_id = p.id
       WHERE t.from_address = ? OR t.to_address = ?
       ORDER BY t.created_at DESC
       LIMIT ? OFFSET ?`,
      [address, address, limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Get address statistics
    const sentTransactions = await getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE from_address = ?',
      [address]
    );

    const receivedTransactions = await getRow(
      'SELECT COUNT(*) as total FROM transactions WHERE to_address = ?',
      [address]
    );

    const totalGasUsed = await getRow(
      'SELECT SUM(gas_used) as total FROM transactions WHERE from_address = ? AND gas_used IS NOT NULL',
      [address]
    );

    res.json({
      success: true,
      data: {
        address: address,
        transactions,
        statistics: {
          total_transactions: total,
          sent_transactions: sentTransactions.total,
          received_transactions: receivedTransactions.total,
          total_gas_used: totalGasUsed.total || 0
        },
        pagination: {
          current_page: parseInt(page),
          total_pages: totalPages,
          total_items: total,
          items_per_page: parseInt(limit),
          has_next_page: hasNextPage,
          has_prev_page: hasPrevPage
        }
      }
    });
  } catch (error) {
    logger.error('Get address activity failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get address activity'
    });
  }
}));

module.exports = router;
