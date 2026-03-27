const XLSX = require('xlsx');
const db   = require('../config/db');

exports.uploadQuestions = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  const testId = req.params.test_id;
  let data;

  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet    = workbook.Sheets[workbook.SheetNames[0]];
    data           = XLSX.utils.sheet_to_json(sheet);
  } catch (e) {
    return res.status(400).json({ message: 'Invalid Excel file' });
  }

  if (!data || data.length === 0) {
    return res.status(400).json({ message: 'Excel file is empty' });
  }

  const validAnswers = ['A', 'B', 'C', 'D'];
  const questions    = [];
  const errors       = [];

  data.forEach((row, index) => {
    const rowNum      = index + 2;
    const question    = row['Question']?.toString().trim();
    const option_a    = row['Option A']?.toString().trim();
    const option_b    = row['Option B']?.toString().trim();
    const option_c    = row['Option C']?.toString().trim();
    const option_d    = row['Option D']?.toString().trim();
    const correct_ans = row['Correct Answer']?.toString().trim().toUpperCase();
    const marks       = Number(row['Marks']) || 1;

    if (!question || !option_a || !option_b || !option_c || !option_d) {
      errors.push(`Row ${rowNum}: Missing required fields`);
      return;
    }
    if (!validAnswers.includes(correct_ans)) {
      errors.push(`Row ${rowNum}: Correct Answer must be A, B, C or D — got "${correct_ans}"`);
      return;
    }

    questions.push({ question, option_a, option_b, option_c, option_d, correct_ans, marks });
  });

  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation errors in Excel', errors });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    await connection.query(`DELETE FROM test_questions WHERE test_id = ?`, [testId]);

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      await connection.query(
        `INSERT INTO test_questions
           (test_id, question, option_a, option_b, option_c, option_d, correct_ans, marks, order_num)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [testId, q.question, q.option_a, q.option_b, q.option_c,
         q.option_d, q.correct_ans, q.marks, i + 1]
      );
    }

    await connection.commit();
    res.json({
      message: `${questions.length} questions uploaded successfully`,
      count: questions.length,
      questions
    });

  } catch (err) {
    await connection.rollback();
    console.error(err);
    res.status(500).json({ message: 'Failed to save questions', error: err.message });
  } finally {
    connection.release();
  }
};

exports.getQuestions = async (req, res) => {
  try {
    const [questions] = await db.query(
      `SELECT * FROM test_questions WHERE test_id = ? ORDER BY order_num, question_id`,
      [req.params.test_id]
    );
    res.json({ questions });
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch questions' });
  }
};