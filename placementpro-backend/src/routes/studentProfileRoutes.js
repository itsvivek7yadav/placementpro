const express    = require('express');
const router     = express.Router();
const multer     = require('multer');
const path       = require('path');
const controller = require('../controllers/studentProfileController');
const { verifyToken } = require('../middlewares/authMiddleware');

// ── Multer setup for CV upload ─────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/cv/');   // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `cv_${req.user.user_id}_${Date.now()}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },   // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF/DOC/DOCX allowed'));
    }
  }
});

router.get('/',    verifyToken, controller.getProfile);
router.put('/',    verifyToken, upload.single('cv'), controller.updateProfile);

module.exports = router;
