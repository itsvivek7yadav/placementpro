const cron = require("node-cron");
const db = require("../config/db");
const sendEmail = require("../services/emailService");

console.log("📧 Email worker started");

cron.schedule("*/1 * * * *", async () => {

  console.log("📨 Checking email queue...");

  const [emails] = await db.query(`
    SELECT
      q.queue_id,
      q.email,
      q.campaign_id,
      c.subject,
      c.email_body AS body
    FROM email_queue q
    JOIN email_campaigns c ON q.campaign_id = c.campaign_id
    WHERE q.status = 'pending'
      AND c.status = 'in_progress'
    LIMIT 5
  `);

  console.log("Emails found:", emails.length);

  for (const e of emails) {

    try {

      await sendEmail(e);

      console.log("✅ Sent:", e.email);

      await db.query(`
        UPDATE email_queue
        SET status = 'sent',
            sent_at = NOW(),
            attempt_count = attempt_count + 1,
            last_attempt = NOW()
        WHERE queue_id = ?
      `, [e.queue_id]);

      await db.query(`
        UPDATE email_campaigns
        SET sent_count = sent_count + 1
        WHERE campaign_id = ?
      `, [e.campaign_id]);

    } catch (err) {

      console.log("❌ Failed:", e.email, err.message);

      await db.query(`
        UPDATE email_queue
        SET status = 'failed',
            response_message = ?,
            attempt_count = attempt_count + 1,
            last_attempt = NOW()
        WHERE queue_id = ?
      `, [err.message, e.queue_id]);

      await db.query(`
        UPDATE email_campaigns
        SET failed_count = failed_count + 1
        WHERE campaign_id = ?
      `, [e.campaign_id]);

    }

    await new Promise(r => setTimeout(r, 3000));

  }

  // Mark campaign completed when no pending emails remain
  await db.query(`
    UPDATE email_campaigns
    SET status = 'completed'
    WHERE status = 'in_progress'
      AND campaign_id NOT IN (
        SELECT DISTINCT campaign_id FROM email_queue WHERE status = 'pending'
      )
  `);

});