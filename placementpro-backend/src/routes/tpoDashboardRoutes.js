const express = require('express');
const router = express.Router();

const controller = require('../controllers/tpoDashboardController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

/**
 * GET /api/tpo-dashboard/stats
 * Only accessible by TPO
 */
router.get(
  '/stats',
  verifyToken,
  isTPO,
  controller.getDashboardStats
);

module.exports = router;