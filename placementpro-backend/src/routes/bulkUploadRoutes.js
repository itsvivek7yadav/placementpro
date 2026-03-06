const express = require('express');
const router = express.Router();

const upload = require('../middlewares/uploadMiddleware');
const { uploadStudents } = require('../controllers/bulkUploadController');

router.post('/students', upload.single('file'), uploadStudents);

module.exports = router;