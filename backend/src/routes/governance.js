const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { asyncHandler } = require('../middleware/errorHandler');
const { getRow, runQuery, getAllRows } = require('../database/connection');
const { logger } = require('../utils/logger');

const router = express.Router();

// @route   POST /api/governance/proposals
// @desc    Create a new governance proposal
// @access  Private
router.post('/proposals', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('title').isLength({ min: 5, max: 200 }).withMessage('Title must be between 5 and 200 characters'),
  body('description').isLength({ min: 20, max: 2000 }).withMessage('Description must be between 20 and 2000 characters'),
  body('proposal_type').isIn(['PROPERTY_UPDATE', 'PLATFORM_FEE', 'GOVERNANCE_PARAMS', 'EMERGENCY', 'OTHER']).withMessage('Valid proposal type required'),
  body('blockchain_proposal_id').notEmpty().withMessage('Blockchain proposal ID required'),
  body('voting_start').isISO8601().withMessage('Valid voting start date required'),
  body('voting_end').isISO8601().withMessage('Valid voting end date required'),
  body('quorum_required').isInt({ min: 1, max: 100 }).withMessage('Quorum must be between 1 and 100')
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
    title,
    description,
    proposal_type,
    blockchain_proposal_id,
    voting_start,
    voting_end,
    quorum_required
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
        error: 'KYC verification required to create proposals'
      });
    }

    // Check if blockchain proposal ID already exists
    const existingProposal = await getRow(
      'SELECT id FROM governance_proposals WHERE blockchain_proposal_id = ?',
      [blockchain_proposal_id]
    );

    if (existingProposal) {
      return res.status(400).json({
        success: false,
        error: 'Proposal with this blockchain ID already exists'
      });
    }

    // Validate voting dates
    const startDate = new Date(voting_start);
    const endDate = new Date(voting_end);
    const now = new Date();

    if (startDate <= now) {
      return res.status(400).json({
        success: false,
        error: 'Voting start date must be in the future'
      });
    }

    if (endDate <= startDate) {
      return res.status(400).json({
        success: false,
        error: 'Voting end date must be after voting start date'
      });
    }

    // Create proposal
    const result = await runQuery(
      `INSERT INTO governance_proposals (
        blockchain_proposal_id, title, description, proposer_id, proposal_type,
        voting_start, voting_end, quorum_required
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [blockchain_proposal_id, title, description, user.id, proposal_type, voting_start, voting_end, quorum_required]
    );

    // Get the created proposal
    const newProposal = await getRow(
      `SELECT gp.*, u.wallet_address as proposer_wallet_address, u.username as proposer_username
       FROM governance_proposals gp
       JOIN users u ON gp.proposer_id = u.id
       WHERE gp.id = ?`,
      [result.id]
    );

    logger.info('Governance proposal created successfully:', { 
      proposalId: result.id, 
      proposerId: user.id,
      blockchainProposalId: blockchain_proposal_id
    });

    res.status(201).json({
      success: true,
      message: 'Governance proposal created successfully',
      data: { proposal: newProposal }
    });
  } catch (error) {
    logger.error('Governance proposal creation failed:', error);
    res.status(500).json({
      success: false,
      error: 'Governance proposal creation failed'
    });
  }
}));

// @route   GET /api/governance/proposals
// @desc    Get all governance proposals with filtering and pagination
// @access  Public
router.get('/proposals', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('proposal_type').optional().isIn(['PROPERTY_UPDATE', 'PLATFORM_FEE', 'GOVERNANCE_PARAMS', 'EMERGENCY', 'OTHER']).withMessage('Valid proposal type required'),
  query('proposal_status').optional().isIn(['active', 'passed', 'failed', 'executed', 'expired']).withMessage('Valid proposal status required')
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
    proposal_type,
    proposal_status
  } = req.query;

  try {
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];

    if (proposal_type) {
      whereClause += ' AND gp.proposal_type = ?';
      params.push(proposal_type);
    }

    if (proposal_status) {
      whereClause += ' AND gp.proposal_status = ?';
      params.push(proposal_status);
    }

    // Get total count
    const countResult = await getRow(
      `SELECT COUNT(*) as total FROM governance_proposals gp ${whereClause}`,
      params
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get proposals with pagination
    const proposals = await getAllRows(
      `SELECT gp.*, u.wallet_address as proposer_wallet_address, u.username as proposer_username
       FROM governance_proposals gp
       JOIN users u ON gp.proposer_id = u.id
       ${whereClause}
       ORDER BY gp.created_at DESC
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
        proposals,
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
    logger.error('Get governance proposals failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get governance proposals'
    });
  }
}));

