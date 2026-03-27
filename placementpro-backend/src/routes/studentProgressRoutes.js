const express = require('express');
const router = express.Router();

const controller = require('../controllers/studentProgressController');
const { verifyToken, isStudent, isTPO } = require('../middlewares/authMiddleware');

router.get('/me', verifyToken, isStudent, controller.getMyProgress);
router.get('/:student_id', verifyToken, isTPO, controller.getStudentProgressById);
router.patch('/:student_id/placement-status', verifyToken, isTPO, controller.updatePlacementStatus);

module.exports = router;
