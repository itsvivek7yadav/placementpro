const db = require('../config/db');
const { notifyRoundStatusUpdate } = require('../services/notificationService');
const { syncStudentsPlacementFromApplications } = require('../services/placementSyncService');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { promises: fsp } = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

const VALID_ROUND_STATUSES = new Set(['PENDING', 'CLEARED', 'REJECTED', 'ABSENT']);

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

function getRoundStatusMap(statusRows) {
  return new Map(statusRows.map((row) => [row.round_id, row]));
}

function computeApplicationState(rounds, statusRows) {
  if (!rounds.length) {
    return {
      current_round_id: null,
      result: 'PENDING',
      status: 'APPLIED'
    };
  }

  const statusMap = getRoundStatusMap(statusRows);
  const firstNonCleared = rounds.find((round) => {
    const roundStatus = statusMap.get(round.round_id)?.status;
    return roundStatus !== 'CLEARED';
  });

  if (!firstNonCleared) {
    const finalRound = rounds[rounds.length - 1];
    return {
      current_round_id: finalRound.round_id,
      result: 'SELECTED',
      status: 'SELECTED'
    };
  }

  const currentStatus = statusMap.get(firstNonCleared.round_id)?.status ?? null;
  if (currentStatus === 'REJECTED' || currentStatus === 'ABSENT') {
    return {
      current_round_id: firstNonCleared.round_id,
      result: currentStatus,
      status: currentStatus
    };
  }

  const hasClearedRound = rounds.some((round) => statusMap.get(round.round_id)?.status === 'CLEARED');
  return {
    current_round_id: firstNonCleared.round_id,
    result: 'PENDING',
    status: hasClearedRound ? 'SHORTLISTED' : 'APPLIED'
  };
}

async function getDriveRounds(connection, driveId) {
  const [rounds] = await connection.query(
    `SELECT round_id, drive_id, round_name, round_order, description
     FROM drive_rounds
     WHERE drive_id = ?
     ORDER BY round_order ASC`,
    [driveId]
  );

  return rounds;
}

async function validateDriveExists(connection, driveId) {
  const [rows] = await connection.query(
    `SELECT drive_id
     FROM placement_drives
     WHERE drive_id = ?`,
    [driveId]
  );

  return rows[0] || null;
}

async function syncApplicationsForDrive(connection, driveId, applicationIds = null) {
  const rounds = await getDriveRounds(connection, driveId);

  let targetApplications = [];
  if (applicationIds?.length) {
    targetApplications = applicationIds;
  } else {
    const [applicationRows] = await connection.query(
      `SELECT application_id
       FROM applications
       WHERE drive_id = ?`,
      [driveId]
    );
    targetApplications = applicationRows.map((row) => row.application_id);
  }

  if (!targetApplications.length) {
    return;
  }

  const placeholders = buildInClause(targetApplications);
  const [statusRows] = await connection.query(
    `SELECT ars.application_id, ars.round_id, ars.status, ars.remarks
     FROM applicant_round_status ars
     WHERE ars.application_id IN (${placeholders})`,
    targetApplications
  );

  const grouped = new Map();
  targetApplications.forEach((applicationId) => grouped.set(applicationId, []));
  statusRows.forEach((row) => {
    if (!grouped.has(row.application_id)) grouped.set(row.application_id, []);
    grouped.get(row.application_id).push(row);
  });

  const updates = targetApplications.map((applicationId) => ({
    application_id: applicationId,
    ...computeApplicationState(rounds, grouped.get(applicationId) || [])
  }));

  const caseCurrent = updates.map(() => 'WHEN ? THEN ?').join(' ');
  const caseResult = updates.map(() => 'WHEN ? THEN ?').join(' ');
  const caseStatus = updates.map(() => 'WHEN ? THEN ?').join(' ');
  const updateParams = [];

  updates.forEach((update) => {
    updateParams.push(update.application_id, update.current_round_id);
  });
  updates.forEach((update) => {
    updateParams.push(update.application_id, update.result);
  });
  updates.forEach((update) => {
    updateParams.push(update.application_id, update.status);
  });
  updateParams.push(...updates.map((update) => update.application_id));

  await connection.query(
    `UPDATE applications
     SET current_round_id = CASE application_id ${caseCurrent} ELSE current_round_id END,
         result = CASE application_id ${caseResult} ELSE result END,
         status = CASE application_id ${caseStatus} ELSE status END
     WHERE application_id IN (${buildInClause(updates.map((update) => update.application_id))})`,
    updateParams
  );

  const [studentRows] = await connection.query(
    `SELECT DISTINCT student_id
     FROM applications
     WHERE application_id IN (${buildInClause(targetApplications)})`,
    targetApplications
  );

  await syncStudentsPlacementFromApplications(
    connection,
    studentRows.map((row) => row.student_id)
  );
}

