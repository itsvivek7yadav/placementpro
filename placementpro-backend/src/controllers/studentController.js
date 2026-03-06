const db = require('../config/db');


/**
 * 👨‍💼 TPO — Get all students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT 
        s.student_id,
        s.prn,
        s.first_name,
        s.last_name,
        s.program_name,
        s.program_batch,
        s.cgpa,
        s.placement_status,
        s.college_email,
        s.personal_email,
        s.phone_number,
        s.gender,
        s.city,
        s.state,
        s.ug_course_name,
        s.ug_specialization,
        s.ug_percentage,
        s.ug_cgpa,
        s.ug_year,
        s.sicsr_program_name,
        s.sicsr_specialization,
        s.sem1_gpa,
        s.sem2_gpa,
        s.sem3_gpa,
        s.backlog,
        s.work_experience,
        s.total_work_experience,
        s.last_company_name,
        s.interested_job_roles,
        u.name,
        u.email
      FROM students s
      LEFT JOIN users u ON s.user_id = u.user_id
      ORDER BY s.student_id DESC
    `);

    res.json({ students });

  } catch (err) {
    console.error("❌ Get Students Error:", err);
    res.status(500).json({ message: "Failed to fetch students", error: err.message });
  }
};
