const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/properties
// @desc    Create a new property
// @access  Private
router.post('/', [
  body('name').isLength({ min: 3, max: 255 }).withMessage('Property name must be between 3 and 255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('location').isLength({ min: 5, max: 500 }).withMessage('Location must be between 5 and 500 characters'),
  body('coordinates').optional().isLength({ max: 100 }).withMessage('Coordinates must be less than 100 characters'),
  body('property_type').isIn(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'LAND', 'MIXED_USE', 'AGRICULTURAL']).withMessage('Invalid property type'),
  body('property_status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'SOLD', 'FORECLOSED', 'RENTED', 'VACANT', 'UNDER_CONSTRUCTION']).withMessage('Invalid property status'),
  body('total_area').isFloat({ min: 1 }).withMessage('Total area must be a positive number'),
  body('property_value').isFloat({ min: 100000 }).withMessage('Property value must be at least $100,000'),
  body('max_tokens').isInt({ min: 1000, max: 10000000 }).withMessage('Max tokens must be between 1,000 and 10,000,000'),
  body('token_price').isFloat({ min: 0.01 }).withMessage('Token price must be at least $0.01'),
  body('metadata_uri').optional().isURL().withMessage('Valid metadata URI required'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('documents').optional().isArray().withMessage('Documents must be an array'),
  body('owner_wallet_address').isEthereumAddress().withMessage('Valid owner wallet address required')
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
    name,
    description,
    location,
    coordinates,
    property_type,
    property_status = 'ACTIVE',
    total_area,
    property_value,
    max_tokens,
    token_price,
    metadata_uri,
    images = [],
    documents = [],
    owner_wallet_address
  } = req.body;

  try {
    // Get owner user ID
    const owner = await getRow(
      'SELECT id FROM users WHERE wallet_address = ? AND is_active = 1',
      [owner_wallet_address]
    );

    if (!owner) {
      return res.status(404).json({
        success: false,
        error: 'Owner not found'
      });
    }

    // Create property
    const result = await runQuery(
      `INSERT INTO properties (
        name, description, location, coordinates, property_type, property_status,
        total_area, property_value, max_tokens, token_price, metadata_uri,
        images, documents, owner_id, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name, description, location, coordinates, property_type, property_status,
        total_area, property_value, max_tokens, token_price, metadata_uri,
        JSON.stringify(images), JSON.stringify(documents), owner.id, owner.id
      ]
    );

    // Get the created property
    const newProperty = await getRow(
      `SELECT p.*, u.wallet_address as owner_wallet_address, u.username as owner_username
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [result.id]
    );

    logger.info('Property created successfully:', { propertyId: result.id, ownerId: owner.id });

    res.status(201).json({
      success: true,
      message: 'Property created successfully',
      data: { property: newProperty }
    });
  } catch (error) {
    logger.error('Property creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Property creation failed'
    });
  }
}));

// @route   GET /api/properties
// @desc    Get all properties with filtering and pagination
// @access  Public
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('property_type').optional().isIn(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'LAND', 'MIXED_USE', 'AGRICULTURAL']).withMessage('Invalid property type'),
  query('property_status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'SOLD', 'FORECLOSED', 'RENTED', 'VACANT', 'UNDER_CONSTRUCTION']).withMessage('Invalid property status'),
  query('min_value').optional().isFloat({ min: 0 }).withMessage('Min value must be a positive number'),
  query('max_value').optional().isFloat({ min: 0 }).withMessage('Max value must be a positive number'),
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
    property_status,
    min_value,
    max_value,
    location
  } = req.query;

  try {
    // Build WHERE clause
    let whereClause = 'WHERE p.is_active = 1';
    const params = [];

    if (property_type) {
      whereClause += ' AND p.property_type = ?';
      params.push(property_type);
    }

    if (property_status) {
      whereClause += ' AND p.property_status = ?';
      params.push(property_status);
    }

    if (min_value) {
      whereClause += ' AND p.property_value >= ?';
      params.push(min_value);
    }

    if (max_value) {
      whereClause += ' AND p.property_value <= ?';
      params.push(max_value);
    }

    if (location) {
      whereClause += ' AND p.location LIKE ?';
      params.push(`%${location}%`);
    }

    // Get total count
    const countResult = await getRow(
      `SELECT COUNT(*) as total FROM properties p ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get properties with pagination
    const properties = await getAllRows(
      `SELECT p.*, u.wallet_address as owner_wallet_address, u.username as owner_username,
              pt.blockchain_address, pt.token_symbol, pt.circulating_supply, pt.market_cap
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN property_tokens pt ON p.id = pt.property_id
       ${whereClause}
       ORDER BY p.created_at DESC
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
        properties,
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
    logger.error('Get properties failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get properties'
    });
  }
}));

// @route   GET /api/properties/:id
// @desc    Get property by ID
// @access  Public
router.get('/:id', [
  query('id').isInt({ min: 1 }).withMessage('Valid property ID required')
], asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const property = await getRow(
      `SELECT p.*, u.wallet_address as owner_wallet_address, u.username as owner_username,
              pt.blockchain_address, pt.token_symbol, pt.circulating_supply, pt.market_cap
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       LEFT JOIN property_tokens pt ON p.id = pt.property_id
       WHERE p.id = ? AND p.is_active = 1`,
      [id]
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    // Parse JSON fields
    if (property.images) {
      property.images = JSON.parse(property.images);
    }
    if (property.documents) {
      property.documents = JSON.parse(property.documents);
    }

    res.json({
      success: true,
      data: { property }
    });
  } catch (error) {
    logger.error('Get property failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property'
    });
  }
}));

