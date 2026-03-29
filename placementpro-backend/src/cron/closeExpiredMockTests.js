const cron = require('node-cron');
const db = require('../config/db');

cron.schedule('* * * * *', async () => {
  try {
    const [result] = await db.query(
      `UPDATE mock_tests
       SET status = 'CLOSED'
       WHERE status = 'LIVE'
         AND end_time <= NOW()`
    );

    if (result.affectedRows > 0) {
      console.log(`✅ Auto-closed ${result.affectedRows} mock test(s)`);
    }
  } catch (err) {
    console.error('Mock Test Cron Error:', err);
  }
});
