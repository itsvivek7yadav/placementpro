const db = require('../config/db');

exports.createTest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const {
      title, description, duration_mins,
      start_time, end_time, eligible_batch,
      eligible_programs, status
    } = req.body;

    if (!title || !duration_mins || !start_time || !end_time || !eligible_batch || !eligible_programs?.length) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    await connection.beginTransaction();

    const [result] = await connection.query(
      `INSERT INTO mock_tests
         (title, description, duration_mins, start_time, end_time, eligible_batch, status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, description || null, duration_mins, start_time, end_time,
       eligible_batch, status || 'DRAFT', req.user.user_id]
    );

    const testId = result.insertId;

    for (const programId of eligible_programs) {
      await connection.query(
        `INSERT INTO test_program_mapping (test_id, program_id) VALUES (?, ?)`,
        [testId, programId]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Test created', test_id: testId });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to create test', error: err.message });
  } finally {
    connection.release();
  }
};

exports.getAllTests = async (req, res) => {
  try {
    const [tests] = await db.query(
      `SELECT mt.*,
          COUNT(DISTINCT tq.question_id) AS question_count,
          COUNT(DISTINCT ta.attempt_id)  AS attempt_count,
          GROUP_CONCAT(DISTINCT p.program_name SEPARATOR ', ') AS eligible_programs
       FROM mock_tests mt
       LEFT JOIN test_questions tq      ON tq.test_id = mt.test_id
       LEFT JOIN test_attempts ta       ON ta.test_id = mt.test_id
       LEFT JOIN test_program_mapping tpm ON tpm.test_id = mt.test_id
       LEFT JOIN programs p             ON p.program_id = tpm.program_id
       GROUP BY mt.test_id
       ORDER BY mt.created_at DESC`
    );
    res.json({ tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
};

exports.getTestById = async (req, res) => {
  try {
    const [[test]] = await db.query(
      `SELECT mt.*,
          GROUP_CONCAT(DISTINCT tpm.program_id) AS program_ids
       FROM mock_tests mt
       LEFT JOIN test_program_mapping tpm ON tpm.test_id = mt.test_id
       WHERE mt.test_id = ?
       GROUP BY mt.test_id`,
      [req.params.id]
    );
    if (!test) return res.status(404).json({ message: 'Test not found' });
    res.json({ test });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch test' });
  }
};

exports.publishTest = async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      `SELECT COUNT(*) as count FROM test_questions WHERE test_id = ?`,
      [req.params.id]
    );

    if (count === 0) {
      return res.status(400).json({ message: 'Add at least one question before publishing' });
    }

    const [result] = await db.query(
      `UPDATE mock_tests SET status = 'LIVE' WHERE test_id = ? AND status = 'DRAFT'`,
      [req.params.id]
    );

    if (result.affectedRows === 0) {
      return res.status(400).json({ message: 'Test is not in DRAFT status' });
    }

    res.json({ message: 'Test published successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to publish test' });
  }
};

exports.closeTest = async (req, res) => {
  try {
    await db.query(
      `UPDATE mock_tests SET status = 'CLOSED' WHERE test_id = ?`,
      [req.params.id]
    );
    res.json({ message: 'Test closed' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to close test' });
  }
};

exports.deleteTest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`DELETE FROM test_responses WHERE attempt_id IN (SELECT attempt_id FROM test_attempts WHERE test_id = ?)`, [req.params.id]);
    await connection.query(`DELETE FROM test_attempts WHERE test_id = ?`, [req.params.id]);
    await connection.query(`DELETE FROM test_questions WHERE test_id = ?`, [req.params.id]);
    await connection.query(`DELETE FROM test_program_mapping WHERE test_id = ?`, [req.params.id]);
    await connection.query(`DELETE FROM mock_tests WHERE test_id = ? AND status = 'DRAFT'`, [req.params.id]);
    await connection.commit();
    res.json({ message: 'Test deleted' });
  } catch (err) {
    await connection.rollback();
    res.status(500).json({ message: 'Failed to delete test' });
  } finally {
    connection.release();
  }
};