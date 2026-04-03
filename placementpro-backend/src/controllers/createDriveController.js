const db = require('../config/db');
const { notifyEligibleStudentsForDrive } = require('../services/notificationService');

exports.createDrive = async (req, res) => {

  const {
    company_name,
    job_role,
    description,
    job_type,
    ctc,
    eligible_batch,
    application_deadline,
    min_cgpa,
    eligible_programs
  } = req.body;

  if (
    !company_name ||
    !job_role ||
    !application_deadline ||
    !eligible_batch ||
    !eligible_programs ||
    eligible_programs.length === 0
  ) {
    return res.status(400).json({
      message: 'Missing required fields'
    });
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
      (company_name, job_role, description, job_type, ctc,
       eligible_batch, application_deadline, min_cgpa, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        company_name,
        job_role,
        description,
        job_type,
        ctc,
        eligible_batch,
        deadline,
        min_cgpa,
        created_by
      ]
    );

    const driveId = driveResult.insertId;

    // ✅ Insert program mapping
    for (const programId of eligible_programs) {

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
