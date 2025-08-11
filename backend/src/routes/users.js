const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('kyc_status').optional().isIn(['pending', 'verified', 'rejected']).withMessage('Valid KYC status required'),
  query('search').optional().isLength({ min: 2 }).withMessage('Search term must be at least 2 characters')
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
    kyc_status,
    search
  } = req.query;

  try {
    // Build WHERE clause
    let whereClause = 'WHERE u.is_active = 1';
    const params = [];

    if (kyc_status) {
      whereClause += ' AND u.kyc_status = ?';
      params.push(kyc_status);
    }

    if (search) {
      whereClause += ' AND (u.username LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count
    const countResult = await getRow(
      `SELECT COUNT(*) as total FROM users u ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get users with pagination
    const users = await getAllRows(
      `SELECT u.id, u.wallet_address, u.email, u.username, u.first_name, u.last_name, 
              u.phone, u.country, u.kyc_status, u.kyc_verified_at, u.profile_image_url, 
              u.created_at, u.updated_at
       FROM users u
       ${whereClause}
       ORDER BY u.created_at DESC
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
        users,
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
    logger.error('Get users failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get users'
    });
  }
}));

// @route   GET /api/users/:wallet_address
// @desc    Get user by wallet address
// @access  Public
router.get('/:wallet_address', asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;

  try {
    const user = await getRow(
      `SELECT u.id, u.wallet_address, u.email, u.username, u.first_name, u.last_name, 
              u.phone, u.country, u.kyc_status, u.kyc_verified_at, u.profile_image_url, 
              u.created_at, u.updated_at
       FROM users u
       WHERE u.wallet_address = ? AND u.is_active = 1`,
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
    logger.error('Get user failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user'
    });
  }
}));

// @route   PUT /api/users/:wallet_address
// @desc    Update user profile
// @access  Private (User can update their own profile)
router.put('/:wallet_address', [
  body('email').optional().isEmail().withMessage('Valid email required'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters'),
  body('first_name').optional().isLength({ min: 2, max: 100 }).withMessage('First name must be between 2 and 100 characters'),
  body('last_name').optional().isLength({ min: 2, max: 100 }).withMessage('Last name must be between 2 and 100 characters'),
  body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
  body('country').optional().isLength({ min: 2, max: 100 }).withMessage('Country must be between 2 and 100 characters'),
  body('profile_image_url').optional().isURL().withMessage('Valid profile image URL required')
], asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;
  const updateData = req.body;

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Check if user exists
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

    // Check for unique constraints
    if (updateData.email) {
      const existingEmail = await getRow(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updateData.email, user.id]
      );
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
    }

    if (updateData.username) {
      const existingUsername = await getRow(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [updateData.username, user.id]
      );
      if (existingUsername) {
        return res.status(400).json({
          success: false,
          error: 'Username already in use'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        updateFields.push(`${key} = ?`);
        updateValues.push(updateData[key]);
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(user.id);

    // Update user
    await runQuery(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated user
    const updatedUser = await getRow(
      `SELECT u.id, u.wallet_address, u.email, u.username, u.first_name, u.last_name, 
              u.phone, u.country, u.kyc_status, u.kyc_verified_at, u.profile_image_url, 
              u.created_at, u.updated_at
       FROM users u
       WHERE u.id = ?`,
      [user.id]
    );

    logger.info('User profile updated successfully:', { userId: user.id, walletAddress: wallet_address });

    res.json({
      success: true,
      message: 'User profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('User profile update failed:', error);
    res.status(500).json({
      success: false,
      error: 'User profile update failed'
    });
  }
}));

// @route   GET /api/users/:wallet_address/token-holdings
// @desc    Get user's token holdings
// @access  Public
router.get('/:wallet_address/token-holdings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Check if user exists
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

    // Get total count of token holdings
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM user_token_holdings WHERE user_id = ?',
      [user.id]
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get token holdings with property and token info
    const tokenHoldings = await getAllRows(
      `SELECT uth.*, p.name as property_name, p.location as property_location, 
              p.property_type, p.property_status, pt.blockchain_address, pt.token_symbol,
              pt.token_price, pt.market_cap
       FROM user_token_holdings uth
       JOIN property_tokens pt ON uth.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       WHERE uth.user_id = ?
       ORDER BY uth.last_updated DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        token_holdings: tokenHoldings,
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
    logger.error('Get user token holdings failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user token holdings'
    });
  }
}));

// @route   GET /api/users/:wallet_address/transactions
// @desc    Get user's transaction history
// @access  Public
router.get('/:wallet_address/transactions', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('transaction_type').optional().isIn(['purchase', 'sale', 'transfer', 'mint', 'burn']).withMessage('Valid transaction type required')
], asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;
  const { page = 1, limit = 10, transaction_type } = req.query;

  try {
    // Check if user exists
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

    // Build WHERE clause
    let whereClause = 'WHERE (t.from_address = ? OR t.to_address = ?)';
    const params = [wallet_address, wallet_address];

    if (transaction_type) {
      whereClause += ' AND t.transaction_type = ?';
      params.push(transaction_type);
    }

    // Get total count of transactions
    const countResult = await getRow(
      `SELECT COUNT(*) as total FROM transactions t ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get transactions with property and token info
    const transactions = await getAllRows(
      `SELECT t.*, p.name as property_name, pt.token_symbol
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
    logger.error('Get user transactions failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user transactions'
    });
  }
}));

// @route   GET /api/users/:wallet_address/votes
// @desc    Get user's governance votes
// @access  Public
router.get('/:wallet_address/votes', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Check if user exists
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

    // Get total count of votes
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM user_votes WHERE user_id = ?',
      [user.id]
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get votes with proposal info
    const votes = await getAllRows(
      `SELECT uv.*, gp.title as proposal_title, gp.description as proposal_description,
              gp.proposal_type, gp.proposal_status, gp.voting_start, gp.voting_end
       FROM user_votes uv
       JOIN governance_proposals gp ON uv.proposal_id = gp.id
       WHERE uv.user_id = ?
       ORDER BY uv.voted_at DESC
       LIMIT ? OFFSET ?`,
      [user.id, limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        votes,
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
    logger.error('Get user votes failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user votes'
    });
  }
}));

// @route   DELETE /api/users/:wallet_address
// @desc    Deactivate user account (soft delete)
// @access  Private (User can deactivate their own account)
router.delete('/:wallet_address', asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;
  const { confirmation } = req.body;

  if (confirmation !== 'I confirm I want to deactivate my account') {
    return res.status(400).json({
      success: false,
      error: 'Account deactivation requires explicit confirmation'
    });
  }

  try {
    // Check if user exists
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

    // Soft delete user
    await runQuery(
      'UPDATE users SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [user.id]
    );

    logger.info('User account deactivated:', { userId: user.id, walletAddress: wallet_address });

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    logger.error('User account deactivation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Account deactivation failed'
    });
  }
}));

module.exports = router;
