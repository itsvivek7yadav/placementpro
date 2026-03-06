const express = require('express');
const router = express.Router();

const controller = require('../controllers/applicationController');
const { verifyToken } = require('../middlewares/authMiddleware');

// POST   /api/student/applications/apply              → apply to a drive
router.post('/apply', verifyToken, controller.applyToDrive);

// GET    /api/student/applications/my                 → my applications
router.get('/my', verifyToken, controller.getMyApplications);

// DELETE /api/student/applications/withdraw/:id       → withdraw application
router.delete('/withdraw/:application_id', verifyToken, controller.withdrawApplication);

module.exports = router;