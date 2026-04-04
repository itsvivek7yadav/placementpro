/**
 * routes/offCampusRoutes.js
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/offCampusController');
const jwt        = require('jsonwebtoken');
const { verifyToken } = require('../middlewares/authMiddleware');

const optionalAuth = (req, _res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (!err && decoded) {
      req.user = decoded;
    }
    next();
  });
};

// Jobs
router.get('/jobs',     optionalAuth, controller.getJobs);
router.get('/jobs/:id', optionalAuth, controller.getJobById);

// Bookmark toggle
router.post('/bookmark', verifyToken, controller.toggleBookmark);

// ── NEW: Get all bookmarks for logged-in user ─────────────────────────────────
router.get('/bookmarks', verifyToken, controller.getUserBookmarks);

// Recommendations
router.get('/recommend', verifyToken, controller.getRecommendations);

module.exports = router;
