const express = require('express');
const router = express.Router();
const resumeController = require('../controllers/resumeController');
const { verifyToken, isStudent } = require('../middlewares/authMiddleware');

router.get('/student-data', verifyToken, isStudent, resumeController.getStudentData);
router.get('/list', verifyToken, isStudent, resumeController.getStudentResumes);
router.get('/:id', verifyToken, isStudent, resumeController.getResume);
router.post('/save', verifyToken, isStudent, resumeController.saveResume);
router.post('/generate-pdf', verifyToken, isStudent, resumeController.generateAndDownloadPDF);
router.delete('/:id', verifyToken, isStudent, resumeController.deleteResume);

module.exports = router;