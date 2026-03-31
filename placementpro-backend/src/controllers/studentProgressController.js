const db = require('../config/db');

async function getStudentByUserId(userId) {
  const [rows] = await db.query(
    `SELECT
        s.student_id,
        s.user_id,
        s.prn,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.program_name,
        s.program_batch,
        s.cgpa,
        s.placement_status,
        s.placed_company,
        s.placement_mode,
        s.placement_package,
        s.placed_at,
        s.college_email,
        s.personal_email,
        s.phone_number,
        u.name,
        u.email
     FROM students s
     LEFT JOIN users u ON u.user_id = s.user_id
     WHERE s.user_id = ?
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
}

async function getStudentById(studentId) {
  const [rows] = await db.query(
    `SELECT
        s.student_id,
        s.user_id,
        s.prn,
        s.first_name,
        s.middle_name,
        s.last_name,
        s.program_name,
        s.program_batch,
        s.cgpa,
        s.placement_status,
        s.placed_company,
        s.placement_mode,
        s.placement_package,
        s.placed_at,
        s.college_email,
        s.personal_email,
        s.phone_number,
        u.name,
        u.email
     FROM students s
     LEFT JOIN users u ON u.user_id = s.user_id
     WHERE s.student_id = ?
     LIMIT 1`,
    [studentId]
  );

  return rows[0] || null;
}

function roundTo(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

async function attachRoundDetails(applications) {
  if (!applications.length) {
    return applications;
  }

  const applicationIds = applications.map((application) => application.application_id);
  const placeholders = applicationIds.map(() => '?').join(', ');

  const [roundRows] = await db.query(
    `SELECT
        ars.application_id,
        ars.round_id,
        ars.status,
        ars.remarks,
        dr.round_name,
        dr.round_order
     FROM applicant_round_status ars
     JOIN drive_rounds dr ON dr.round_id = ars.round_id
     WHERE ars.application_id IN (${placeholders})
     ORDER BY dr.round_order ASC`,
    applicationIds
  );

  const grouped = new Map();
  roundRows.forEach((row) => {
    if (!grouped.has(row.application_id)) {
      grouped.set(row.application_id, []);
    }

    grouped.get(row.application_id).push({
      round_id: row.round_id,
      round_name: row.round_name,
      round_order: row.round_order,
      status: row.status,
      remarks: row.remarks
    });
  });

  return applications.map((application) => {
    const rounds = grouped.get(application.application_id) || [];
    const currentRound =
      rounds.find((round) => round.round_id === application.current_round_id) ||
      rounds.find((round) => round.status === 'PENDING') ||
      [...rounds].reverse().find((round) => round.status === 'ABSENT') ||
      [...rounds].reverse().find((round) => round.status === 'REJECTED') ||
      [...rounds].reverse().find((round) => round.status === 'CLEARED') ||
      null;

    return {
      ...application,
      rounds,
      current_round_name: currentRound?.round_name || null,
      current_round_order: currentRound?.round_order || null,
      current_round_status: currentRound?.status || null
    };
  });
}

function buildProgressResponse(student, applications, tests) {
  const submittedTests = tests.filter(test => test.attempt_status === 'SUBMITTED');
  const startedTests = tests.filter(test => !!test.attempt_status);
  const selectedApplications = applications.filter(app => app.result === 'SELECTED');
  const rejectedApplications = applications.filter(app => app.result === 'REJECTED');
  const absentApplications = applications.filter(app => app.result === 'ABSENT');
  const pendingApplications = applications.filter(app => app.result === 'PENDING');
  const distinctCompanies = new Set(applications.map(app => app.company_name).filter(Boolean));

  const testPercentages = submittedTests
    .map(test => {
      const score = Number(test.my_score || 0);
      const total = Number(test.my_total_marks || 0);
      return total > 0 ? (score / total) * 100 : 0;
    });

  const averageTestPercentage = testPercentages.length
    ? roundTo(testPercentages.reduce((sum, value) => sum + value, 0) / testPercentages.length)
    : 0;

  const bestTestPercentage = testPercentages.length
    ? roundTo(Math.max(...testPercentages))
    : 0;

  const decidedApplications = selectedApplications.length + rejectedApplications.length + absentApplications.length;
  const applicationSuccessRate = decidedApplications
    ? roundTo((selectedApplications.length / decidedApplications) * 100)
    : 0;

  const attemptRate = tests.length
    ? roundTo((submittedTests.length / tests.length) * 100)
    : 0;

  return {
    student: {
      student_id: student.student_id,
      name: student.name || [student.first_name, student.middle_name, student.last_name].filter(Boolean).join(' ') || 'Student',
      first_name: student.first_name,
      middle_name: student.middle_name,
      last_name: student.last_name,
      prn: student.prn,
      program_name: student.program_name,
      program_batch: student.program_batch,
      cgpa: student.cgpa,
      placement_status: student.placement_status,
      placed_company: student.placed_company,
      placement_mode: student.placement_mode,
      placement_package: student.placement_package,
      placed_at: student.placed_at,
      college_email: student.college_email,
      personal_email: student.personal_email,
      phone_number: student.phone_number || student.email || null
    },
    overview: {
      totalApplications: applications.length,
      totalCompaniesRegistered: distinctCompanies.size,
      selectedCount: selectedApplications.length,
      rejectedCount: rejectedApplications.length,
      pendingCount: pendingApplications.length,
      totalPublishedTests: tests.length,
      appearedTests: startedTests.length,
      submittedTests: submittedTests.length,
      averageTestPercentage,
      bestTestPercentage,
      attemptRate,
      applicationSuccessRate
    },
    insights: [
      {
        label: 'Placement Status',
        value: student.placement_status === 'PLACED' ? 'Placed' : 'Actively seeking',
        tone: student.placement_status === 'PLACED' ? 'positive' : 'neutral'
      },
      {
        label: 'Drive Engagement',
        value: `${applications.length} drive${applications.length === 1 ? '' : 's'} registered`,
        tone: applications.length >= 3 ? 'positive' : 'neutral'
      },
      {
        label: 'Mock Test Readiness',
        value: `${submittedTests.length}/${tests.length} completed`,
        tone: submittedTests.length > 0 ? 'positive' : 'neutral'
      },
      {
        label: 'Average Test Performance',
        value: `${averageTestPercentage}%`,
        tone: averageTestPercentage >= 70 ? 'positive' : averageTestPercentage >= 40 ? 'warning' : 'neutral'
      }
    ],
    applications: applications.map(app => ({
      application_id: app.application_id,
      drive_id: app.drive_id,
      company_name: app.company_name,
      job_role: app.job_role,
      job_type: app.job_type,
      ctc: app.ctc,
      drive_status: app.drive_status,
      application_status: app.status,
      result: app.result,
      applied_at: app.applied_at,
      application_deadline: app.application_deadline,
      current_round_name: app.current_round_name,
      current_round_order: app.current_round_order,
      current_round_status: app.current_round_status,
      rounds: app.rounds || []
    })),
    tests: tests.map(test => {
      const score = Number(test.my_score || 0);
      const total = Number(test.my_total_marks || 0);

      return {
        test_id: test.test_id,
        title: test.title,
        status: test.status,
        start_time: test.start_time,
        end_time: test.end_time,
        duration_mins: test.duration_mins,
        question_count: test.question_count,
        attempt_status: test.attempt_status,
        my_score: score,
        my_total_marks: total,
        submitted_at: test.submitted_at,
        percentage: total > 0 ? roundTo((score / total) * 100) : 0
      };
    })
  };
}

async function getApplicationsByStudentId(studentId) {
  const [applications] = await db.query(
    `SELECT
        a.application_id,
        a.status,
        a.result,
        a.current_round_id,
        a.applied_at,
        pd.drive_id,
        pd.company_name,
        pd.job_role,
        pd.job_type,
        pd.ctc,
        pd.application_deadline,
        pd.status AS drive_status
     FROM applications a
     JOIN placement_drives pd ON pd.drive_id = a.drive_id
     WHERE a.student_id = ?
     ORDER BY a.applied_at DESC`,
    [studentId]
  );

  return attachRoundDetails(applications);
}

async function getTestsByStudent(student) {
  await db.query(
    `UPDATE mock_tests
     SET status = 'CLOSED'
     WHERE status = 'LIVE'
       AND end_time <= NOW()`
  );

  const [tests] = await db.query(
    `SELECT
        mt.test_id,
        mt.title,
        mt.status,
        mt.start_time,
        mt.end_time,
        mt.duration_mins,
        COUNT(DISTINCT tq.question_id) AS question_count,
        ta.status AS attempt_status,
        ta.score AS my_score,
        ta.total_marks AS my_total_marks,
        ta.submitted_at
     FROM mock_tests mt
     JOIN test_program_mapping tpm ON tpm.test_id = mt.test_id
     JOIN programs p ON p.program_id = tpm.program_id
     LEFT JOIN test_attempts ta ON ta.test_id = mt.test_id AND ta.student_id = ?
     LEFT JOIN test_questions tq ON tq.test_id = mt.test_id
     WHERE mt.status IN ('LIVE', 'CLOSED')
       AND mt.eligible_batch = ?
       AND p.program_name = ?
     GROUP BY
       mt.test_id, mt.title, mt.status, mt.start_time, mt.end_time, mt.duration_mins,
       ta.status, ta.score, ta.total_marks, ta.submitted_at
     ORDER BY mt.start_time DESC`,
    [student.student_id, student.program_batch, student.program_name]
  );

  return tests;
}

async function sendProgress(res, student) {
  const [applications, tests] = await Promise.all([
    getApplicationsByStudentId(student.student_id),
    getTestsByStudent(student)
  ]);

  res.json(buildProgressResponse(student, applications, tests));
}

exports.getMyProgress = async (req, res) => {
  try {
    const student = await getStudentByUserId(req.user.user_id);

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }

    await sendProgress(res, student);
  } catch (err) {
    console.error('Get My Progress Error:', err);
    res.status(500).json({ message: 'Failed to fetch placement progress', error: err.message });
  }
};

exports.getStudentProgressById = async (req, res) => {
  try {
    const student = await getStudentById(req.params.student_id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    await sendProgress(res, student);
  } catch (err) {
    console.error('Get Student Progress Error:', err);
    res.status(500).json({ message: 'Failed to fetch student progress', error: err.message });
  }
};

exports.updatePlacementStatus = async (req, res) => {
  try {
    const {
      placement_status,
      placed_company,
      placement_mode,
      placement_package,
      placed_at
    } = req.body;
    const allowedPlacementModes = ['ON_CAMPUS', 'OFF_CAMPUS', 'FAMILY_BUSINESS', 'HIGHER_STUDIES', 'NOT_PLACED'];

    if (!['PLACED', 'NOT_PLACED'].includes(placement_status)) {
      return res.status(400).json({ message: 'placement_status must be PLACED or NOT_PLACED' });
    }

    if (placement_mode && !allowedPlacementModes.includes(placement_mode)) {
      return res.status(400).json({ message: 'placement_mode is invalid' });
    }

    if (placement_status === 'PLACED' && !placement_mode) {
      return res.status(400).json({ message: 'placement_mode is required when marking a student placed' });
    }

    if (placement_status === 'PLACED' && placement_mode === 'NOT_PLACED') {
      return res.status(400).json({ message: 'placement_mode cannot be NOT_PLACED when placement_status is PLACED' });
    }

    const normalizedPackage = placement_package === '' || placement_package == null
      ? null
      : Number(placement_package);

    if (normalizedPackage != null && Number.isNaN(normalizedPackage)) {
      return res.status(400).json({ message: 'placement_package must be a valid number' });
    }

    const student = await getStudentById(req.params.student_id);

    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    const nextPlacementMode = placement_status === 'PLACED'
      ? placement_mode
      : 'NOT_PLACED';
    const nextPlacedCompany = placement_status === 'PLACED'
      ? (placed_company || null)
      : null;
    const nextPlacementPackage = placement_status === 'PLACED'
      ? normalizedPackage
      : null;
    const nextPlacedAt = placement_status === 'PLACED'
      ? (placed_at || null)
      : null;

    await db.query(
      `UPDATE students
       SET placement_status = ?,
           placed_company = ?,
           placement_mode = ?,
           placement_package = ?,
           placed_at = ?
       WHERE student_id = ?`,
      [
        placement_status,
        nextPlacedCompany,
        nextPlacementMode,
        nextPlacementPackage,
        nextPlacedAt,
        req.params.student_id
      ]
    );

    res.json({
      message: `Student marked as ${placement_status}`,
      student_id: Number(req.params.student_id),
      placement_status,
      placed_company: nextPlacedCompany,
      placement_mode: nextPlacementMode,
      placement_package: nextPlacementPackage,
      placed_at: nextPlacedAt
    });
  } catch (err) {
    console.error('Update Placement Status Error:', err);
    res.status(500).json({ message: 'Failed to update placement status', error: err.message });
  }
};
