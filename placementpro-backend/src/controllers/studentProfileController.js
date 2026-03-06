const db = require('../config/db');
const path = require('path');

// ── GET full profile ───────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
          s.student_id, s.prn, s.college_email, s.program_name, s.program_batch,
          s.placement_status, s.first_name, s.middle_name, s.last_name,
          s.personal_email, s.date_of_birth, s.gender, s.phone_number,
          s.whatsapp_number, s.whatsapp_link, s.linkedin_profile_url,
          s.city, s.state, s.country,
          s.std_x_percentage, s.std_x_cgpa,
          s.std_xii_percentage, s.std_xii_cgpa,
          s.ug_course_name, s.ug_specialization, s.ug_university,
          s.ug_percentage, s.ug_cgpa, s.ug_year,
          s.educational_background,
          s.sicsr_program_name, s.sicsr_specialization,
          s.sem1_gpa, s.sem2_gpa, s.sem3_gpa, s.cgpa, s.backlog,
          s.interested_job_roles, s.work_experience, s.total_work_experience,
          s.last_company_name, s.last_company_industry, s.cv_link,
          s.created_at,
          u.name, u.email
       FROM students s
       JOIN users u ON u.user_id = s.user_id
       WHERE s.user_id = ?`,
      [req.user.user_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json({ profile: rows[0] });

  } catch (err) {
    console.error('Get Profile Error:', err);
    res.status(500).json({ message: 'Failed to fetch profile', error: err.message });
  }
};

// ── UPDATE profile (editable fields only) ─────────────────
exports.updateProfile = async (req, res) => {
  try {
    // ── Sanitizer: converts empty strings to null, trims whitespace ──
    const toNull = (val) => (val === '' || val === undefined || val === null)
      ? null
      : val.toString().trim();

    const toNum = (val) => (val === '' || val === undefined || val === null)
      ? null
      : Number(val);

    const {
      first_name, middle_name, last_name, personal_email,
      date_of_birth, gender, phone_number, whatsapp_number,
      whatsapp_link, linkedin_profile_url, city, state, country,
      std_x_percentage, std_x_cgpa, std_xii_percentage, std_xii_cgpa,
      ug_course_name, ug_specialization, ug_university,
      ug_percentage, ug_cgpa, ug_year, educational_background,
      sem1_gpa, sem2_gpa, sem3_gpa, cgpa,
      interested_job_roles, work_experience, total_work_experience,
      last_company_name, last_company_industry
    } = req.body;

    const cv_link = req.file
      ? `/uploads/cv/${req.file.filename}`
      : toNull(req.body.cv_link);

    await db.query(
      `UPDATE students SET
          first_name = ?, middle_name = ?, last_name = ?,
          personal_email = ?, date_of_birth = ?, gender = ?,
          phone_number = ?, whatsapp_number = ?, whatsapp_link = ?,
          linkedin_profile_url = ?, city = ?, state = ?, country = ?,
          std_x_percentage = ?, std_x_cgpa = ?,
          std_xii_percentage = ?, std_xii_cgpa = ?,
          ug_course_name = ?, ug_specialization = ?, ug_university = ?,
          ug_percentage = ?, ug_cgpa = ?, ug_year = ?,
          educational_background = ?,
          sem1_gpa = ?, sem2_gpa = ?, sem3_gpa = ?, cgpa = ?,
          interested_job_roles = ?, work_experience = ?,
          total_work_experience = ?, last_company_name = ?,
          last_company_industry = ?, cv_link = ?
       WHERE user_id = ?`,
      [
        toNull(first_name),    toNull(middle_name),   toNull(last_name),
        toNull(personal_email), toNull(date_of_birth), toNull(gender),
        toNull(phone_number),  toNull(whatsapp_number), toNull(whatsapp_link),
        toNull(linkedin_profile_url), toNull(city), toNull(state), toNull(country),
        toNum(std_x_percentage),  toNum(std_x_cgpa),
        toNum(std_xii_percentage), toNum(std_xii_cgpa),
        toNull(ug_course_name), toNull(ug_specialization), toNull(ug_university),
        toNum(ug_percentage),  toNum(ug_cgpa),  toNum(ug_year),
        toNull(educational_background),
        toNum(sem1_gpa), toNum(sem2_gpa), toNum(sem3_gpa), toNum(cgpa),
        toNull(interested_job_roles), toNum(work_experience) ?? 0,
        toNum(total_work_experience), toNull(last_company_name),
        toNull(last_company_industry), cv_link,
        req.user.user_id
      ]
    );

    res.json({ message: 'Profile updated successfully', cv_link });

  } catch (err) {
    console.error('Update Profile Error:', err);
    res.status(500).json({ message: 'Failed to update profile', error: err.message });
  }
};