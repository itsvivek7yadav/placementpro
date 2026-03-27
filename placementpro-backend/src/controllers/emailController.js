const fs = require("fs");
const csv = require("csv-parser");
const db = require("../config/db");

// Helper: upsert recruiter by email (email is UNIQUE in recruiters table)
const upsertRecruiter = async (email, name, company) => {

  const [result] = await db.query(`
    INSERT INTO recruiters (email, recruiter_name, company_name)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      recruiter_name = VALUES(recruiter_name),
      company_name   = VALUES(company_name)
  `, [email, name, company]);

  // insertId > 0 means new row was inserted
  if (result.insertId && result.insertId > 0) {
    return result.insertId;
  }

  // Duplicate — fetch existing recruiter_id by email
  const [rows] = await db.query(
    `SELECT recruiter_id FROM recruiters WHERE email = ?`,
    [email]
  );

  return rows[0].recruiter_id;

};

// POST /upload
// CSV columns: email, name, company
exports.uploadCampaign = async (req, res) => {

  try {

    const { campaignName, subject, emailBody } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "CSV file is required" });
    }

    if (!campaignName || !subject || !emailBody) {
      return res.status(400).json({ error: "Campaign name, subject and email body are required" });
    }

    // Step 1: parse CSV into memory
    const csvRows = await new Promise((resolve, reject) => {

      const rows = [];

      fs.createReadStream(req.file.path)
        .pipe(csv())
        .on("data", (row) => {
          if (row.email) {
            rows.push({
              email:   row.email.trim(),
              name:    row.name    || "Recruiter",
              company: row.company || "Company"
            });
          }
        })
        .on("end",   () => resolve(rows))
        .on("error", (err) => reject(err));

    });

    fs.unlinkSync(req.file.path);

    if (csvRows.length === 0) {
      return res.status(400).json({ error: "CSV has no valid rows. Ensure columns: email, name, company" });
    }

    // Step 2: create campaign — starts as in_progress immediately
    const [campaignResult] = await db.query(`
      INSERT INTO email_campaigns (campaign_name, subject, email_body, status)
      VALUES (?, ?, ?, 'in_progress')
    `, [campaignName, subject, emailBody]);

    const campaignId = campaignResult.insertId;

    // Step 3: upsert each recruiter and build queue rows
    const queueRows = [];

    for (const row of csvRows) {
      const recruiterId = await upsertRecruiter(row.email, row.name, row.company);
      queueRows.push([campaignId, recruiterId, row.email, "pending"]);
    }

    // Step 4: bulk insert into email_queue
    await db.query(`
      INSERT INTO email_queue (campaign_id, recruiter_id, email, status)
      VALUES ?
    `, [queueRows]);

    // Step 5: set total_recipients count on campaign
    await db.query(`
      UPDATE email_campaigns SET total_recipients = ? WHERE campaign_id = ?
    `, [queueRows.length, campaignId]);

    res.json({
      success: true,
      campaignId,
      recipientCount: queueRows.length
    });

  } catch (err) {
    console.error("uploadCampaign error:", err.message);
    res.status(500).json({ error: err.message });
  }

};

// GET /
// List all campaigns with stats
exports.getAllCampaigns = async (req, res) => {

  try {

    const [rows] = await db.query(`
      SELECT
        campaign_id,
        campaign_name,
        status,
        total_recipients,
        sent_count,
        failed_count,
        (total_recipients - sent_count - failed_count) AS pending_count,
        created_at
      FROM email_campaigns
      ORDER BY created_at DESC
    `);

    res.json({ campaigns: rows });

  } catch (err) {
    console.error("getAllCampaigns error:", err.message);
    res.status(500).json({ error: err.message });
  }

};

// GET /:campaignId
exports.getCampaignDetails = async (req, res) => {

  try {

    const id = req.params.campaignId;

    const [rows] = await db.query(`
      SELECT
        c.campaign_id,
        c.campaign_name,
        c.subject,
        c.status,
        c.total_recipients,
        c.sent_count,
        c.failed_count,
        (c.total_recipients - c.sent_count - c.failed_count) AS pending_count,
        c.created_at
      FROM email_campaigns c
      WHERE c.campaign_id = ?
    `, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Campaign not found" });
    }

    res.json({ data: rows[0] });

  } catch (err) {
    console.error("getCampaignDetails error:", err.message);
    res.status(500).json({ error: err.message });
  }

};

// GET /:campaignId/emails
exports.getCampaignEmails = async (req, res) => {

  try {

    const id = req.params.campaignId;

    const [rows] = await db.query(`
      SELECT
        q.queue_id,
        q.email,
        r.recruiter_name,
        r.company_name,
        q.status,
        q.sent_at,
        q.response_message,
        q.attempt_count
      FROM email_queue q
      LEFT JOIN recruiters r ON q.recruiter_id = r.recruiter_id
      WHERE q.campaign_id = ?
      ORDER BY q.queue_id DESC
    `, [id]);

    res.json({ emails: rows });

  } catch (err) {
    console.error("getCampaignEmails error:", err.message);
    res.status(500).json({ error: err.message });
  }

};