// @route   PUT /api/properties/:id
// @desc    Update property
// @access  Private (Owner only)
router.put('/:id', [
  body('name').optional().isLength({ min: 3, max: 255 }).withMessage('Property name must be between 3 and 255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must be less than 1000 characters'),
  body('location').optional().isLength({ min: 5, max: 500 }).withMessage('Location must be between 5 and 500 characters'),
  body('coordinates').optional().isLength({ max: 100 }).withMessage('Coordinates must be less than 100 characters'),
  body('property_type').optional().isIn(['RESIDENTIAL', 'COMMERCIAL', 'INDUSTRIAL', 'LAND', 'MIXED_USE', 'AGRICULTURAL']).withMessage('Invalid property type'),
  body('property_status').optional().isIn(['ACTIVE', 'MAINTENANCE', 'SOLD', 'FORECLOSED', 'RENTED', 'VACANT', 'UNDER_CONSTRUCTION']).withMessage('Invalid property status'),
  body('total_area').optional().isFloat({ min: 1 }).withMessage('Total area must be a positive number'),
  body('property_value').optional().isFloat({ min: 100000 }).withMessage('Property value must be at least $100,000'),
  body('token_price').optional().isFloat({ min: 0.01 }).withMessage('Token price must be at least $0.01'),
  body('metadata_uri').optional().isURL().withMessage('Valid metadata URI required'),
  body('images').optional().isArray().withMessage('Images must be an array'),
  body('documents').optional().isArray().withMessage('Documents must be an array')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { wallet_address } = req.body; // Owner's wallet address

  if (!wallet_address) {
    return res.status(400).json({
      success: false,
      error: 'Owner wallet address is required'
    });
  }

  try {
    // Check if property exists and user is owner
    const property = await getRow(
      'SELECT p.*, u.wallet_address FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = ? AND p.is_active = 1',
      [id]
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    if (property.wallet_address !== wallet_address) {
      return res.status(403).json({
        success: false,
        error: 'Only the property owner can update this property'
      });
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    Object.keys(req.body).forEach(key => {
      if (key !== 'wallet_address' && req.body[key] !== undefined) {
        if (key === 'images' || key === 'documents') {
          updateFields.push(`${key} = ?`);
          updateValues.push(JSON.stringify(req.body[key]));
        } else {
          updateFields.push(`${key} = ?`);
          updateValues.push(req.body[key]);
        }
      }
    });

    if (updateFields.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No fields to update'
      });
    }

    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);

    // Update property
    await runQuery(
      `UPDATE properties SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated property
    const updatedProperty = await getRow(
      `SELECT p.*, u.wallet_address as owner_wallet_address, u.username as owner_username
       FROM properties p
       JOIN users u ON p.owner_id = u.id
       WHERE p.id = ?`,
      [id]
    );

    logger.info('Property updated successfully:', { propertyId: id, ownerWallet: wallet_address });

    res.json({
      success: true,
      message: 'Property updated successfully',
      data: { property: updatedProperty }
    });
  } catch (error) {
    logger.error('Property update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Property update failed'
    });
  }
}));

// @route   DELETE /api/properties/:id
// @desc    Delete property (soft delete)
// @access  Private (Owner only)
router.delete('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { wallet_address } = req.body;

  if (!wallet_address) {
    return res.status(400).json({
      success: false,
      error: 'Owner wallet address is required'
    });
  }

  try {
    // Check if property exists and user is owner
    const property = await getRow(
      'SELECT p.*, u.wallet_address FROM properties p JOIN users u ON p.owner_id = u.id WHERE p.id = ? AND p.is_active = 1',
      [id]
    );

    if (!property) {
      return res.status(404).json({
        success: false,
        error: 'Property not found'
      });
    }

    if (property.wallet_address !== wallet_address) {
      return res.status(403).json({
        success: false,
        error: 'Only the property owner can delete this property'
      });
    }

    // Soft delete property
    await runQuery(
      'UPDATE properties SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [id]
    );

    logger.info('Property deleted successfully:', { propertyId: id, ownerWallet: wallet_address });

    res.json({
      success: true,
      message: 'Property deleted successfully'
    });
  } catch (error) {
    logger.error('Property deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'Property deletion failed'
    });
  }
}));

// @route   GET /api/properties/:id/history
// @desc    Get property change history
// @access  Public
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const history = await getAllRows(
      `SELECT ph.*, u.wallet_address, u.username
       FROM property_history ph
       JOIN users u ON ph.changed_by = u.id
       WHERE ph.property_id = ?
       ORDER BY ph.created_at DESC`,
      [id]
    );

    res.json({
      success: true,
      data: { history }
    });
  } catch (error) {
    logger.error('Get property history failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property history'
    });
  }
}));

// @route   GET /api/properties/:id/valuations
// @desc    Get property valuation history
// @access  Public
router.get('/:id/valuations', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const valuations = await getAllRows(
      `SELECT pv.*, u.wallet_address, u.username
       FROM property_valuations pv
       LEFT JOIN users u ON pv.valuer_id = u.id
       WHERE pv.property_id = ?
       ORDER BY pv.valuation_date DESC`,
      [id]
    );

    res.json({
      success: true,
      data: { valuations }
    });
  } catch (error) {
    logger.error('Get property valuations failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get property valuations'
    });
  }
}));

module.exports = router;
