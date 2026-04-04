const db = require('../config/db');
const { notifyApplicationSubmitted } = require('../services/notificationService');

async function attachRoundDetails(applications) {
  if (!applications.length) {
    return applications;
  }

  const applicationIds = applications.map((application) => application.application_id);
  const placeholders = applicationIds.map(() => '?').join(', ');

  const [roundRows] = await db.query(
    `SELECT
        ars.application_id,
        ars.round_id,
        ars.status,
        ars.remarks,
        dr.round_name,
        dr.round_order
     FROM applicant_round_status ars
     JOIN drive_rounds dr ON dr.round_id = ars.round_id
     WHERE ars.application_id IN (${placeholders})
     ORDER BY dr.round_order ASC`,
    applicationIds
  );

  const grouped = new Map();
  roundRows.forEach((row) => {
    if (!grouped.has(row.application_id)) {
      grouped.set(row.application_id, []);
    }
    grouped.get(row.application_id).push({
      round_id: row.round_id,
      round_name: row.round_name,
      round_order: row.round_order,
      status: row.status,
      remarks: row.remarks
    });
  });

  return applications.map((application) => {
    const rounds = grouped.get(application.application_id) || [];
    const currentRound =
      rounds.find((round) => round.round_id === application.current_round_id) ||
      rounds.find((round) => round.status === 'PENDING') ||
      [...rounds].reverse().find((round) => round.status === 'ABSENT') ||
      [...rounds].reverse().find((round) => round.status === 'REJECTED') ||
      [...rounds].reverse().find((round) => round.status === 'CLEARED') ||
      null;

    return {
      ...application,
      rounds,
      current_round_name: currentRound?.round_name || null,
      current_round_order: currentRound?.round_order || null,
      current_round_status: currentRound?.status || null
    };
  });
}

/**
 * 🎓 STUDENT — Apply to a drive
 * POST /api/student/applications/apply
 */
exports.applyToDrive = async (req, res) => {
  try {
    const { drive_id, resume_slot } = req.body;

    if (!drive_id) {
      return res.status(400).json({ message: 'drive_id is required' });
    }

    if (![1, 2, '1', '2'].includes(resume_slot)) {
      return res.status(400).json({ message: 'Please select a resume before applying' });
    }

    // Get student
    const [studentRows] = await db.query(
      `SELECT student_id, program_name, program_batch, placement_status, cgpa,
              cv_link, cv_name, cv_link_2, cv_name_2
       FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const student = studentRows[0];
    const selectedResumeSlot = Number(resume_slot);
    const resumeLinkColumn = selectedResumeSlot === 1 ? 'cv_link' : 'cv_link_2';
    const resumeNameColumn = selectedResumeSlot === 1 ? 'cv_name' : 'cv_name_2';
    const resumeLink = student[resumeLinkColumn];
    const resumeName = student[resumeNameColumn];

    if (student.placement_status === 'PLACED') {
      return res.status(403).json({ message: 'Already placed students cannot apply' });
    }

    if (!resumeLink) {
      return res.status(400).json({ message: 'Selected resume is not available. Please upload your resume first.' });
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
      `INSERT INTO applications (
         student_id, drive_id, status, result,
         applied_cv_slot, applied_cv_name, applied_cv_link
       )
       VALUES (?, ?, 'APPLIED', 'PENDING', ?, ?, ?)`,
      [student.student_id, drive_id, selectedResumeSlot, resumeName || null, resumeLink]
    );

    try {
      await notifyApplicationSubmitted(result.insertId);
    } catch (notificationError) {
      console.error('Application confirmation notification error:', notificationError);
    }

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
         a.current_round_id,
         a.notification,
         a.applied_at,
         pd.drive_id,
         pd.company_name,
         pd.job_role,
         pd.job_type,
         pd.ctc,
         a.applied_cv_slot,
         a.applied_cv_name,
         a.applied_cv_link,
         pd.application_deadline,
         pd.status  AS drive_status
       FROM applications a
       JOIN placement_drives pd ON pd.drive_id = a.drive_id
       WHERE a.student_id = ?
      ORDER BY a.applied_at DESC`,
      [student.student_id]
    );

    const applicationsWithRounds = await attachRoundDetails(applications);

    res.json({ applications: applicationsWithRounds });

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
