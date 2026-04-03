const db = require('../config/db');
const { notifyDriveAudience } = require('../services/notificationService');

function toPositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.user_id;
    const page = toPositiveInt(req.query.page, 1);
    const limit = Math.min(toPositiveInt(req.query.limit, 20), 100);
    const offset = (page - 1) * limit;

    const [[[countRow]], [[unreadRow]], [notifications]] = await Promise.all([
      db.query(`SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?`, [userId]),
      db.query(`SELECT COUNT(*) AS unreadCount FROM notifications WHERE user_id = ? AND is_read = 0`, [userId]),
      db.query(
        `SELECT
            id,
            user_id,
            title,
            message,
            type,
            related_drive_id,
            related_application_id,
            link,
            is_read,
            created_at,
            read_at
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT ? OFFSET ?`,
        [userId, limit, offset]
      )
    ]);

    res.json({
      notifications,
      unreadCount: unreadRow.unreadCount || 0,
      pagination: {
        page,
        limit,
        total: countRow.total || 0,
        hasMore: offset + notifications.length < (countRow.total || 0)
      }
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const notificationId = Number(req.params.id);
    const userId = req.user.user_id;

    if (!notificationId) {
      return res.status(400).json({ message: 'Valid notification id is required' });
    }

    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = 1, read_at = COALESCE(read_at, NOW())
       WHERE id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark Notification Read Error:', error);
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

exports.markAllNotificationsRead = async (req, res) => {
  try {
    const userId = req.user.user_id;

    const [result] = await db.query(
      `UPDATE notifications
       SET is_read = 1, read_at = COALESCE(read_at, NOW())
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({
      message: 'All notifications marked as read',
      updated: result.affectedRows || 0
    });
  } catch (error) {
    console.error('Mark All Notifications Read Error:', error);
    res.status(500).json({ message: 'Failed to update notifications', error: error.message });
  }
};

exports.sendDriveNotification = async (req, res) => {
  try {
    const driveId = Number(req.body?.driveId);
    const audience = String(req.body?.audience || 'APPLICANTS').toUpperCase();
    const title = String(req.body?.title || '').trim();
    const message = String(req.body?.message || '').trim();
    const link = req.body?.link ? String(req.body.link).trim() : null;

    if (!driveId) {
      return res.status(400).json({ message: 'Valid driveId is required' });
    }

    if (!['APPLICANTS', 'ELIGIBLE'].includes(audience)) {
      return res.status(400).json({ message: 'audience must be APPLICANTS or ELIGIBLE' });
    }

    if (!title || !message) {
      return res.status(400).json({ message: 'title and message are required' });
    }

    const result = await notifyDriveAudience({ driveId, audience, title, message, link });

    res.status(201).json({
      message: 'Notification sent successfully',
      audience,
      created: result.created
    });
  } catch (error) {
    console.error('Send Drive Notification Error:', error);
    res.status(500).json({ message: 'Failed to send notification', error: error.message });
  }
};