exports.createDriveRounds = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const driveId = Number(req.params.driveId);
    const rounds = Array.isArray(req.body?.rounds) ? req.body.rounds : [];

    if (!driveId) {
      return res.status(400).json({ error: 'Valid driveId is required' });
    }

    if (!rounds.length) {
      return res.status(400).json({ error: 'rounds array is required' });
    }

    const drive = await validateDriveExists(connection, driveId);
    if (!drive) {
      return res.status(404).json({ error: 'Drive not found' });
    }

    const [existingRounds] = await connection.query(
      `SELECT round_id, round_name, round_order
       FROM drive_rounds
       WHERE drive_id = ?
       ORDER BY round_order ASC`,
      [driveId]
    );

    if (existingRounds.length > 0) {
      return res.status(409).json({
        error: 'Rounds already defined for this drive',
        details: 'This drive already has hiring rounds. Editing existing rounds is not supported in this flow yet.',
        rounds: existingRounds
      });
    }

    for (const round of rounds) {
      if (!round?.round_name || !round?.round_order) {
        return res.status(400).json({ error: 'round_name and round_order are required for every round' });
      }
    }

    await connection.beginTransaction();

    const insertedRounds = [];
    for (const round of rounds) {
      const description = toNullableString(round.description);
      const [insertResult] = await connection.query(
        `INSERT INTO drive_rounds (drive_id, round_name, round_order, description, created_at)
         VALUES (?, ?, ?, ?, NOW())`,
        [driveId, round.round_name, round.round_order, description]
      );

      insertedRounds.push({
        round_id: insertResult.insertId,
        drive_id: driveId,
        round_name: round.round_name,
        round_order: round.round_order,
        description
      });

      await connection.query(
        `INSERT INTO applicant_round_status (application_id, round_id, status, updated_at)
         SELECT application_id, ?, 'PENDING', NOW()
         FROM applications
         WHERE drive_id = ?`,
        [insertResult.insertId, driveId]
      );
    }

    await syncApplicationsForDrive(connection, driveId);
    await connection.commit();

    res.status(201).json({ success: true, rounds: insertedRounds });
  } catch (err) {
    await connection.rollback();
    console.error('Create Drive Rounds Error:', err);
    res.status(500).json({ error: 'Failed to create drive rounds', details: err.message });
  } finally {
    connection.release();
  }
};

