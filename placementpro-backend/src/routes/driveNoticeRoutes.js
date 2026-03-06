const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/applicationReviewController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

// Send notice to drive applicants
router.post('/:drive_id/notice', verifyToken, isTPO, controller.sendNotice);

module.exports = router;
