/**
 * cron/cleanupExpiredOpportunities.js
 * Runs daily at 3 AM - deletes expired jobs NOT bookmarked
 */

const cron = require('node-cron');
const OffCampusJobModel  = require('../models/offCampusJobModel');

/**
 * Execute cleanup: removes expired, non-bookmarked records
 */
async function runCleanup() {
  console.log(`[CleanupJob] ===== Starting cleanup at ${new Date().toISOString()} =====`);

  let jobsDeleted = 0;

  try {
    jobsDeleted = await OffCampusJobModel.deleteExpiredUnbookmarkedJobs();
    console.log(`[CleanupJob] Deleted ${jobsDeleted} expired jobs`);
  } catch (err) {
    console.error('[CleanupJob] Job cleanup error:', err.message);
  }

  console.log(`[CleanupJob] ===== Cleanup complete. Jobs: ${jobsDeleted} =====`);
  return { jobsDeleted };
}

/**
 * Schedule: daily at 3:00 AM IST
 */
function startCleanupJob() {
  console.log('[CleanupJob] Scheduling cleanup cron (daily 3 AM IST)...');

  const job = cron.schedule('0 3 * * *', async () => {
    try {
      await runCleanup();
    } catch (err) {
      console.error('[CleanupJob] Unhandled cron error:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('[CleanupJob] Cleanup cron started.');
  return job;
}

module.exports = { startCleanupJob, runCleanup };