exports.getDriveApplications = async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const driveId = Number(req.params.driveId);
    const selectedRoundId = req.query.roundId ? Number(req.query.roundId) : null;
    const selectedStatus = typeof req.query.status === 'string' ? req.query.status.toUpperCase() : null;

    if (!driveId) {
      return res.status(400).json({ error: 'Valid driveId is required' });
    }

    const [rounds] = await db.query(
      `SELECT round_id, round_name, round_order, description
       FROM drive_rounds
       WHERE drive_id = ?
       ORDER BY round_order ASC`,
      [driveId]
    );

    const [applications] = await db.query(
      `SELECT
          a.application_id,
          a.status,
          a.result,
          a.current_round_id,
          a.applied_cv_slot,
          a.applied_cv_name,
          a.applied_cv_link,
          COALESCE(u.name, CONCAT('Student ', a.student_id)) AS student_name,
          s.student_id,
          s.prn,
          s.first_name,
          s.middle_name,
          s.last_name,
          s.program_name,
          s.program_batch,
          s.placement_status,
          s.sicsr_program_name,
          s.college_email,
          s.personal_email,
          s.date_of_birth,
          s.gender,
          s.phone_number,
          s.whatsapp_number,
          s.whatsapp_link,
          s.linkedin_profile_url,
          s.city,
          s.state,
          s.country,
          s.std_x_percentage,
          s.std_x_cgpa,
          s.std_xii_percentage,
          s.std_xii_cgpa,
          s.ug_course_name,
          s.ug_specialization,
          s.ug_university,
          s.ug_percentage,
          s.ug_cgpa,
          s.ug_year,
          s.educational_background,
          s.sicsr_program_name,
          s.sicsr_specialization,
          s.sem1_gpa,
          s.sem2_gpa,
          s.sem3_gpa,
          s.cgpa,
          s.backlog,
          s.interested_job_roles,
          s.work_experience,
          s.total_work_experience,
          s.last_company_name,
          s.last_company_industry,
          s.prn AS roll_number,
          COALESCE(s.college_email, u.email) AS email
       FROM applications a
       JOIN students s ON s.student_id = a.student_id
       LEFT JOIN users u ON u.user_id = s.user_id
       WHERE a.drive_id = ?
       ORDER BY student_name ASC`,
      [driveId]
    );

    if (!applications.length) {
      return res.json({ rounds, applications: [] });
    }

    const applicationIds = applications.map((application) => application.application_id);
    const [roundStatuses] = await db.query(
      `SELECT
          ars.application_id,
          ars.round_id,
          ars.status,
          ars.remarks,
          dr.round_name,
          dr.round_order
       FROM applicant_round_status ars
       JOIN drive_rounds dr ON dr.round_id = ars.round_id
       WHERE ars.application_id IN (${buildInClause(applicationIds)})
       ORDER BY dr.round_order ASC`,
      applicationIds
    );

    const groupedStatuses = new Map();
    roundStatuses.forEach((row) => {
      if (!groupedStatuses.has(row.application_id)) {
        groupedStatuses.set(row.application_id, []);
      }
      groupedStatuses.get(row.application_id).push(row);
    });

    const mergedApplications = applications.map((application) => {
      const statusRows = groupedStatuses.get(application.application_id) || [];
      const statusMap = getRoundStatusMap(statusRows);

      const applicantRounds = rounds.map((round) => {
        const existing = statusMap.get(round.round_id);
        return {
          round_id: round.round_id,
          round_name: round.round_name,
          round_order: round.round_order,
          status: existing?.status || 'NOT_REACHED',
          remarks: existing?.remarks ?? null
        };
      });

      const lastRoundReached = applicantRounds
        .filter((round) => round.status === 'PENDING' || round.status === 'CLEARED')
        .sort((a, b) => b.round_order - a.round_order)[0]?.round_id ?? null;

      return {
        ...application,
        last_round_reached: lastRoundReached,
        rounds: applicantRounds
      };
    });

    const filteredApplications = mergedApplications.filter((application) => {
      if (!selectedRoundId && !selectedStatus) return true;

      const roundStatus = selectedRoundId
        ? application.rounds.find((round) => round.round_id === selectedRoundId)
        : null;

      if (selectedRoundId && !roundStatus) return false;
      if (selectedStatus && roundStatus && roundStatus.status !== selectedStatus) return false;
      if (selectedStatus && !selectedRoundId) {
        return application.rounds.some((round) => round.status === selectedStatus);
      }

      return true;
    });

    return res.json({
      rounds: Array.isArray(rounds) ? rounds : [],
      applications: Array.isArray(filteredApplications) ? filteredApplications : []
    });
  } catch (err) {
    console.error('[GET /api/drives/:driveId/applications] ERROR:', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({
      error: 'Failed to fetch applications',
      detail: err.message
    });
  }
};

exports.updateApplicationRound = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const applicationId = Number(req.params.appId);
    const roundId = Number(req.params.roundId);
    const status = typeof req.body?.status === 'string' ? req.body.status.toUpperCase() : '';
    const remarks = toNullableString(req.body?.remarks);

    if (!applicationId || !roundId) {
      return res.status(400).json({ error: 'Valid application and round ids are required' });
    }

    if (!VALID_ROUND_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid round status' });
    }

    await connection.beginTransaction();

    const [[target]] = await connection.query(
      `SELECT
          a.application_id,
          a.drive_id,
          dr.round_id,
          dr.round_order
       FROM applications a
       JOIN drive_rounds dr ON dr.drive_id = a.drive_id
       WHERE a.application_id = ? AND dr.round_id = ?`,
      [applicationId, roundId]
    );

    if (!target) {
      await connection.rollback();
      return res.status(404).json({ error: 'Application or round not found' });
    }

    const [[existingStatusRow]] = await connection.query(
      `SELECT status
       FROM applicant_round_status
       WHERE application_id = ? AND round_id = ?`,
      [applicationId, roundId]
    );

    if (target.round_order > 1) {
      const [[previousRound]] = await connection.query(
        `SELECT ars.status
         FROM drive_rounds dr
         LEFT JOIN applicant_round_status ars
           ON ars.round_id = dr.round_id
          AND ars.application_id = ?
         WHERE dr.drive_id = ? AND dr.round_order = ?`,
        [applicationId, target.drive_id, target.round_order - 1]
      );

      if (!previousRound || previousRound.status !== 'CLEARED') {
        await connection.rollback();
        return res.status(400).json({ error: 'Previous round not cleared yet' });
      }
    }

    await connection.query(
      `INSERT INTO applicant_round_status (application_id, round_id, status, remarks, updated_at)
       VALUES (?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         remarks = VALUES(remarks),
         updated_at = NOW()`,
      [applicationId, roundId, status, remarks]
    );

    if (status === 'REJECTED' || status === 'ABSENT') {
      await connection.query(
        `DELETE ars
         FROM applicant_round_status ars
         JOIN drive_rounds dr ON dr.round_id = ars.round_id
         WHERE ars.application_id = ?
           AND dr.drive_id = ?
           AND dr.round_order > ?`,
        [applicationId, target.drive_id, target.round_order]
      );
    }

    await syncApplicationsForDrive(connection, target.drive_id, [applicationId]);
    await connection.commit();

    if (existingStatusRow?.status !== status) {
      try {
        await notifyRoundStatusUpdate(applicationId, roundId, status);
      } catch (notificationError) {
        console.error('Round notification error:', notificationError);
      }
    }

    res.json({ success: true });
  } catch (err) {
    await connection.rollback();
    console.error('Update Application Round Error:', err);
    res.status(500).json({ error: 'Failed to update application round', details: err.message });
  } finally {
    connection.release();
  }
};

