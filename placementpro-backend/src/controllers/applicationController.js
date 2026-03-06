const db = require('../config/db');

/**
 * 🎓 STUDENT — Apply to a drive
 * POST /api/student/applications/apply
 */
exports.applyToDrive = async (req, res) => {
  try {
    const { drive_id } = req.body;

    if (!drive_id) {
      return res.status(400).json({ message: 'drive_id is required' });
    }

    // Get student
    const [studentRows] = await db.query(
      `SELECT student_id, program_name, program_batch, placement_status, cgpa
       FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const student = studentRows[0];

    if (student.placement_status === 'PLACED') {
      return res.status(403).json({ message: 'Already placed students cannot apply' });
    }

    // Get drive
    const [driveRows] = await db.query(
      `SELECT * FROM placement_drives WHERE drive_id = ?`,
      [drive_id]
    );

    if (driveRows.length === 0) {
      return res.status(404).json({ message: 'Drive not found' });
    }

    const drive = driveRows[0];

    if (drive.status !== 'LIVE') {
      return res.status(403).json({ message: 'Drive is not live' });
    }

    if (new Date(drive.application_deadline) < new Date()) {
      return res.status(403).json({ message: 'Application deadline has passed' });
    }

    // Check program eligibility
    const [programMatch] = await db.query(
      `SELECT 1
       FROM drive_program_mapping dpm
       JOIN programs p ON p.program_id = dpm.program_id
       WHERE dpm.drive_id = ?
         AND p.program_name = ?`,
      [drive_id, student.program_name]
    );

    if (programMatch.length === 0) {
      return res.status(403).json({ message: 'Your program is not eligible for this drive' });
    }

    if (drive.eligible_batch !== student.program_batch) {
      return res.status(403).json({ message: 'Your batch is not eligible for this drive' });
    }

    if (drive.min_cgpa && student.cgpa < drive.min_cgpa) {
      return res.status(403).json({ message: `Minimum CGPA required is ${drive.min_cgpa}` });
    }

    // Duplicate check
    const [existing] = await db.query(
      `SELECT application_id FROM applications
       WHERE student_id = ? AND drive_id = ?`,
      [student.student_id, drive_id]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: 'You have already applied to this drive' });
    }

    // Insert application
    const [result] = await db.query(
      `INSERT INTO applications (student_id, drive_id, status, result)
       VALUES (?, ?, 'APPLIED', 'PENDING')`,
      [student.student_id, drive_id]
    );

    res.status(201).json({
      message: 'Applied successfully',
      application_id: result.insertId
    });

  } catch (err) {
    console.error('Apply To Drive Error:', err);
    res.status(500).json({ message: 'Apply failed', error: err.message });
  }
};

/**
 * 🎓 STUDENT — Get my applications
 * GET /api/student/applications/my
 */
exports.getMyApplications = async (req, res) => {
  try {
    const [studentRows] = await db.query(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const student = studentRows[0];

    const [applications] = await db.query(
      `SELECT
         a.application_id,
         a.status,
         a.result,
         a.notification,
         a.applied_at,
         pd.drive_id,
         pd.company_name,
         pd.job_role,
         pd.job_type,
         pd.ctc,
         pd.application_deadline,
         pd.status  AS drive_status
       FROM applications a
       JOIN placement_drives pd ON pd.drive_id = a.drive_id
       WHERE a.student_id = ?
       ORDER BY a.applied_at DESC`,
      [student.student_id]
    );

    res.json({ applications });

  } catch (err) {
    console.error('Get My Applications Error:', err);
    res.status(500).json({ message: 'Failed to fetch applications', error: err.message });
  }
};

/**
 * 🎓 STUDENT — Withdraw application
 * DELETE /api/student/applications/withdraw/:application_id
 */
exports.withdrawApplication = async (req, res) => {
  try {
    const { application_id } = req.params;

    const [studentRows] = await db.query(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const student = studentRows[0];

    // Verify ownership and drive is still LIVE
    const [rows] = await db.query(
      `SELECT a.application_id, pd.status AS drive_status
       FROM applications a
       JOIN placement_drives pd ON pd.drive_id = a.drive_id
       WHERE a.application_id = ? AND a.student_id = ?`,
      [application_id, student.student_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (rows[0].drive_status !== 'LIVE') {
      return res.status(400).json({ message: 'Cannot withdraw from a closed drive' });
    }

    await db.query(
      `DELETE FROM applications WHERE application_id = ?`,
      [application_id]
    );

    res.json({ message: 'Application withdrawn successfully' });

  } catch (err) {
    console.error('Withdraw Application Error:', err);
    res.status(500).json({ message: 'Failed to withdraw', error: err.message });
  }
};