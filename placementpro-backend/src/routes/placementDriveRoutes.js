const express = require('express');
const router = express.Router();
const fs = require('fs');
const multer = require('multer');
const path = require('path');
const ctrl = require('../controllers/placementDriveController');
const createCtrl = require('../controllers/createDriveController');
const studentDriveCtrl = require('../controllers/studentDriveController'); // ✅ add this
const { verifyToken, isTPO, isStudent } = require('../middlewares/authMiddleware');

const driveDocumentsDir = path.join(process.cwd(), 'uploads', 'drive-documents');
fs.mkdirSync(driveDocumentsDir, { recursive: true });

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, driveDocumentsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40);
    cb(null, `drive_${req.user.user_id}_${Date.now()}_${safeBase}${ext}`);
  }
});

const driveDocumentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, DOCX, PPT, and PPTX files are allowed'));
    }
  }
});

// ✅ Static routes BEFORE dynamic /:id
router.get('/open',          verifyToken, isTPO,      ctrl.getOpenDrives);
router.get('/closed',        verifyToken, isTPO,      ctrl.getClosedDrives);
router.get('/eligible',      verifyToken, isStudent,  studentDriveCtrl.getEligibleDrives); // ✅ moved up + fixed controller

// ✅ Dynamic route AFTER static ones
router.get('/:id',           verifyToken, isTPO,      ctrl.getDriveById);

router.post('/',             verifyToken, isTPO,      driveDocumentUpload.single('drive_document'), createCtrl.createDrive);
router.put('/:id',           verifyToken, isTPO,      driveDocumentUpload.single('drive_document'), ctrl.updateDrive);
router.put('/:id/reopen',    verifyToken, isTPO,      driveDocumentUpload.single('drive_document'), ctrl.reopenDrive);
router.put('/:id/close',     verifyToken, isTPO,      ctrl.closeDrive);

module.exports = router;
