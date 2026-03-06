const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/placementDriveController');
const createCtrl = require('../controllers/createDriveController');
const studentDriveCtrl = require('../controllers/studentDriveController'); // ✅ add this
const { verifyToken, isTPO, isStudent } = require('../middlewares/authMiddleware');

// ✅ Static routes BEFORE dynamic /:id
router.get('/open',          verifyToken, isTPO,      ctrl.getOpenDrives);
router.get('/closed',        verifyToken, isTPO,      ctrl.getClosedDrives);
router.get('/eligible',      verifyToken, isStudent,  studentDriveCtrl.getEligibleDrives); // ✅ moved up + fixed controller

// ✅ Dynamic route AFTER static ones
router.get('/:id',           verifyToken, isTPO,      ctrl.getDriveById);

router.post('/',             verifyToken, isTPO,      createCtrl.createDrive);
router.put('/:id',           verifyToken, isTPO,      ctrl.updateDrive);
router.put('/:id/reopen',    verifyToken, isTPO,      ctrl.reopenDrive);
router.put('/:id/close',     verifyToken, isTPO,      ctrl.closeDrive);

module.exports = router;