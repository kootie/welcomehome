const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/kyc/submit
// @desc    Submit KYC documents
// @access  Private
router.post('/submit', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('document_type').isIn(['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'UTILITY_BILL', 'BANK_STATEMENT']).withMessage('Valid document type required'),
  body('document_number').isLength({ min: 3, max: 50 }).withMessage('Document number must be between 3 and 50 characters'),
  body('document_url').isURL().withMessage('Valid document URL required')
], asyncHandler(async (req, res) => {
  // Check validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array()
    });
  }

  const { wallet_address, document_type, document_number, document_url } = req.body;

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

    // Check if KYC is already verified
    if (user.kyc_status === 'verified') {
      return res.status(400).json({
        success: false,
        error: 'KYC is already verified'
      });
    }

    // Check if document already exists
    const existingDoc = await getRow(
      'SELECT id FROM kyc_records WHERE user_id = ? AND document_type = ? AND document_number = ?',
      [user.id, document_type, document_number]
    );

    if (existingDoc) {
      return res.status(400).json({
        success: false,
        error: 'Document already submitted'
      });
    }

    // Create KYC record
    const result = await runQuery(
      'INSERT INTO kyc_records (user_id, document_type, document_number, document_url) VALUES (?, ?, ?, ?)',
      [user.id, document_type, document_number, document_url]
    );

    // Update user KYC status to pending
    await runQuery(
      'UPDATE users SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['pending', user.id]
    );

    // Get the created KYC record
    const kycRecord = await getRow(
      'SELECT * FROM kyc_records WHERE id = ?',
      [result.id]
    );

    logger.info('KYC document submitted successfully:', { 
      userId: user.id, 
      documentType: document_type,
      kycRecordId: result.id 
    });

    res.status(201).json({
      success: true,
      message: 'KYC document submitted successfully',
      data: { kyc_record: kycRecord }
    });
  } catch (error) {
    logger.error('KYC submission failed:', error);
    res.status(500).json({
      success: false,
      error: 'KYC submission failed'
    });
  }
}));

// @route   GET /api/kyc/status/:wallet_address
// @desc    Get KYC status for a user
// @access  Public
router.get('/status/:wallet_address', asyncHandler(async (req, res) => {
  const { wallet_address } = req.params;

  try {
    const user = await getRow(
      'SELECT id, wallet_address, kyc_status, kyc_verified_at FROM users WHERE wallet_address = ? AND is_active = 1',
      [wallet_address]
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Get KYC records
    const kycRecords = await getAllRows(
      'SELECT * FROM kyc_records WHERE user_id = ? ORDER BY created_at DESC',
      [user.id]
    );

    res.json({
      success: true,
      data: {
        user: {
          wallet_address: user.wallet_address,
          kyc_status: user.kyc_status,
          kyc_verified_at: user.kyc_verified_at
        },
        kyc_records: kycRecords
      }
    });
  } catch (error) {
    logger.error('Get KYC status failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get KYC status'
    });
  }
}));

