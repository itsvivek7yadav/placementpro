const db = require('../config/db');

function normalizeRows(rows = []) {
  return rows
    .filter((row) => row && row.userId && row.title && row.message)
    .map((row) => ({
      userId: Number(row.userId),
      title: String(row.title).trim(),
      message: String(row.message).trim(),
      type: row.type || 'announcement',
      relatedDriveId: row.relatedDriveId ? Number(row.relatedDriveId) : null,
      relatedApplicationId: row.relatedApplicationId ? Number(row.relatedApplicationId) : null,
      link: row.link ? String(row.link).trim() : null,
      dedupeKey: row.dedupeKey ? String(row.dedupeKey).trim() : null
    }))
    .filter((row) => row.userId && row.title && row.message);
}

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

async function getDriveMeta(driveId, connection = db) {
  const [[drive]] = await connection.query(
    `SELECT drive_id, company_name, job_role, eligible_batch, min_cgpa, application_deadline, status
     FROM placement_drives
     WHERE drive_id = ?`,
    [driveId]
  );

  return drive || null;
}

async function getEligibleUsersForDrive(driveId, connection = db) {
  const [rows] = await connection.query(
    `SELECT DISTINCT u.user_id
     FROM placement_drives pd
     JOIN drive_program_mapping dpm ON dpm.drive_id = pd.drive_id
     JOIN programs p ON p.program_id = dpm.program_id
     JOIN students s
       ON s.program_name = p.program_name
      AND s.program_batch = pd.eligible_batch
     JOIN users u ON u.user_id = s.user_id
     WHERE pd.drive_id = ?
       AND COALESCE(s.placement_status, 'NOT_PLACED') <> 'PLACED'
       AND (pd.min_cgpa IS NULL OR COALESCE(s.cgpa, 0) >= pd.min_cgpa)`,
    [driveId]
  );

  return rows.map((row) => row.user_id);
}

async function getApplicantUsersForDrive(driveId, connection = db) {
  const [rows] = await connection.query(
    `SELECT DISTINCT u.user_id
     FROM applications a
     JOIN students s ON s.student_id = a.student_id
     JOIN users u ON u.user_id = s.user_id
     WHERE a.drive_id = ?`,
    [driveId]
  );

  return rows.map((row) => row.user_id);
}

async function getApplicationRecipient(applicationId, connection = db) {
  const [[row]] = await connection.query(
    `SELECT
        a.application_id,
        a.drive_id,
        a.result,
        a.status,
        u.user_id,
        pd.company_name,
        pd.job_role
     FROM applications a
     JOIN students s ON s.student_id = a.student_id
     JOIN users u ON u.user_id = s.user_id
     JOIN placement_drives pd ON pd.drive_id = a.drive_id
     WHERE a.application_id = ?`,
    [applicationId]
  );

  return row || null;
}

async function getRoundRecipient(applicationId, roundId, connection = db) {
  const [[row]] = await connection.query(
    `SELECT
        a.application_id,
        a.drive_id,
        u.user_id,
        pd.company_name,
        pd.job_role,
        dr.round_id,
        dr.round_name,
        dr.round_order
     FROM applications a
     JOIN students s ON s.student_id = a.student_id
     JOIN users u ON u.user_id = s.user_id
     JOIN placement_drives pd ON pd.drive_id = a.drive_id
     JOIN drive_rounds dr ON dr.drive_id = a.drive_id
     WHERE a.application_id = ? AND dr.round_id = ?`,
    [applicationId, roundId]
  );

  return row || null;
}

async function createNotifications(rows, connection = db) {
  let normalizedRows = normalizeRows(rows);
  if (!normalizedRows.length) return { created: 0 };

  const dedupeRows = normalizedRows.filter((row) => row.dedupeKey);
  if (dedupeRows.length) {
    const userIds = [...new Set(dedupeRows.map((row) => row.userId))];
    const dedupeKeys = [...new Set(dedupeRows.map((row) => row.dedupeKey))];

    const [existingRows] = await connection.query(
      `SELECT user_id, dedupe_key
       FROM notifications
       WHERE user_id IN (${buildInClause(userIds)})
         AND dedupe_key IN (${buildInClause(dedupeKeys)})`,
      [...userIds, ...dedupeKeys]
    );

    const existingSet = new Set(existingRows.map((row) => `${row.user_id}::${row.dedupe_key}`));
    normalizedRows = normalizedRows.filter((row) => !row.dedupeKey || !existingSet.has(`${row.userId}::${row.dedupeKey}`));
  }

  if (!normalizedRows.length) return { created: 0 };

  const valuesClause = normalizedRows.map(() => '(?, ?, ?, ?, ?, ?, ?, 0, ?, NOW())').join(', ');
  const params = [];

  normalizedRows.forEach((row) => {
    params.push(
      row.userId,
      row.title,
      row.message,
      row.type,
      row.relatedDriveId,
      row.relatedApplicationId,
      row.link,
      row.dedupeKey
    );
  });

  await connection.query(
    `INSERT INTO notifications
      (user_id, title, message, type, related_drive_id, related_application_id, link, is_read, dedupe_key, created_at)
     VALUES ${valuesClause}`,
    params
  );

  return { created: normalizedRows.length };
}

