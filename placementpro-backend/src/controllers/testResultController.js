const db = require('../config/db');

exports.getTestResults = async (req, res) => {
  try {
    const [results] = await db.query(
      `SELECT
          ta.attempt_id, ta.score, ta.total_marks,
          ta.submitted_at, ta.status, ta.started_at,
          s.prn, s.program_name, s.program_batch, s.cgpa,
          u.name AS student_name, u.email
       FROM test_attempts ta
       JOIN students s ON s.student_id = ta.student_id
       JOIN users u    ON u.user_id = s.user_id
       WHERE ta.test_id = ?
       ORDER BY ta.score DESC, ta.submitted_at ASC`,
      [req.params.test_id]
    );

    res.json({ results });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch results' });
  }
};