exports.bulkUpdateRoundStatus = async (req, res) => {
  const connection = await db.getConnection();

  try {
    const driveId = Number(req.params.driveId);
    const roundId = Number(req.params.roundId);
    const updates = Array.isArray(req.body?.updates) ? req.body.updates : [];

    if (!driveId || !roundId) {
      return res.status(400).json({ error: 'Valid drive and round ids are required' });
    }

    if (!updates.length) {
      return res.status(400).json({ error: 'updates array is required' });
    }

    const [[round]] = await connection.query(
      `SELECT round_id, drive_id, round_order
       FROM drive_rounds
       WHERE drive_id = ? AND round_id = ?`,
      [driveId, roundId]
    );

    if (!round) {
      return res.status(404).json({ error: 'Round not found for drive' });
    }

    const applicationIds = [...new Set(updates.map((update) => Number(update.application_id)).filter(Boolean))];
    if (!applicationIds.length) {
      return res.status(400).json({ error: 'Valid application ids are required' });
    }

    const invalidUpdate = updates.find((update) => !VALID_ROUND_STATUSES.has(String(update.status || '').toUpperCase()));
    if (invalidUpdate) {
      return res.status(400).json({ error: 'Each update must include a valid status' });
    }

    await connection.beginTransaction();

    const [applicationRows] = await connection.query(
      `SELECT application_id
       FROM applications
       WHERE drive_id = ? AND application_id IN (${buildInClause(applicationIds)})`,
      [driveId, ...applicationIds]
    );

    if (applicationRows.length !== applicationIds.length) {
      await connection.rollback();
      return res.status(400).json({ error: 'One or more applications do not belong to this drive' });
    }

    if (round.round_order > 1) {
      const [previousRows] = await connection.query(
        `SELECT ars.application_id, ars.status
         FROM drive_rounds dr
         LEFT JOIN applicant_round_status ars
           ON ars.round_id = dr.round_id
          AND ars.application_id IN (${buildInClause(applicationIds)})
         WHERE dr.drive_id = ? AND dr.round_order = ?`,
        [...applicationIds, driveId, round.round_order - 1]
      );

      const previousStatusMap = new Map(previousRows.map((row) => [row.application_id, row.status]));
      const blockedApplication = applicationIds.find((applicationId) => previousStatusMap.get(applicationId) !== 'CLEARED');

      if (blockedApplication) {
        await connection.rollback();
        return res.status(400).json({ error: 'Previous round not cleared yet' });
      }
    }

    const [existingStatusRows] = await connection.query(
      `SELECT application_id, status
       FROM applicant_round_status
       WHERE round_id = ?
         AND application_id IN (${buildInClause(applicationIds)})`,
      [roundId, ...applicationIds]
    );

    const existingStatusMap = new Map(existingStatusRows.map((row) => [row.application_id, row.status]));

    const valuePlaceholders = updates.map(() => '(?, ?, ?, ?, NOW())').join(', ');
    const params = [];
    updates.forEach((update) => {
      params.push(
        Number(update.application_id),
        roundId,
        String(update.status).toUpperCase(),
        toNullableString(update.remarks)
      );
    });

    await connection.query(
      `INSERT INTO applicant_round_status (application_id, round_id, status, remarks, updated_at)
       VALUES ${valuePlaceholders}
       ON DUPLICATE KEY UPDATE
         status = VALUES(status),
         remarks = VALUES(remarks),
         updated_at = NOW()`,
      params
    );

    const rejectedIds = updates
      .filter((update) => ['REJECTED', 'ABSENT'].includes(String(update.status).toUpperCase()))
      .map((update) => Number(update.application_id));

    if (rejectedIds.length) {
      await connection.query(
        `DELETE ars
         FROM applicant_round_status ars
         JOIN drive_rounds dr ON dr.round_id = ars.round_id
         WHERE ars.application_id IN (${buildInClause(rejectedIds)})
           AND dr.drive_id = ?
           AND dr.round_order > ?`,
        [...rejectedIds, driveId, round.round_order]
      );
    }

    await syncApplicationsForDrive(connection, driveId, applicationIds);
    await connection.commit();

    for (const update of updates) {
      const applicationId = Number(update.application_id);
      const nextStatus = String(update.status).toUpperCase();
      if (existingStatusMap.get(applicationId) === nextStatus) {
        continue;
      }

      try {
        await notifyRoundStatusUpdate(applicationId, roundId, nextStatus);
      } catch (notificationError) {
        console.error('Bulk round notification error:', notificationError);
      }
    }

    res.json({ success: true, updated: updates.length });
  } catch (err) {
    await connection.rollback();
    console.error('Bulk Update Round Status Error:', err);
    res.status(500).json({ error: 'Failed to bulk update round statuses', details: err.message });
  } finally {
    connection.release();
  }
};

