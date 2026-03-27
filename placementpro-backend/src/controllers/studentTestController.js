const db = require('../config/db');

exports.getMyTests = async (req, res) => {
  try {
    const [studentRows] = await db.query(
      `SELECT student_id, program_name, program_batch FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );

    if (studentRows.length === 0) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const student = studentRows[0];

    const [tests] = await db.query(
      `SELECT mt.*,
          COUNT(DISTINCT tq.question_id) AS question_count,
          ta.status     AS attempt_status,
          ta.score      AS my_score,
          ta.total_marks AS my_total_marks,
          ta.submitted_at
       FROM mock_tests mt
       JOIN test_program_mapping tpm ON tpm.test_id = mt.test_id
       JOIN programs p               ON p.program_id = tpm.program_id
       LEFT JOIN test_attempts ta    ON ta.test_id = mt.test_id AND ta.student_id = ?
       LEFT JOIN test_questions tq   ON tq.test_id = mt.test_id
       WHERE mt.status IN ('LIVE', 'CLOSED')
         AND mt.eligible_batch = ?
         AND p.program_name = ?
       GROUP BY mt.test_id
       ORDER BY mt.start_time DESC`,
      [student.student_id, student.program_batch, student.program_name]
    );

    res.json({ tests });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch tests' });
  }
};

exports.startTest = async (req, res) => {
  try {
    const testId = req.params.test_id;

    const [studentRows] = await db.query(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );
    const { student_id } = studentRows[0];

    const [[test]] = await db.query(
      `SELECT * FROM mock_tests WHERE test_id = ?`, [testId]
    );

    if (!test) return res.status(404).json({ message: 'Test not found' });
    if (test.status !== 'LIVE') return res.status(403).json({ message: 'Test is not live' });

    const now = new Date();
    if (now < new Date(test.start_time)) {
      return res.status(403).json({ message: 'Test has not started yet' });
    }
    if (now > new Date(test.end_time)) {
      return res.status(403).json({ message: 'Test window has closed' });
    }

    const [existing] = await db.query(
      `SELECT * FROM test_attempts WHERE test_id = ? AND student_id = ?`,
      [testId, student_id]
    );

    if (existing.length > 0 && existing[0].status === 'SUBMITTED') {
      return res.status(403).json({ message: 'You have already submitted this test' });
    }

    if (existing.length === 0) {
      await db.query(
        `INSERT INTO test_attempts (test_id, student_id) VALUES (?, ?)`,
        [testId, student_id]
      );
    }

    // ⚠️ Never send correct_ans to student
    const [questions] = await db.query(
      `SELECT question_id, question, option_a, option_b, option_c, option_d, marks, order_num
       FROM test_questions WHERE test_id = ?
       ORDER BY order_num, question_id`,
      [testId]
    );

    res.json({ test, questions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to start test' });
  }
};

exports.submitTest = async (req, res) => {
  const connection = await db.getConnection();
  try {
    const testId       = req.params.test_id;
    const { answers }  = req.body;

    const [studentRows] = await db.query(
      `SELECT student_id FROM students WHERE user_id = ?`,
      [req.user.user_id]
    );
    const { student_id } = studentRows[0];

    const [[attempt]] = await db.query(
      `SELECT * FROM test_attempts WHERE test_id = ? AND student_id = ?`,
      [testId, student_id]
    );

    if (!attempt)                        return res.status(404).json({ message: 'Attempt not found — did you start the test?' });
    if (attempt.status === 'SUBMITTED')  return res.status(400).json({ message: 'Already submitted' });

    await connection.beginTransaction();

    let score = 0, totalMarks = 0;

    for (const answer of answers) {
      const [[question]] = await connection.query(
        `SELECT correct_ans, marks FROM test_questions WHERE question_id = ?`,
        [answer.question_id]
      );

      if (!question) continue;

      totalMarks += question.marks;
      const isCorrect = answer.chosen_ans === question.correct_ans;
      if (isCorrect) score += question.marks;

      await connection.query(
        `INSERT INTO test_responses (attempt_id, question_id, chosen_ans, is_correct)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE chosen_ans = VALUES(chosen_ans), is_correct = VALUES(is_correct)`,
        [attempt.attempt_id, answer.question_id, answer.chosen_ans || null, isCorrect ? 1 : 0]
      );
    }

    await connection.query(
      `UPDATE test_attempts
       SET score = ?, total_marks = ?, status = 'SUBMITTED', submitted_at = NOW()
       WHERE attempt_id = ?`,
      [score, totalMarks, attempt.attempt_id]
    );

    await connection.commit();
    res.json({ message: 'Test submitted successfully!', score, total_marks: totalMarks });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Submit failed', error: err.message });
  } finally {
    connection.release();
  }
};