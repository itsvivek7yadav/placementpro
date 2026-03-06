const express = require('express');
const router = express.Router();

const studentController = require('../controllers/studentController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');


// 👨‍💼 TPO — Get all students
router.get(
  '/',
  verifyToken,
  isTPO,
  studentController.getAllStudents
);

module.exports = router;