// @route   PUT /api/kyc/verify/:record_id
// @desc    Verify KYC document (Admin/Verifier only)
// @access  Private
router.put('/verify/:record_id', [
  body('verification_status').isIn(['approved', 'rejected']).withMessage('Valid verification status required'),
  body('verifier_wallet_address').isEthereumAddress().withMessage('Valid verifier wallet address required'),
  body('rejection_reason').optional().isLength({ max: 500 }).withMessage('Rejection reason must be less than 500 characters')
], asyncHandler(async (req, res) => {
  const { record_id } = req.params;
  const { verification_status, verifier_wallet_address, rejection_reason } = req.body;

  try {
    // Check if verifier exists and has permission
    const verifier = await getRow(
      'SELECT id FROM users WHERE wallet_address = ? AND is_active = 1',
      [verifier_wallet_address]
    );

    if (!verifier) {
      return res.status(404).json({
        success: false,
        error: 'Verifier not found'
      });
    }

    // Get KYC record
    const kycRecord = await getRow(
      'SELECT kr.*, u.wallet_address as user_wallet_address FROM kyc_records kr JOIN users u ON kr.user_id = u.id WHERE kr.id = ?',
      [record_id]
    );

    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        error: 'KYC record not found'
      });
    }

    // Update KYC record
    const updateFields = ['verification_status = ?', 'verified_by = ?', 'verified_at = CURRENT_TIMESTAMP'];
    const updateValues = [verification_status, verifier_wallet_address];

    if (verification_status === 'rejected' && rejection_reason) {
      updateFields.push('rejection_reason = ?');
      updateValues.push(rejection_reason);
    }

    updateValues.push(record_id);

    await runQuery(
      `UPDATE kyc_records SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Update user KYC status
    const newKycStatus = verification_status === 'approved' ? 'verified' : 'rejected';
    await runQuery(
      'UPDATE users SET kyc_status = ?, kyc_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newKycStatus, kycRecord.user_id]
    );

    // Get updated KYC record
    const updatedRecord = await getRow(
      'SELECT * FROM kyc_records WHERE id = ?',
      [record_id]
    );

    logger.info('KYC verification completed:', { 
      recordId: record_id, 
      status: verification_status, 
      verifierId: verifier.id,
      userId: kycRecord.user_id
    });

    res.json({
      success: true,
      message: `KYC ${verification_status} successfully`,
      data: { kyc_record: updatedRecord }
    });
  } catch (error) {
    logger.error('KYC verification failed:', error);
    res.status(500).json({
      success: false,
      error: 'KYC verification failed'
    });
  }
}));

// @route   GET /api/kyc/pending
// @desc    Get pending KYC records (Admin/Verifier only)
// @access  Private
router.get('/pending', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    // Get total count of pending records
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM kyc_records WHERE verification_status = ?',
      ['pending']
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get pending KYC records with user info
    const pendingRecords = await getAllRows(
      `SELECT kr.*, u.wallet_address, u.username, u.first_name, u.last_name, u.email
       FROM kyc_records kr
       JOIN users u ON kr.user_id = u.id
       WHERE kr.verification_status = ?
       ORDER BY kr.created_at ASC
       LIMIT ? OFFSET ?`,
      ['pending', limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        pending_records: pendingRecords,
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
    logger.error('Get pending KYC records failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get pending KYC records'
    });
  }
}));

// @route   GET /api/kyc/verified
// @desc    Get verified KYC records
// @access  Public
router.get('/verified', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;

  try {
    // Get total count of verified records
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM kyc_records WHERE verification_status = ?',
      ['approved']
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get verified KYC records with user info
    const verifiedRecords = await getAllRows(
      `SELECT kr.*, u.wallet_address, u.username, u.first_name, u.last_name, u.email
       FROM kyc_records kr
       JOIN users u ON kr.user_id = u.id
       WHERE kr.verification_status = ?
       ORDER BY kr.verified_at DESC
       LIMIT ? OFFSET ?`,
      ['approved', limit, offset]
    );

    // Calculate pagination info
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.json({
      success: true,
      data: {
        verified_records: verifiedRecords,
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
    logger.error('Get verified KYC records failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get verified KYC records'
    });
  }
}));

// @route   DELETE /api/kyc/:record_id
// @desc    Delete KYC record (User can delete their own records)
// @access  Private
router.delete('/:record_id', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required')
], asyncHandler(async (req, res) => {
  const { record_id } = req.params;
  const { wallet_address } = req.body;

  try {
    // Get KYC record with user info
    const kycRecord = await getRow(
      'SELECT kr.*, u.wallet_address FROM kyc_records kr JOIN users u ON kr.user_id = u.id WHERE kr.id = ?',
      [record_id]
    );

    if (!kycRecord) {
      return res.status(404).json({
        success: false,
        error: 'KYC record not found'
      });
    }

    // Check if user owns this record
    if (kycRecord.wallet_address !== wallet_address) {
      return res.status(403).json({
        success: false,
        error: 'You can only delete your own KYC records'
      });
    }

    // Check if record is already verified
    if (kycRecord.verification_status === 'approved') {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete verified KYC records'
      });
    }

    // Delete KYC record
    await runQuery(
      'DELETE FROM kyc_records WHERE id = ?',
      [record_id]
    );

    // Update user KYC status back to pending if no other records exist
    const remainingRecords = await getRow(
      'SELECT COUNT(*) as count FROM kyc_records WHERE user_id = ?',
      [kycRecord.user_id]
    );

    if (remainingRecords.count === 0) {
      await runQuery(
        'UPDATE users SET kyc_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        ['pending', kycRecord.user_id]
      );
    }

    logger.info('KYC record deleted successfully:', { 
      recordId: record_id, 
      userId: kycRecord.user_id 
    });

    res.json({
      success: true,
      message: 'KYC record deleted successfully'
    });
  } catch (error) {
    logger.error('KYC record deletion failed:', error);
    res.status(500).json({
      success: false,
      error: 'KYC record deletion failed'
    });
  }
}));

module.exports = router;
