const { normalizeJobType, getPlacementPackageFromDrive } = require('../utils/driveCompensation');

function normalizePlacementType(jobType) {
  const normalized = normalizeJobType(jobType);
  if (!normalized) return null;
  if (normalized.includes('PPO')) return 'Internship + PPO';
  if (normalized.includes('INTERN')) return 'Internship';
  return 'FTE';
}

async function syncStudentsPlacementFromApplications(connection, studentIds = []) {
  const ids = [...new Set(studentIds.map(Number).filter(Number.isFinite))];
  if (!ids.length) return;

  const placeholders = ids.map(() => '?').join(', ');

  const [studentRows] = await connection.query(
    `SELECT student_id, placement_mode
     FROM students
     WHERE student_id IN (${placeholders})`,
    ids
  );

  if (!studentRows.length) return;

  const [selectedRows] = await connection.query(
    `SELECT
        a.student_id,
        pd.company_name,
        pd.job_type,
        pd.ctc_min,
        pd.ctc_max,
        pd.ctc_disclosed,
        pd.stipend_amount,
        pd.stipend_period,
        pd.ppo_ctc_min,
        pd.ppo_ctc_max,
        pd.ppo_ctc_disclosed,
        a.applied_at
     FROM applications a
     JOIN placement_drives pd ON pd.drive_id = a.drive_id
     WHERE a.student_id IN (${placeholders})
       AND a.result = 'SELECTED'
     ORDER BY a.student_id ASC, a.applied_at DESC, a.application_id DESC`,
    ids
  );

  const latestSelectedByStudent = new Map();
  selectedRows.forEach((row) => {
    if (!latestSelectedByStudent.has(row.student_id)) {
      latestSelectedByStudent.set(row.student_id, row);
    }
  });

  for (const student of studentRows) {
    const selected = latestSelectedByStudent.get(student.student_id);

    if (selected) {
      await connection.query(
        `UPDATE students
         SET placement_status = 'PLACED',
             placement_mode = 'ON_CAMPUS',
             placed_company = ?,
             placement_package = ?,
             placement_type = ?
         WHERE student_id = ?`,
        [
          selected.company_name || null,
          getPlacementPackageFromDrive(selected),
          normalizePlacementType(selected.job_type),
          student.student_id
        ]
      );
      continue;
    }

    if (!student.placement_mode || student.placement_mode === 'ON_CAMPUS' || student.placement_mode === 'NOT_PLACED') {
      await connection.query(
        `UPDATE students
         SET placement_status = 'NOT_PLACED',
             placement_mode = 'NOT_PLACED',
             placed_company = NULL,
             placement_package = NULL,
             placement_type = NULL
         WHERE student_id = ?`,
        [student.student_id]
      );
    }
  }
}

module.exports = {
  normalizePlacementType,
  syncStudentsPlacementFromApplications
};