exports.exportApplicantResumesZip = async (req, res) => {
  try {
    const driveId = Number(req.params.driveId);
    const requestedIds = Array.isArray(req.body?.applicationIds)
      ? req.body.applicationIds.map(Number).filter(Boolean)
      : [];

    if (!driveId) {
      return res.status(400).json({ error: 'Valid driveId is required' });
    }

    const params = [driveId];
    let applicationFilter = '';

    if (requestedIds.length) {
      applicationFilter = ` AND a.application_id IN (${buildInClause(requestedIds)})`;
      params.push(...requestedIds);
    }

    const [rows] = await db.query(
      `SELECT
          a.application_id,
          a.applied_cv_name,
          a.applied_cv_link,
          s.prn,
          COALESCE(u.name, CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name), CONCAT('Student ', s.student_id)) AS student_name
       FROM applications a
       JOIN students s ON s.student_id = a.student_id
       LEFT JOIN users u ON u.user_id = s.user_id
       WHERE a.drive_id = ?
         AND a.applied_cv_link IS NOT NULL
         AND a.applied_cv_link <> ''
         ${applicationFilter}
       ORDER BY student_name ASC`,
      params
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'No applicant resumes available for export' });
    }

    const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), `drive-${driveId}-resumes-`));
    const zipPath = path.join(tempDir, `drive-${driveId}-applicant-resumes.zip`);

    const copiedFiles = [];
    for (const row of rows) {
      const relativePath = String(row.applied_cv_link || '').replace(/^\/+/, '');
      const sourcePath = path.join(process.cwd(), relativePath);

      if (!fs.existsSync(sourcePath)) {
        continue;
      }

      const ext = path.extname(sourcePath) || path.extname(row.applied_cv_name || '') || '.pdf';
      const safePrn = String(row.prn || row.application_id);
      const safeName = String(row.student_name || 'student')
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .replace(/_+/g, '_')
        .slice(0, 50);
      const targetName = `${safePrn}_${safeName}${ext}`;
      const targetPath = path.join(tempDir, targetName);

      await fsp.copyFile(sourcePath, targetPath);
      copiedFiles.push(targetName);
    }

    if (!copiedFiles.length) {
      await fsp.rm(tempDir, { recursive: true, force: true });
      return res.status(404).json({ error: 'Resume files were not found on disk for the selected applicants' });
    }

    await execFileAsync('zip', ['-j', zipPath, ...copiedFiles], { cwd: tempDir });

    res.download(zipPath, `drive-${driveId}-applicant-resumes.zip`, async () => {
      await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
    });
  } catch (error) {
    console.error('Export Applicant Resumes Zip Error:', error);
    res.status(500).json({ error: 'Failed to export applicant resumes zip', details: error.message });
  }
};
