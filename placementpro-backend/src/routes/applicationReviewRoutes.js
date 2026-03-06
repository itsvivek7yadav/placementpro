const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/applicationReviewController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

// Get all applicants for a drive
router.get('/drive/:drive_id',            verifyToken, isTPO, controller.getApplicationsByDrive);

// Update single result (editable anytime)
router.patch('/:application_id/result',   verifyToken, isTPO, controller.updateApplicationResult);

// Bulk update all PENDING for a drive
router.patch('/bulk-result',              verifyToken, isTPO, controller.bulkUpdateResult);

module.exports = router;