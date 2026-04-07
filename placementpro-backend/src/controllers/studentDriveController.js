const db = require('../config/db');
const { normalizeJobType, formatCompensationLabel } = require('../utils/driveCompensation');

function normalizeDriveResponse(drive) {
  return {
    ...drive,
    job_type: normalizeJobType(drive.job_type),
    compensation_label: formatCompensationLabel(drive)
  };
}
exports.getDriveDetail = async (req, res) => {
  try {
    const driveId = req.params.id;
    const userId = req.user.user_id;

    // Get student
    const [studentRows] = await db.query(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [userId]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const { student_id } = studentRows[0];

    const [[drive]] = await db.query(
      `SELECT pd.*,
          GROUP_CONCAT(DISTINCT p.program_name SEPARATOR ', ') AS eligible_programs,
          COUNT(DISTINCT a.application_id) AS total_applicants,
          (SELECT application_id FROM applications
            WHERE drive_id = pd.drive_id AND student_id = ? LIMIT 1) AS my_application_id
       FROM placement_drives pd
       LEFT JOIN drive_program_mapping dpm ON dpm.drive_id = pd.drive_id
       LEFT JOIN programs p ON p.program_id = dpm.program_id
       LEFT JOIN applications a ON a.drive_id = pd.drive_id
       WHERE pd.drive_id = ?
       GROUP BY pd.drive_id`,
      [student_id, driveId]
    );

    if (!drive) return res.status(404).json({ message: 'Drive not found' });

    res.json({ drive: normalizeDriveResponse(drive) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch drive detail' });
  }
};
exports.getEligibleDrives = async (req, res) => {
  try {

    // 🔹 Get student profile using logged-in user_id
    const [studentRows] = await db.query(
      `SELECT student_id, program_name, program_batch, placement_status, cgpa
       FROM students
       WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    const student = studentRows[0];

    // 🚫 Already placed → no drives
    if (student.placement_status === 'PLACED') {
      return res.json({ drives: [] });
    }

    // 🔹 Get eligible drives
    const [drives] = await db.query(
      `SELECT pd.*,
          GROUP_CONCAT(p.program_name SEPARATOR ', ') AS eligible_programs,
          (SELECT COUNT(*) FROM applications WHERE drive_id = pd.drive_id) AS total_applicants,
          (SELECT application_id FROM applications
            WHERE drive_id = pd.drive_id AND student_id = ? LIMIT 1) AS my_application_id
       FROM placement_drives pd
       JOIN drive_program_mapping dpm ON pd.drive_id = dpm.drive_id
       JOIN programs p ON dpm.program_id = p.program_id
       WHERE pd.status = 'LIVE'
         AND pd.eligible_batch = ?
         AND p.program_name = ?
         AND (pd.min_cgpa IS NULL OR COALESCE(?, 0) >= pd.min_cgpa)
         AND pd.application_deadline > NOW()
       GROUP BY pd.drive_id
       ORDER BY pd.application_deadline ASC`,
      [
        student.student_id,
        student.program_batch,
        student.program_name,
        student.cgpa
      ]
    );

    res.json({ drives: drives.map(normalizeDriveResponse) });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to fetch drives' });
  }
};