// @route   GET /api/governance/proposals/:id
// @desc    Get governance proposal by ID
// @access  Public
router.get('/proposals/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  try {
    const proposal = await getRow(
      `SELECT gp.*, u.wallet_address as proposer_wallet_address, u.username as proposer_username,
              u.first_name as proposer_first_name, u.last_name as proposer_last_name
       FROM governance_proposals gp
       JOIN users u ON gp.proposer_id = u.id
       WHERE gp.id = ?`,
      [id]
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    res.json({
      success: true,
      data: { proposal }
    });
  } catch (error) {
    logger.error('Get governance proposal failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get governance proposal'
    });
  }
}));

// @route   POST /api/governance/vote
// @desc    Cast a vote on a governance proposal
// @access  Private
router.post('/vote', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('proposal_id').isInt({ min: 1 }).withMessage('Valid proposal ID required'),
  body('vote_choice').isIn(['for', 'against', 'abstain']).withMessage('Valid vote choice required'),
  body('voting_power').isInt({ min: 1 }).withMessage('Voting power must be at least 1')
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
    proposal_id,
    vote_choice,
    voting_power
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
        error: 'KYC verification required to vote'
      });
    }

    // Check if proposal exists and is active
    const proposal = await getRow(
      'SELECT * FROM governance_proposals WHERE id = ? AND proposal_status = ?',
      [proposal_id, 'active']
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found or not active'
      });
    }

    // Check if voting period is open
    const now = new Date();
    const votingStart = new Date(proposal.voting_start);
    const votingEnd = new Date(proposal.voting_end);

    if (now < votingStart || now > votingEnd) {
      return res.status(400).json({
        success: false,
        error: 'Voting period is not open'
      });
    }

    // Check if user has already voted
    const existingVote = await getRow(
      'SELECT id FROM user_votes WHERE user_id = ? AND proposal_id = ?',
      [user.id, proposal_id]
    );

    if (existingVote) {
      return res.status(400).json({
        success: false,
        error: 'User has already voted on this proposal'
      });
    }

    // Create vote
    const voteResult = await runQuery(
      'INSERT INTO user_votes (user_id, proposal_id, vote_choice, voting_power) VALUES (?, ?, ?, ?)',
      [user.id, proposal_id, vote_choice, voting_power]
    );

    // Update proposal vote counts
    const updateFields = [];
    const updateValues = [];

    if (vote_choice === 'for') {
      updateFields.push('votes_for = votes_for + ?');
      updateValues.push(voting_power);
    } else if (vote_choice === 'against') {
      updateFields.push('votes_against = votes_against + ?');
      updateValues.push(voting_power);
    } else if (vote_choice === 'abstain') {
      updateFields.push('votes_abstain = votes_abstain + ?');
      updateValues.push(voting_power);
    }

    updateValues.push(proposal_id);

    await runQuery(
      `UPDATE governance_proposals SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated proposal
    const updatedProposal = await getRow(
      'SELECT * FROM governance_proposals WHERE id = ?',
      [proposal_id]
    );

    logger.info('Vote cast successfully:', { 
      voteId: voteResult.id, 
      userId: user.id,
      proposalId: proposal_id,
      voteChoice: vote_choice,
      votingPower: voting_power
    });

    res.json({
      success: true,
      message: 'Vote cast successfully',
      data: {
        vote_id: voteResult.id,
        proposal: updatedProposal
      }
    });
  } catch (error) {
    logger.error('Vote casting failed:', error);
    res.status(500).json({
      success: false,
      error: 'Vote casting failed'
    });
  }
}));

// @route   GET /api/governance/proposals/:id/votes
// @desc    Get all votes for a specific proposal
// @access  Public
router.get('/proposals/:id/votes', [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { page = 1, limit = 10 } = req.query;

  try {
    // Check if proposal exists
    const proposal = await getRow(
      'SELECT id FROM governance_proposals WHERE id = ?',
      [id]
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
      });
    }

    // Get total count of votes
    const countResult = await getRow(
      'SELECT COUNT(*) as total FROM user_votes WHERE proposal_id = ?',
      [id]
    );

    const total = countResult.total;
    const offset = (page - 1) * limit;

    // Get votes with user info
    const votes = await getAllRows(
      `SELECT uv.*, u.wallet_address, u.username, u.first_name, u.last_name
       FROM user_votes uv
       JOIN users u ON uv.user_id = u.id
       WHERE uv.proposal_id = ?
       ORDER BY uv.voted_at DESC
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
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
    logger.error('Get proposal votes failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get proposal votes'
    });
  }
}));

