const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/studentTestController');
const { verifyToken, isStudent } = require('../middlewares/authMiddleware');

router.get('/',                 verifyToken, isStudent, ctrl.getMyTests);
router.get('/:test_id/start',   verifyToken, isStudent, ctrl.startTest);
router.post('/:test_id/submit', verifyToken, isStudent, ctrl.submitTest);

module.exports = router;