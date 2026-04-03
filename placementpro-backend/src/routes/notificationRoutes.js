const express = require('express');
const router = express.Router();
const controller = require('../controllers/notificationController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, controller.getNotifications);
router.patch('/read-all', verifyToken, controller.markAllNotificationsRead);
router.patch('/:id/read', verifyToken, controller.markNotificationRead);
router.post('/', verifyToken, isTPO, controller.sendDriveNotification);

module.exports = router;
