const cron = require('node-cron');
const db   = require('../config/db');

// Runs every 5 minutes — auto-closes drives past deadline
cron.schedule('*/5 * * * *', async () => {
  try {
    const [result] = await db.query(
      `UPDATE placement_drives
       SET status = 'CLOSED', closed_at = NOW(), close_type = 'AUTO'
       WHERE status = 'LIVE'
         AND application_deadline < NOW()`
    );
    if (result.affectedRows > 0) {
      console.log(`⏰ Auto-closed ${result.affectedRows} expired drive(s)`);
    }
  } catch (err) {
    console.error('Cron Error:', err);
  }
});