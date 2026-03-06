const db = require('../config/db');

// ── Get all applications for a drive ──────────────────────
exports.getApplicationsByDrive = async (req, res) => {
  try {
    const { drive_id } = req.params;

    const [applications] = await db.query(
  `SELECT
      a.application_id,
      a.status,
      a.result,
      a.notification,
      a.applied_at,
      u.name          AS student_name,
      u.email         AS student_email,
      s.student_id,
      s.prn,
      s.program_name,
      s.program_batch,
      s.cgpa,
      s.placement_status,
      s.personal_email,
      s.phone_number,
      s.gender,
      s.ug_course_name,
      s.ug_specialization,
      s.ug_percentage,
      s.sicsr_program_name  AS pg_degree,
      s.sicsr_specialization AS pg_specialization,
      s.sem3_gpa            AS pg_percentage,
      s.backlog,
      s.state               AS native_state
   FROM applications a
   JOIN students s ON a.student_id = s.student_id
   JOIN users u    ON s.user_id = u.user_id
   WHERE a.drive_id = ?
   ORDER BY a.applied_at ASC`,
  [drive_id]
);

    res.json({ applications });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch applications' });
  }
};

// ── Update single application result (editable anytime) ───
exports.updateApplicationResult = async (req, res) => {
  try {
    const { application_id } = req.params;
    const { result } = req.body;

    if (!['SELECTED', 'REJECTED'].includes(result)) {
      return res.status(400).json({ message: 'result must be SELECTED or REJECTED' });
    }

    const [rows] = await db.query(
      `SELECT application_id FROM applications WHERE application_id = ?`,
      [application_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    await db.query(
      `UPDATE applications SET result = ? WHERE application_id = ?`,
      [result, application_id]
    );

    res.json({ message: `Result updated to ${result}` });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update result', error: err.message });
  }
};

// ── Bulk update all PENDING applications for a drive ──────
exports.bulkUpdateResult = async (req, res) => {
  try {
    const { drive_id, result } = req.body;

    if (!drive_id || !['SELECTED', 'REJECTED'].includes(result)) {
      return res.status(400).json({ message: 'drive_id and valid result required' });
    }

    const [updateResult] = await db.query(
      `UPDATE applications
       SET result = ?
       WHERE drive_id = ? AND result = 'PENDING'`,
      [result, drive_id]
    );

    res.json({
      message: `${updateResult.affectedRows} application(s) marked as ${result}`,
      affected: updateResult.affectedRows
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Bulk update failed', error: err.message });
  }
};