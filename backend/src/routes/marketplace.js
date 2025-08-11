const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/marketplace/list
// @desc    Create a new marketplace listing
// @access  Private
router.post('/list', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('property_token_id').isInt({ min: 1 }).withMessage('Valid property token ID required'),
  body('token_amount').isInt({ min: 1 }).withMessage('Token amount must be at least 1'),
  body('price_per_token').isFloat({ min: 0.01 }).withMessage('Price per token must be at least $0.01'),
  body('expires_at').optional().isISO8601().withMessage('Valid expiration date required')
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
    wallet_address,
    property_token_id,
    token_amount,
    price_per_token,
    expires_at
  } = req.body;

  try {
    // Get user ID
    const user = await getRow(
      'SELECT id, kyc_status FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Check KYC status
    if (user.kyc_status !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required to create listings'
      });
    }

    // Check if property token exists
    const propertyToken = await getRow(
      'SELECT * FROM property_tokens WHERE id = ? AND is_active = 1',
      [property_token_id]
    );

    if (!propertyToken) {
      return res.status(404).json({
        success: false,
        error: 'Property token not found'
      });
    }

    // Check if user has enough tokens
    const userHolding = await getRow(
      'SELECT token_amount FROM user_token_holdings WHERE user_id = ? AND property_token_id = ?',
      [user.id, property_token_id]
    );

    if (!userHolding || userHolding.token_amount < token_amount) {
      return res.status(400).json({
        success: false,
        error: 'Insufficient token balance'
      });
    }

    // Check if listing already exists
    const existingListing = await getRow(
      'SELECT id FROM marketplace_listings WHERE seller_id = ? AND property_token_id = ? AND listing_status = ?',
      [user.id, property_token_id, 'active']
    );

    if (existingListing) {
      return res.status(400).json({
        success: false,
        error: 'Active listing already exists for this token'
      });
    }

    // Calculate total price
    const total_price = token_amount * price_per_token;

    // Set expiration date (default: 30 days)
    const expirationDate = expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    // Create listing
    const result = await runQuery(
      `INSERT INTO marketplace_listings (
        property_token_id, seller_id, token_amount, price_per_token, 
        total_price, listing_status, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [property_token_id, user.id, token_amount, price_per_token, total_price, 'active', expirationDate]
    );

    // Get the created listing
    const newListing = await getRow(
      `SELECT ml.*, pt.token_symbol, p.name as property_name, p.location as property_location,
              u.wallet_address as seller_wallet_address, u.username as seller_username
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       JOIN users u ON ml.seller_id = u.id
       WHERE ml.id = ?`,
      [result.id]
    );

    logger.info('Marketplace listing created successfully:', { 
      listingId: result.id, 
      sellerId: user.id,
      propertyTokenId: property_token_id,
      tokenAmount: token_amount
    });

    res.status(201).json({
      success: true,
      message: 'Marketplace listing created successfully',
      data: { listing: newListing }
    });
  } catch (error) {
    logger.error('Marketplace listing creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Marketplace listing creation failed'
    });
  }
}));

// @route   GET /api/marketplace/listings
// @desc    Get all marketplace listings with filtering and pagination
// @access  Public
router.get('/listings', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('property_type').optional().isIn(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'LAND', 'MIXED_USE', 'AGRICULTURAL']).withMessage('Valid property type required'),
  query('min_price').optional().isFloat({ min: 0 }).withMessage('Min price must be a positive number'),
  query('max_price').optional().isFloat({ min: 0 }).withMessage('Max price must be a positive number'),
  query('location').optional().isLength({ min: 2 }).withMessage('Location search must be at least 2 characters')
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
    property_type,
    min_price,
    max_price,
    location
  } = req.query;

  try {
    // Build WHERE clause
    let whereClause = 'WHERE ml.listing_status = ?';
    const params = ['active'];

    if (property_type) {
      whereClause += ' AND p.property_type = ?';
      params.push(property_type);
    }

    if (min_price) {
      whereClause += ' AND ml.price_per_token >= ?';
      params.push(min_price);
    }

    if (max_price) {
      whereClause += ' AND ml.price_per_token <= ?';
      params.push(max_price);
    }

    if (location) {
      whereClause += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    // Get total count
    const countResult = await getRow(
      `SELECT COUNT(*) as total 
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get listings with pagination
    const listings = await getAllRows(
      `SELECT ml.*, pt.token_symbol, pt.blockchain_address, pt.market_cap,
              p.name as property_name, p.location as property_location, p.property_type, 
              p.property_status, p.total_area, p.property_value,
              u.wallet_address as seller_wallet_address, u.username as seller_username
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       JOIN users u ON ml.seller_id = u.id
       ${whereClause}
       ORDER BY ml.created_at DESC
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
        listings,
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
    logger.error('Get marketplace listings failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace listings'
    });
  }
}));

// @route   GET /api/marketplace/listings/:id
// @desc    Get marketplace listing by ID
// @access  Public
router.get('/listings/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const listing = await getRow(
      `SELECT ml.*, pt.token_symbol, pt.blockchain_address, pt.market_cap,
              p.name as property_name, p.location as property_location, p.property_type, 
              p.property_status, p.total_area, p.property_value, p.description,
              p.images, p.documents, p.metadata_uri,
              u.wallet_address as seller_wallet_address, u.username as seller_username,
              u.first_name as seller_first_name, u.last_name as seller_last_name
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       JOIN users u ON ml.seller_id = u.id
       WHERE ml.id = ? AND ml.listing_status = ?`,
      [id, 'active']
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    // Parse JSON fields
    if (listing.images) {
      listing.images = JSON.parse(listing.images);
    }
    if (listing.documents) {
      listing.documents = JSON.parse(listing.documents);
    }

    res.json({
      success: true,
      data: { listing }
    });
  } catch (error) {
    logger.error('Get marketplace listing failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get marketplace listing'
    });
  }
}));

// @route   PUT /api/marketplace/listings/:id
// @desc    Update marketplace listing
// @access  Private (Seller only)
router.put('/listings/:id', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('token_amount').optional().isInt({ min: 1 }).withMessage('Token amount must be at least 1'),
  body('price_per_token').optional().isFloat({ min: 0.01 }).withMessage('Price per token must be at least $0.01'),
  body('expires_at').optional().isISO8601().withMessage('Valid expiration date required')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { wallet_address, token_amount, price_per_token, expires_at } = req.body;

  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  try {
    // Check if listing exists and user is seller
    const listing = await getRow(
      'SELECT ml.*, u.wallet_address FROM marketplace_listings ml JOIN users u ON ml.seller_id = u.id WHERE ml.id = ? AND ml.listing_status = ?',
      [id, 'active']
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listing.wallet_address !== wallet_address) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can update this listing'
      });
    }

    // Check if user has enough tokens for new amount
    if (token_amount && token_amount > listing.token_amount) {
      const userHolding = await getRow(
        'SELECT token_amount FROM user_token_holdings WHERE user_id = ? AND property_token_id = ?',
        [listing.seller_id, listing.property_token_id]
      );

      if (!userHolding || userHolding.token_amount < token_amount) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient token balance for new amount'
        });
      }
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];

    if (token_amount !== undefined) {
      updateFields.push('token_amount = ?');
      updateValues.push(token_amount);
    }

    if (price_per_token !== undefined) {
      updateFields.push('price_per_token = ?');
      updateValues.push(price_per_token);
    }

    if (expires_at !== undefined) {
      updateFields.push('expires_at = ?');
      updateValues.push(expires_at);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    // Recalculate total price
    const newTokenAmount = token_amount || listing.token_amount;
    const newPricePerToken = price_per_token || listing.price_per_token;
    const newTotalPrice = newTokenAmount * newPricePerToken;

    updateFields.push('total_price = ?', 'updated_at = CURRENT_TIMESTAMP');
    updateValues.push(newTotalPrice, id);

    // Update listing
    await runQuery(
      `UPDATE marketplace_listings SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated listing
    const updatedListing = await getRow(
      `SELECT ml.*, pt.token_symbol, p.name as property_name, p.location as property_location,
              u.wallet_address as seller_wallet_address, u.username as seller_username
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN properties p ON pt.property_id = p.id
       JOIN users u ON ml.seller_id = u.id
       WHERE ml.id = ?`,
      [id]
    );

    logger.info('Marketplace listing updated successfully:', { listingId: id, sellerId: listing.seller_id });

    res.json({
      success: true,
      message: 'Marketplace listing updated successfully',
      data: { listing: updatedListing }
    });
  } catch (error) {
    logger.error('Marketplace listing update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Marketplace listing update failed'
    });
  }
}));

