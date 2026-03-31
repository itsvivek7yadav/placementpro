const express = require('express');

const router = express.Router();
const controller = require('../controllers/placementReportController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

router.get('/tpo', verifyToken, isTPO, controller.getTpoPlacementReport);

module.exports = router;
