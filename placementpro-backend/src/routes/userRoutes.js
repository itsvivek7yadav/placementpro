const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

router.post(
    '/create-student',
    verifyToken,
    isTPO,
    userController.createStudent
);

module.exports = router;