// @route   DELETE /api/marketplace/listings/:id
// @desc    Cancel marketplace listing
// @access  Private (Seller only)
router.delete('/listings/:id', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { wallet_address } = req.body;

  try {
    // Check if listing exists and user is seller
    const listing = await getRow(
      'SELECT ml.*, u.wallet_address FROM marketplace_listings ml JOIN users u ON ml.seller_id = u.id WHERE ml.id = ? AND ml.listing_status = ?',
      [id, 'active']
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found'
      });
    }

    if (listing.wallet_address !== wallet_address) {
      return res.status(403).json({
        success: false,
        error: 'Only the seller can cancel this listing'
      });
    }

    // Cancel listing
    await runQuery(
      'UPDATE marketplace_listings SET listing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['cancelled', id]
    );

    logger.info('Marketplace listing cancelled successfully:', { listingId: id, sellerId: listing.seller_id });

    res.json({
      success: true,
      message: 'Marketplace listing cancelled successfully'
    });
  } catch (error) {
    logger.error('Marketplace listing cancellation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Marketplace listing cancellation failed'
    });
  }
}));

// @route   POST /api/marketplace/purchase
// @desc    Purchase tokens from a marketplace listing
// @access  Private
router.post('/purchase', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('listing_id').isInt({ min: 1 }).withMessage('Valid listing ID required'),
  body('token_amount').isInt({ min: 1 }).withMessage('Token amount must be at least 1'),
  body('transaction_hash').notEmpty().withMessage('Transaction hash required')
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
    wallet_address,
    listing_id,
    token_amount,
    transaction_hash
  } = req.body;

  try {
    // Get buyer user ID
    const buyer = await getRow(
      'SELECT id, kyc_status FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!buyer) {
      return res.status(404).json({
        success: false,
        error: 'Buyer not found'
      });
    }

    // Check KYC status
    if (buyer.kyc_status !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'KYC verification required to purchase tokens'
      });
    }

    // Get listing
    const listing = await getRow(
      `SELECT ml.*, pt.token_symbol, u.wallet_address as seller_wallet_address
       FROM marketplace_listings ml
       JOIN property_tokens pt ON ml.property_token_id = pt.id
       JOIN users u ON ml.seller_id = u.id
       WHERE ml.id = ? AND ml.listing_status = ?`,
      [listing_id, 'active']
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        error: 'Listing not found or not active'
      });
    }

    // Check if buyer is not the seller
    if (listing.seller_wallet_address === wallet_address) {
      return res.status(400).json({
        success: false,
        error: 'Cannot purchase your own listing'
      });
    }

    // Check if requested amount is available
    if (token_amount > listing.token_amount) {
      return res.status(400).json({
        success: false,
        error: 'Requested amount exceeds available tokens'
      });
    }

    // Calculate total cost
    const total_cost = token_amount * listing.price_per_token;

    // Record transaction
    const transactionResult = await runQuery(
      `INSERT INTO transactions (
        transaction_hash, from_address, to_address, property_token_id,
        token_amount, transaction_type, transaction_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [transaction_hash, wallet_address, listing.seller_wallet_address, listing.property_token_id, token_amount, 'purchase', 'confirmed']
    );

    // Update user token holdings
    // Add to buyer
    const buyerHolding = await getRow(
      'SELECT id, token_amount FROM user_token_holdings WHERE user_id = ? AND property_token_id = ?',
      [buyer.id, listing.property_token_id]
    );

    if (buyerHolding) {
      await runQuery(
        'UPDATE user_token_holdings SET token_amount = ?, last_updated = CURRENT_TIMESTAMP WHERE id = ?',
        [buyerHolding.token_amount + token_amount, buyerHolding.id]
      );
    } else {
      await runQuery(
        'INSERT INTO user_token_holdings (user_id, property_token_id, token_amount, purchase_price) VALUES (?, ?, ?, ?)',
        [buyer.id, listing.property_token_id, token_amount, listing.price_per_token]
      );
    }

    // Subtract from seller
    await runQuery(
      'UPDATE user_token_holdings SET token_amount = ?, last_updated = CURRENT_TIMESTAMP WHERE user_id = ? AND property_token_id = ?',
      [listing.token_amount - token_amount, listing.seller_id, listing.property_token_id]
    );

    // Update listing
    if (token_amount === listing.token_amount) {
      // Complete purchase - close listing
      await runQuery(
        'UPDATE marketplace_listings SET listing_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['sold', listing_id]
      );
    } else {
      // Partial purchase - update remaining amount
      const remainingAmount = listing.token_amount - token_amount;
      const remainingPrice = remainingAmount * listing.price_per_token;
      await runQuery(
        'UPDATE marketplace_listings SET token_amount = ?, total_price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [remainingAmount, remainingPrice, listing_id]
      );
    }

    logger.info('Marketplace purchase completed successfully:', { 
      listingId: listing_id, 
      buyerId: buyer.id,
      sellerId: listing.seller_id,
      tokenAmount: token_amount,
      transactionId: transactionResult.id
    });

    res.json({
      success: true,
      message: 'Purchase completed successfully',
      data: {
        transaction_id: transactionResult.id,
        token_amount: token_amount,
        total_cost: total_cost,
        listing_status: token_amount === listing.token_amount ? 'sold' : 'partial'
      }
    });
  } catch (error) {
    logger.error('Marketplace purchase failed:', error);
    res.status(500).json({
      success: false,
      error: 'Purchase failed'
    });
  }
}));

module.exports = router;
