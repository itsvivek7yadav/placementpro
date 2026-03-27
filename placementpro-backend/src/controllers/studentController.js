const db = require('../config/db');


/**
 * 👨‍💼 TPO — Get all students
 */
exports.getAllStudents = async (req, res) => {
  try {
    const [students] = await db.query(`
      SELECT 
        s.student_id,
        s.program_name,
        s.program_batch,
        s.placement_status,
        s.college_email,
        s.prn,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.personal_email,
        s.date_of_birth,
        s.cgpa,
        s.phone_number,
        s.whatsapp_number,
        s.whatsapp_link,
        s.linkedin_profile_url,
        s.gender,
        s.city,
        s.state,
        s.country,
        s.std_x_percentage,
        s.std_x_cgpa,
        s.std_xii_percentage,
        s.std_xii_cgpa,
        s.ug_course_name,
        s.ug_specialization,
        s.ug_university,
        s.ug_percentage,
        s.ug_cgpa,
        s.ug_year,
        s.educational_background,
        s.sicsr_program_name,
        s.sicsr_specialization,
        s.sem1_gpa,
        s.sem2_gpa,
        s.sem3_gpa,
        s.backlog,
        s.work_experience,
        s.total_work_experience,
        s.last_company_name,
        s.last_company_industry,
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
