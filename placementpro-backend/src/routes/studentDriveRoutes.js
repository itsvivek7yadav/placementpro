const express = require('express');
const router = express.Router();

const ctrl = require('../controllers/studentDriveController');
const { verifyToken, isStudent } = require('../middlewares/authMiddleware');

router.get('/eligible', verifyToken, isStudent, ctrl.getEligibleDrives);
router.get('/:id',      verifyToken, isStudent, ctrl.getDriveDetail); // ← new

module.exports = router;