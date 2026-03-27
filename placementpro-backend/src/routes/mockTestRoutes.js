const express  = require('express');
const router   = express.Router();
const multer   = require('multer');

const testCtrl   = require('../controllers/mockTestController');
const qCtrl      = require('../controllers/mockTestQuestionController');
const resultCtrl = require('../controllers/testResultController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

const upload = multer({ storage: multer.memoryStorage() });

router.get('/',                verifyToken, isTPO, testCtrl.getAllTests);
router.post('/',               verifyToken, isTPO, testCtrl.createTest);
router.get('/:id',             verifyToken, isTPO, testCtrl.getTestById);
router.put('/:id/publish',     verifyToken, isTPO, testCtrl.publishTest);
router.put('/:id/close',       verifyToken, isTPO, testCtrl.closeTest);
router.delete('/:id',          verifyToken, isTPO, testCtrl.deleteTest);

router.get('/:test_id/questions',                    verifyToken, isTPO, qCtrl.getQuestions);
router.post('/:test_id/upload-questions', upload.single('file'), verifyToken, isTPO, qCtrl.uploadQuestions);

router.get('/:test_id/results', verifyToken, isTPO, resultCtrl.getTestResults);

module.exports = router;