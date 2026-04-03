const db = require('../config/db');
const { notifyEligibleStudentsForDrive } = require('../services/notificationService');

// ── GET OPEN DRIVES ────────────────────────────────────────
exports.getOpenDrives = async (req, res) => {
  try {
    const [drives] = await db.query(
      `SELECT pd.*,
          GROUP_CONCAT(DISTINCT p.program_name SEPARATOR ', ') AS eligible_programs,
          COUNT(DISTINCT a.application_id) AS total_applicants
       FROM placement_drives pd
       LEFT JOIN drive_program_mapping dpm ON dpm.drive_id = pd.drive_id
       LEFT JOIN programs p ON p.program_id = dpm.program_id
       LEFT JOIN applications a ON a.drive_id = pd.drive_id
       WHERE pd.status = 'LIVE'
       GROUP BY pd.drive_id
       ORDER BY pd.application_deadline ASC`
    );
    res.json({ drives });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch drives' });
  }
};

// ── GET CLOSED DRIVES ──────────────────────────────────────
exports.getClosedDrives = async (req, res) => {
  try {
    const [drives] = await db.query(
      `SELECT pd.*,
          GROUP_CONCAT(DISTINCT p.program_name SEPARATOR ', ') AS eligible_programs,
          COUNT(DISTINCT a.application_id) AS total_applicants
       FROM placement_drives pd
       LEFT JOIN drive_program_mapping dpm ON dpm.drive_id = pd.drive_id
       LEFT JOIN programs p ON p.program_id = dpm.program_id
       LEFT JOIN applications a ON a.drive_id = pd.drive_id
       WHERE pd.status = 'CLOSED'
       GROUP BY pd.drive_id
       ORDER BY pd.closed_at DESC`
    );
    res.json({ drives });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch closed drives' });
  }
};

// ── GET DRIVE BY ID (pre-fill edit form) ───────────────────
exports.getDriveById = async (req, res) => {
  try {
    const driveId = req.params.id;

    const [[drive]] = await db.query(
      `SELECT pd.*,
          GROUP_CONCAT(DISTINCT p.program_name SEPARATOR ', ') AS eligible_programs,
          COUNT(DISTINCT a.application_id) AS total_applicants
       FROM placement_drives pd
       LEFT JOIN drive_program_mapping dpm ON dpm.drive_id = pd.drive_id
       LEFT JOIN programs p ON p.program_id = dpm.program_id
       LEFT JOIN applications a ON a.drive_id = pd.drive_id
       WHERE pd.drive_id = ?
       GROUP BY pd.drive_id`,
      [driveId]
    );

    if (!drive) return res.status(404).json({ message: 'Drive not found' });

    // Fetch selected program IDs separately for checkbox pre-fill
    const [programIds] = await db.query(
      `SELECT program_id FROM drive_program_mapping WHERE drive_id = ?`,
      [driveId]
    );

    res.json({
      drive,
      selectedProgramIds: programIds.map(r => r.program_id)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch drive' });
  }
};

// ── UPDATE DRIVE (edit for LIVE drives) ───────────────────
// Updates all fields + resets deadline. Drive stays LIVE.
exports.updateDrive = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const driveId = req.params.id;
    const {
      company_name, job_role, description, job_type,
      ctc, eligible_batch, application_deadline,
      min_cgpa, eligible_programs
    } = req.body;

    if (!application_deadline) {
      return res.status(400).json({ message: 'Application deadline is required' });
    }

    const deadline = application_deadline.replace('T', ' ') + ':00';

    await connection.beginTransaction();

    await connection.query(
      `UPDATE placement_drives SET
          company_name = ?, job_role = ?, description = ?,
          job_type = ?, ctc = ?, eligible_batch = ?,
          application_deadline = ?, min_cgpa = ?
       WHERE drive_id = ? AND status = 'LIVE'`,
      [company_name, job_role, description, job_type,
       ctc, eligible_batch, deadline, min_cgpa, driveId]
    );

    if (eligible_programs && eligible_programs.length > 0) {
      await connection.query(
        `DELETE FROM drive_program_mapping WHERE drive_id = ?`, [driveId]
      );
      for (const programId of eligible_programs) {
        await connection.query(
          `INSERT INTO drive_program_mapping (drive_id, program_id) VALUES (?, ?)`,
          [driveId, programId]
        );
      }
    }

    await connection.commit();

    try {
      await notifyEligibleStudentsForDrive(driveId, 'updated');
    } catch (notificationError) {
      console.error('Drive update notification error:', notificationError);
    }

    res.json({ message: 'Drive updated successfully' });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to update drive', error: err.message });
  } finally {
    connection.release();
  }
};

// ── REOPEN DRIVE ───────────────────────────────────────────
// Sets status back to LIVE, clears closed_at/close_type, sets new deadline.
exports.reopenDrive = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const driveId = req.params.id;
    const {
      company_name, job_role, description, job_type,
      ctc, eligible_batch, application_deadline,
      min_cgpa, eligible_programs
    } = req.body;

    if (!application_deadline) {
      return res.status(400).json({ message: 'New application deadline is required to reopen' });
    }

    const deadline = application_deadline.replace('T', ' ') + ':00';

    await connection.beginTransaction();

    await connection.query(
      `UPDATE placement_drives SET
          company_name = ?, job_role = ?, description = ?,
          job_type = ?, ctc = ?, eligible_batch = ?,
          application_deadline = ?, min_cgpa = ?,
          status = 'LIVE', closed_at = NULL, close_type = NULL
       WHERE drive_id = ?`,
      [company_name, job_role, description, job_type,
       ctc, eligible_batch, deadline, min_cgpa, driveId]
    );

    if (eligible_programs && eligible_programs.length > 0) {
      await connection.query(
        `DELETE FROM drive_program_mapping WHERE drive_id = ?`, [driveId]
      );
      for (const programId of eligible_programs) {
        await connection.query(
          `INSERT INTO drive_program_mapping (drive_id, program_id) VALUES (?, ?)`,
          [driveId, programId]
        );
      }
    }

    await connection.commit();

    try {
      await notifyEligibleStudentsForDrive(driveId, 'reopened');
    } catch (notificationError) {
      console.error('Drive reopen notification error:', notificationError);
    }

    res.json({ message: 'Drive reopened successfully' });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to reopen drive', error: err.message });
  } finally {
    connection.release();
  }
};

// ── CLOSE DRIVE MANUALLY ───────────────────────────────────
// Records exact timestamp + MANUAL as close_type
exports.closeDrive = async (req, res) => {
  try {
    const driveId = req.params.id;

    const [result] = await db.query(
      `UPDATE placement_drives
       SET status = 'CLOSED', closed_at = NOW(), close_type = 'MANUAL'
       WHERE drive_id = ? AND status = 'LIVE'`,
      [driveId]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Drive not found or already closed' });
    }

    res.json({ message: 'Drive closed successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to close drive' });
  }
};
