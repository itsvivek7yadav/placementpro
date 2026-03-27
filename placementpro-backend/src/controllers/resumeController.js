const db = require('../config/db'); // mysql2/promise pool

exports.getStudentData = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated', receivedUser: req.user });
    }

    const [rows] = await db.query(`
      SELECT
        student_id, user_id,
        first_name, last_name, middle_name,
        personal_email, phone_number,
        city, state, country,
        ug_course_name, ug_specialization, ug_cgpa, ug_year,
        linkedin_profile_url, cv_link
      FROM students
      WHERE user_id = ?
    `, [userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Student not found', userId });
    }

    const s = rows[0];
    return res.json({
      success: true,
      data: {
        studentId:      s.student_id,
        firstName:      s.first_name || '',
        lastName:       s.last_name || '',
        middleName:     s.middle_name || '',
        email:          s.personal_email || '',
        phone:          s.phone_number || '',
        city:           s.city || '',
        state:          s.state || '',
        country:        s.country || '',
        collegeName:    'SICSR',
        degree:         s.ug_course_name || '',
        branch:         s.ug_specialization || '',
        cgpa:           s.ug_cgpa || 0,
        graduationYear: s.ug_year || new Date().getFullYear() + 1,
        linkedinUrl:    s.linkedin_profile_url || '',
        portfolioUrl:   s.cv_link || ''
      }
    });
  } catch (error) {
    console.error('[getStudentData] error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getStudentResumes = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [rows] = await db.query(`
      SELECT r.id, r.student_id, r.resume_type AS resumeType, r.template, r.created_at, r.updated_at
      FROM student_resumes r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE s.user_id = ?
      ORDER BY r.created_at DESC
    `, [userId]);

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[getStudentResumes] error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.getResume = async (req, res) => {
  try {
    const userId   = req.user?.user_id;
    const resumeId = req.params.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [rows] = await db.query(`
      SELECT r.id, r.student_id, r.resume_type AS resumeType, r.template, r.data, r.created_at, r.updated_at
      FROM student_resumes r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE r.id = ? AND s.user_id = ?
    `, [resumeId, userId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const resume = rows[0];
    if (typeof resume.data === 'string') {
      try { resume.data = JSON.parse(resume.data); } catch { resume.data = {}; }
    }

    return res.json({ success: true, data: resume });
  } catch (error) {
    console.error('[getResume] error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.saveResume = async (req, res) => {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const { resumeType, data, template } = req.body;
    if (!data?.personalSummary?.trim()) {
      return res.status(400).json({ error: 'Personal summary is required' });
    }

    // Resolve user_id → student_id
    const [students] = await db.query(
      'SELECT student_id FROM students WHERE user_id = ?', [userId]
    );
    if (students.length === 0) {
      return res.status(404).json({ error: 'Student profile not found' });
    }

    const studentId = students[0].student_id;
    const dataJson  = JSON.stringify(data);

    // Upsert by resumeType
    const [existing] = await db.query(
      'SELECT id FROM student_resumes WHERE student_id = ? AND resume_type = ?',
      [studentId, resumeType]
    );

    if (existing.length > 0) {
      await db.query(
        'UPDATE student_resumes SET data = ?, template = ?, updated_at = NOW() WHERE id = ?',
        [dataJson, template || 'modern', existing[0].id]
      );
      return res.json({ success: true, message: 'Resume updated', id: existing[0].id });
    }

    // Enforce max 2 resumes
    const [[{ total }]] = await db.query(
      'SELECT COUNT(*) AS total FROM student_resumes WHERE student_id = ?', [studentId]
    );
    if (total >= 2) {
      return res.status(400).json({ error: 'Maximum 2 resumes allowed' });
    }

    const [result] = await db.query(
      'INSERT INTO student_resumes (student_id, resume_type, template, data, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
      [studentId, resumeType, template || 'modern', dataJson]
    );
    return res.json({ success: true, message: 'Resume saved', id: result.insertId });

  } catch (error) {
    console.error('[saveResume] error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.deleteResume = async (req, res) => {
  try {
    const userId   = req.user?.user_id;
    const resumeId = req.params.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [result] = await db.query(`
      DELETE r FROM student_resumes r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE r.id = ? AND s.user_id = ?
    `, [resumeId, userId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }
    return res.json({ success: true, message: 'Resume deleted' });

  } catch (error) {
    console.error('[deleteResume] error:', error);
    return res.status(500).json({ error: error.message });
  }
};

exports.generateAndDownloadPDF = async (req, res) => {
  try {
    const userId   = req.user?.user_id;
    const { resumeId } = req.body;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const [resumeRows] = await db.query(`
      SELECT r.data, r.template
      FROM student_resumes r
      INNER JOIN students s ON s.student_id = r.student_id
      WHERE r.id = ? AND s.user_id = ?
    `, [resumeId, userId]);

    if (resumeRows.length === 0) {
      return res.status(404).json({ error: 'Resume not found' });
    }

    const [studentRows] = await db.query(`
      SELECT first_name, last_name, personal_email, phone_number,
             city, state, ug_course_name, ug_specialization, ug_cgpa, ug_year
      FROM students WHERE user_id = ?
    `, [userId]);

    if (studentRows.length === 0) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const resumeRow = resumeRows[0];
    const s         = studentRows[0];

    let resumeData = resumeRow.data;
    if (typeof resumeData === 'string') {
      try { resumeData = JSON.parse(resumeData); } catch { resumeData = {}; }
    }

    const studentData = {
      firstName:      s.first_name || '',
      lastName:       s.last_name || '',
      email:          s.personal_email || '',
      phone:          s.phone_number || '',
      city:           s.city || '',
      state:          s.state || '',
      collegeName:    'SICSR',
      degree:         s.ug_course_name || '',
      branch:         s.ug_specialization || '',
      cgpa:           s.ug_cgpa || 0,
      graduationYear: s.ug_year || ''
    };

    const pdfGenerator = require('../services/pdfGenerator');
    const pdfBuffer = await pdfGenerator.generatePDF(resumeData, studentData, resumeRow.template || 'modern');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="resume_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    return res.end(pdfBuffer);

  } catch (error) {
    console.error('[generateAndDownloadPDF] error:', error);
    return res.status(500).json({ error: error.message });
  }
};