async function notifyEligibleStudentsForDrive(driveId, action, connection = db) {
  const drive = await getDriveMeta(driveId, connection);
  if (!drive) return { created: 0 };

  const userIds = await getEligibleUsersForDrive(driveId, connection);
  if (!userIds.length) return { created: 0 };

  const actionCopy = {
    created: {
      title: `New drive published: ${drive.company_name}`,
      message: `${drive.company_name} has opened applications for ${drive.job_role}. Check your eligible drives and apply before the deadline.`,
      type: 'new_drive',
      dedupePrefix: `new_drive:${driveId}`
    },
    updated: {
      title: `Drive updated: ${drive.company_name}`,
      message: `${drive.company_name} updated the ${drive.job_role} drive. Review the latest details before applying.`,
      type: 'drive_update',
      dedupePrefix: `drive_update:${driveId}:${Date.now()}`
    },
    reopened: {
      title: `Drive reopened: ${drive.company_name}`,
      message: `${drive.company_name} reopened applications for ${drive.job_role}. A new deadline is now available.`,
      type: 'drive_reopened',
      dedupePrefix: `drive_reopened:${driveId}:${Date.now()}`
    }
  };

  const config = actionCopy[action];
  if (!config) return { created: 0 };

  return createNotifications(
    userIds.map((userId) => ({
      userId,
      title: config.title,
      message: config.message,
      type: config.type,
      relatedDriveId: driveId,
      link: `/drives/${driveId}`,
      dedupeKey: `${config.dedupePrefix}:${userId}`
    })),
    connection
  );
}

async function notifyApplicationSubmitted(applicationId, connection = db) {
  const recipient = await getApplicationRecipient(applicationId, connection);
  if (!recipient) return { created: 0 };

  return createNotifications([
    {
      userId: recipient.user_id,
      title: `Application submitted: ${recipient.company_name}`,
      message: `Your application for ${recipient.job_role} at ${recipient.company_name} was submitted successfully.`,
      type: 'application_confirmation',
      relatedDriveId: recipient.drive_id,
      relatedApplicationId: applicationId,
      link: '/applications',
      dedupeKey: `application_confirmation:${applicationId}`
    }
  ], connection);
}

async function notifyApplicationResultUpdate(applicationId, result, connection = db) {
  const recipient = await getApplicationRecipient(applicationId, connection);
  if (!recipient) return { created: 0 };

  const resultLabel = String(result || recipient.result || '').toUpperCase();
  const messageByResult = {
    SELECTED: `Congratulations! You have been selected for ${recipient.job_role} at ${recipient.company_name}.`,
    REJECTED: `Your application for ${recipient.job_role} at ${recipient.company_name} has been marked as rejected.`,
    ABSENT: `Your application for ${recipient.job_role} at ${recipient.company_name} has been marked absent.`,
    PENDING: `Your result for ${recipient.job_role} at ${recipient.company_name} is currently pending.`
  };

  return createNotifications([
    {
      userId: recipient.user_id,
      title: `Result updated: ${recipient.company_name}`,
      message: messageByResult[resultLabel] || `Your application status for ${recipient.company_name} has been updated to ${resultLabel}.`,
      type: 'result',
      relatedDriveId: recipient.drive_id,
      relatedApplicationId: applicationId,
      link: '/applications',
      dedupeKey: `result:${applicationId}:${resultLabel}`
    }
  ], connection);
}

async function notifyRoundStatusUpdate(applicationId, roundId, status, connection = db) {
  const recipient = await getRoundRecipient(applicationId, roundId, connection);
  if (!recipient) return { created: 0 };

  const statusLabel = String(status || '').toUpperCase();
  const messageByStatus = {
    CLEARED: `You cleared ${recipient.round_name} for ${recipient.company_name}.`,
    REJECTED: `You were marked rejected in ${recipient.round_name} for ${recipient.company_name}.`,
    ABSENT: `You were marked absent in ${recipient.round_name} for ${recipient.company_name}.`,
    PENDING: `Your status for ${recipient.round_name} in ${recipient.company_name} is pending.`
  };

  return createNotifications([
    {
      userId: recipient.user_id,
      title: `Round update: ${recipient.company_name}`,
      message: messageByStatus[statusLabel] || `Your ${recipient.round_name} status was updated to ${statusLabel}.`,
      type: 'result',
      relatedDriveId: recipient.drive_id,
      relatedApplicationId: applicationId,
      link: '/applications',
      dedupeKey: `round:${applicationId}:${roundId}:${statusLabel}`
    }
  ], connection);
}

async function notifyDriveAudience({ driveId, audience, title, message, link }, connection = db) {
  const targetAudience = String(audience || '').toUpperCase();
  const recipientIds = targetAudience === 'ELIGIBLE'
    ? await getEligibleUsersForDrive(driveId, connection)
    : await getApplicantUsersForDrive(driveId, connection);

  if (!recipientIds.length) return { created: 0 };

  return createNotifications(
    recipientIds.map((userId) => ({
      userId,
      title,
      message,
      type: 'announcement',
      relatedDriveId: driveId,
      link: link || `/drives/${driveId}`
    })),
    connection
  );
}

module.exports = {
  createNotifications,
  getEligibleUsersForDrive,
  getApplicantUsersForDrive,
  notifyEligibleStudentsForDrive,
  notifyApplicationSubmitted,
  notifyApplicationResultUpdate,
  notifyRoundStatusUpdate,
  notifyDriveAudience
};