// @route   PUT /api/governance/proposals/:id/status
// @desc    Update proposal status (Admin/Governance only)
// @access  Private
router.put('/proposals/:id/status', [
  body('wallet_address').isEthereumAddress().withMessage('Valid wallet address required'),
  body('new_status').isIn(['active', 'passed', 'failed', 'executed', 'expired']).withMessage('Valid status required'),
  body('executed_at').optional().isISO8601().withMessage('Valid execution date required')
], asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { wallet_address, new_status, executed_at } = req.body;

  try {
    // Check if proposal exists
    const proposal = await getRow(
      'SELECT * FROM governance_proposals WHERE id = ?',
      [id]
    );

    if (!proposal) {
      return res.status(404).json({
        success: false,
        error: 'Proposal not found'
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

    // Update proposal status
    const updateFields = ['proposal_status = ?', 'updated_at = CURRENT_TIMESTAMP'];
    const updateValues = [new_status];

    if (new_status === 'executed' && executed_at) {
      updateFields.push('executed_at = ?');
      updateValues.push(executed_at);
    }

    updateValues.push(id);

    await runQuery(
      `UPDATE governance_proposals SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // Get updated proposal
    const updatedProposal = await getRow(
      'SELECT * FROM governance_proposals WHERE id = ?',
      [id]
    );

    logger.info('Proposal status updated successfully:', { 
      proposalId: id, 
      newStatus: new_status,
      updatedBy: user.id
    });

    res.json({
      success: true,
      message: 'Proposal status updated successfully',
      data: { proposal: updatedProposal }
    });
  } catch (error) {
    logger.error('Proposal status update failed:', error);
    res.status(500).json({
      success: false,
      error: 'Proposal status update failed'
    });
  }
}));

// @route   GET /api/governance/stats
// @desc    Get governance statistics
// @access  Public
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    // Get total proposals count
    const totalProposals = await getRow(
      'SELECT COUNT(*) as total FROM governance_proposals'
    );

    // Get active proposals count
    const activeProposals = await getRow(
      'SELECT COUNT(*) as total FROM governance_proposals WHERE proposal_status = ?',
      ['active']
    );

    // Get passed proposals count
    const passedProposals = await getRow(
      'SELECT COUNT(*) as total FROM governance_proposals WHERE proposal_status = ?',
      ['passed']
    );

    // Get total votes count
    const totalVotes = await getRow(
      'SELECT COUNT(*) as total FROM user_votes'
    );

    // Get total voting power
    const totalVotingPower = await getRow(
      'SELECT SUM(voting_power) as total FROM user_votes'
    );

    // Get recent proposals
    const recentProposals = await getAllRows(
      `SELECT gp.id, gp.title, gp.proposal_type, gp.proposal_status, gp.created_at,
              u.username as proposer_username
       FROM governance_proposals gp
       JOIN users u ON gp.proposer_id = u.id
       ORDER BY gp.created_at DESC
       LIMIT 5`
    );

    res.json({
      success: true,
      data: {
        total_proposals: totalProposals.total,
        active_proposals: activeProposals.total,
        passed_proposals: passedProposals.total,
        total_votes: totalVotes.total,
        total_voting_power: totalVotingPower.total || 0,
        recent_proposals: recentProposals
      }
    });
  } catch (error) {
    logger.error('Get governance stats failed:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get governance stats'
    });
  }
}));

module.exports = router;
