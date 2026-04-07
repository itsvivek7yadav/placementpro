const db = require('../config/db');
const { notifyEligibleStudentsForDrive } = require('../services/notificationService');
const { validateAndNormalizeCompensation, toDatabaseJobType } = require('../utils/driveCompensation');

function normalizeProgramIds(value) {
  if (Array.isArray(value)) {
    return value.map(Number).filter(Boolean);
  }

  if (value === undefined || value === null || value === '') {
    return [];
  }

  return [Number(value)].filter(Boolean);
}

exports.createDrive = async (req, res) => {

  const {
    company_name,
    job_role,
    description,
    job_type,
    eligible_batch,
    application_deadline,
    min_cgpa,
    eligible_programs
  } = req.body;
  const driveDocumentUrl = req.file ? `/uploads/drive-documents/${req.file.filename}` : null;
  const normalizedPrograms = normalizeProgramIds(eligible_programs);

  if (
    !company_name ||
    !job_role ||
    !application_deadline ||
    !eligible_batch ||
    normalizedPrograms.length === 0
  ) {
    return res.status(400).json({
      message: 'Missing required fields'
    });
  }

  const compensation = validateAndNormalizeCompensation(req.body);
  if (compensation.error) {
    return res.status(400).json({ message: compensation.error });
  }

  const created_by = req.user.user_id;

  const deadline =
    application_deadline.replace('T', ' ') + ':00';

  const connection = await db.getConnection();

  try {

    await connection.beginTransaction();

    // ✅ NO eligible_programs column here
    const [driveResult] = await connection.query(
      `INSERT INTO placement_drives
      (company_name, job_role, description, job_type,
       ctc_min, ctc_max, ctc_disclosed,
       stipend_amount, stipend_period,
       ppo_ctc_min, ppo_ctc_max, ppo_ctc_disclosed,
       eligible_batch, application_deadline, min_cgpa, created_by, drive_document_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        job_role,
        description,
        toDatabaseJobType(compensation.value.job_type),
        compensation.value.ctc_min,
        compensation.value.ctc_max,
        compensation.value.ctc_disclosed,
        compensation.value.stipend_amount,
        compensation.value.stipend_period,
        compensation.value.ppo_ctc_min,
        compensation.value.ppo_ctc_max,
        compensation.value.ppo_ctc_disclosed,
        eligible_batch,
        deadline,
        min_cgpa,
        created_by,
        driveDocumentUrl
      ]
    );

    const driveId = driveResult.insertId;

    // ✅ Insert program mapping
    for (const programId of normalizedPrograms) {

      await connection.query(
        `INSERT INTO drive_program_mapping
         (drive_id, program_id)
         VALUES (?, ?)`,
        [driveId, programId]
      );

    }

    await connection.commit();

    try {
      await notifyEligibleStudentsForDrive(driveId, 'created');
    } catch (notificationError) {
      console.error('Drive publish notification error:', notificationError);
    }

    res.status(201).json({
      message: 'Drive created successfully',
      drive_id: driveId
    });

  } catch (error) {

    await connection.rollback();

    console.error(error);

    res.status(500).json({
      message: 'Failed to create drive',
      error: error.message
    });

  } finally {

    connection.release();

  }

};
