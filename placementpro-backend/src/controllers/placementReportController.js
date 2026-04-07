const db = require('../config/db');

const JOB_TYPE_LABELS = ['FTE', 'Internship', 'Internship + PPO'];

function parsePrograms(value) {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .flatMap((item) => String(item).split(','))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseAcademicYear(value) {
  if (!value) return null;
  const match = String(value).match(/(20\d{2})/);
  return match ? Number(match[1]) : null;
}

function buildInClause(values) {
  return values.map(() => '?').join(', ');
}

function roundTo(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function computeMedian(values) {
  if (!values.length) return 0;
  const sorted = [...values].map(Number).filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;

  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return roundTo((sorted[middle - 1] + sorted[middle]) / 2);
  }

  return roundTo(sorted[middle]);
}

function academicYearLabel(year) {
  const nextYear = String((year + 1) % 100).padStart(2, '0');
  return `${year}-${nextYear}`;
}

function buildStudentFilter(filters, alias = 's') {
  const clauses = [];
  const params = [];

  if (filters.batch) {
    clauses.push(`${alias}.program_batch = ?`);
    params.push(filters.batch);
  }

  if (filters.programs.length) {
    clauses.push(`${alias}.program_name IN (${buildInClause(filters.programs)})`);
    params.push(...filters.programs);
  }

  return { clauses, params };
}

function buildAcademicYearClause(filters, studentAlias = 's', applicationAlias = 'a', driveAlias = 'pd') {
  if (!filters.academicYear) {
    return { clause: '', params: [] };
  }

  return {
    clause: `YEAR(COALESCE(${applicationAlias}.applied_at, ${driveAlias}.application_deadline)) = ?`,
    params: [filters.academicYear]
  };
}

function normalizeJobType(jobType) {
  const normalized = String(jobType || '').trim().toLowerCase();

  if (normalized.includes('ppo')) return 'Internship + PPO';
  if (normalized.includes('intern')) return 'Internship';
  return 'FTE';
}

const DRIVE_PACKAGE_SQL = `CASE
  WHEN pd.job_type = 'FTE' AND COALESCE(pd.ctc_disclosed, 0) = 1 THEN COALESCE(pd.ctc_max, pd.ctc_min)
  WHEN pd.job_type = 'INTERNSHIP_PPO' AND COALESCE(pd.ppo_ctc_disclosed, 0) = 1 THEN COALESCE(pd.ppo_ctc_max, pd.ppo_ctc_min)
  ELSE NULL
END`;

async function getFilterOptions() {
  const [[batchRows], [programRows], [yearRows]] = await Promise.all([
    db.query(
      `SELECT DISTINCT program_batch
       FROM students
       WHERE program_batch IS NOT NULL AND program_batch <> ''
       ORDER BY program_batch DESC`
    ),
    db.query(
      `SELECT DISTINCT program_name
       FROM students
       WHERE program_name IS NOT NULL AND program_name <> ''
       ORDER BY program_name ASC`
    ),
    db.query(
      `SELECT DISTINCT YEAR(COALESCE(a.applied_at, pd.application_deadline)) AS academic_year
       FROM students s
       LEFT JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       WHERE COALESCE(a.applied_at, pd.application_deadline) IS NOT NULL
       ORDER BY academic_year DESC`
    )
  ]);

  return {
    batches: batchRows.map((row) => row.program_batch),
    programs: programRows.map((row) => row.program_name),
    academicYears: yearRows
      .map((row) => Number(row.academic_year))
      .filter(Number.isFinite)
      .map((year) => ({
        value: year,
        label: academicYearLabel(year)
      }))
  };
}

exports.getTpoPlacementReport = async (req, res) => {
  try {
    const filters = {
      batch: typeof req.query.batch === 'string' ? req.query.batch.trim() : '',
      programs: parsePrograms(req.query.program),
      academicYear: parseAcademicYear(req.query.academicYear)
    };

    const studentFilter = buildStudentFilter(filters, 's');
    const academicFilter = buildAcademicYearClause(filters, 's', 'a', 'pd');
    const studentWhere = studentFilter.clauses.length
      ? `WHERE ${studentFilter.clauses.join(' AND ')}`
      : '';

    const applicationClauses = [...studentFilter.clauses];
    const applicationParams = [...studentFilter.params];
    if (academicFilter.clause) {
      applicationClauses.push(academicFilter.clause);
      applicationParams.push(...academicFilter.params);
    }
    const applicationWhere = applicationClauses.length
      ? `WHERE ${applicationClauses.join(' AND ')}`
      : '';

    const filterOptionsPromise = getFilterOptions();

    const [eligibleRows] = await db.query(
      `SELECT COUNT(*) AS totalStudentsEligible
       FROM students s
       ${studentWhere}`,
      studentFilter.params
    );

    const [summaryRows] = await db.query(
      `SELECT
          COUNT(DISTINCT CASE WHEN s.placement_status = 'PLACED' THEN s.student_id END) AS totalStudentsPlaced,
          COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS totalOffersMade,
          COUNT(DISTINCT CASE WHEN a.result = 'PENDING' THEN a.student_id END) AS studentsAwaitingResult,
          COUNT(CASE WHEN a.result = 'ABSENT' THEN 1 END) AS absentApplications,
          COUNT(DISTINCT CASE WHEN a.result = 'ABSENT' THEN a.student_id END) AS studentsMarkedAbsent,
          AVG(CASE WHEN s.placement_status = 'PLACED' THEN s.placement_package END) AS averagePackage,
          MAX(CASE WHEN s.placement_status = 'PLACED' THEN s.placement_package END) AS highestPackage,
          COUNT(DISTINCT pd.company_name) AS totalCompaniesVisited,
          COUNT(DISTINCT CASE WHEN a.result = 'SELECTED' THEN pd.company_name END) AS recruitersWithSelections
       FROM students s
       LEFT JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere}`,
      applicationParams
    );

    const [packageRows] = await db.query(
      `SELECT s.placement_package AS package_value
       FROM students s
       LEFT JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere ? `${applicationWhere} AND` : 'WHERE'} s.placement_status = 'PLACED' AND s.placement_package IS NOT NULL
       GROUP BY s.student_id, s.placement_package
       ORDER BY s.placement_package ASC`,
      applicationParams
    );

    const [jobTypeRows] = await db.query(
      `SELECT s.placement_type AS job_type, COUNT(*) AS offers
       FROM students s
       LEFT JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere ? `${applicationWhere} AND` : 'WHERE'} s.placement_status = 'PLACED' AND s.placement_type IS NOT NULL
       GROUP BY s.placement_type`,
      applicationParams
    );

    const [companyRows] = await db.query(
      `SELECT
          pd.company_name,
          COUNT(a.application_id) AS totalApplications,
          COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS offers,
          AVG(CASE WHEN a.result = 'SELECTED' THEN ${DRIVE_PACKAGE_SQL} END) AS avgPackage,
          MAX(CASE WHEN a.result = 'SELECTED' THEN ${DRIVE_PACKAGE_SQL} END) AS highestPackage
       FROM students s
       JOIN applications a ON a.student_id = s.student_id
       JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere}
       GROUP BY pd.company_name
       ORDER BY offers DESC, avgPackage DESC, pd.company_name ASC`,
      applicationParams
    );

    const [trendRows] = await db.query(
      `SELECT
          DATE_FORMAT(COALESCE(a.applied_at, pd.application_deadline), '%Y-%m') AS period,
          COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS offers,
          COUNT(DISTINCT CASE WHEN s.placement_status = 'PLACED' THEN s.student_id END) AS placedStudents,
          AVG(CASE WHEN s.placement_status = 'PLACED' THEN s.placement_package END) AS averagePackage
       FROM students s
       JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere ? `${applicationWhere} AND` : 'WHERE'} COALESCE(a.applied_at, pd.application_deadline) IS NOT NULL
       GROUP BY period
       ORDER BY period ASC`,
      applicationParams
    );

    const [programRows] = await db.query(
      `SELECT
          s.program_name,
          COUNT(DISTINCT s.student_id) AS eligibleStudents,
          COUNT(DISTINCT CASE WHEN s.placement_status = 'PLACED' THEN s.student_id END) AS placedStudents
       FROM students s
       LEFT JOIN applications a
         ON a.student_id = s.student_id
         ${filters.academicYear ? 'AND YEAR(a.applied_at) = ?' : ''}
       ${studentWhere}
       GROUP BY s.program_name
       ORDER BY placedStudents DESC, eligibleStudents DESC, s.program_name ASC`,
      filters.academicYear
        ? [filters.academicYear, ...studentFilter.params]
        : studentFilter.params
    );

    const [studentTableRows] = await db.query(
      `SELECT
          s.student_id,
          CONCAT_WS(' ', s.first_name, s.middle_name, s.last_name) AS student_name,
          s.prn,
          s.program_name,
          s.program_batch,
          s.placement_status,
          COUNT(a.application_id) AS applicationsCount,
          COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS offerCount,
          COUNT(CASE WHEN a.result = 'PENDING' THEN 1 END) AS pendingCount,
          COUNT(CASE WHEN a.result = 'ABSENT' THEN 1 END) AS absentCount,
          COALESCE(s.placed_company, MAX(CASE WHEN a.result = 'SELECTED' THEN pd.company_name END)) AS selectedCompany,
          COALESCE(s.placement_type, MAX(CASE WHEN a.result = 'SELECTED' THEN pd.job_type END)) AS selectedJobType,
          COALESCE(s.placement_package, MAX(CASE WHEN a.result = 'SELECTED' THEN ${DRIVE_PACKAGE_SQL} END)) AS bestPackage,
          MAX(a.applied_at) AS lastAppliedAt
       FROM students s
       LEFT JOIN applications a ON a.student_id = s.student_id
       LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
       ${applicationWhere}
       GROUP BY s.student_id, s.first_name, s.middle_name, s.last_name, s.prn, s.program_name, s.program_batch, s.placement_status, s.placed_company, s.placement_type, s.placement_package
       ORDER BY bestPackage DESC, offerCount DESC, student_name ASC`,
      applicationParams
    );

    const filterOptions = await filterOptionsPromise;
    const totalStudentsEligible = Number(eligibleRows[0]?.totalStudentsEligible || 0);
    const summary = summaryRows[0] || {};
    const totalStudentsPlaced = Number(summary.totalStudentsPlaced || 0);
    const totalOffersMade = Number(summary.totalOffersMade || 0);
    const averagePackage = roundTo(summary.averagePackage);
    const highestPackage = roundTo(summary.highestPackage);
    const medianPackage = computeMedian(packageRows.map((row) => Number(row.package_value)));
    const totalCompaniesVisited = Number(summary.totalCompaniesVisited || 0);
    const studentsAwaitingResult = Number(summary.studentsAwaitingResult || 0);
    const studentsMarkedAbsent = Number(summary.studentsMarkedAbsent || 0);
    const absentApplications = Number(summary.absentApplications || 0);

    const placementPercentage = totalStudentsEligible
      ? roundTo((totalStudentsPlaced / totalStudentsEligible) * 100, 1)
      : 0;
    const offerRatio = totalStudentsEligible
      ? roundTo((totalOffersMade / totalStudentsEligible) * 100, 1)
      : 0;
    const absentRatio = totalOffersMade + absentApplications
      ? roundTo((absentApplications / (totalOffersMade + absentApplications)) * 100, 1)
      : 0;

    const jobTypeMap = new Map(JOB_TYPE_LABELS.map((label) => [label, 0]));
    jobTypeRows.forEach((row) => {
      const label = normalizeJobType(row.job_type);
      jobTypeMap.set(label, Number(row.offers || 0));
    });

    const jobTypeDistribution = JOB_TYPE_LABELS.map((label, index) => ({
      label,
      value: Number(jobTypeMap.get(label) || 0),
      color: ['#2563eb', '#10b981', '#f59e0b'][index]
    }));

    const topRecruiters = companyRows
      .filter((row) => Number(row.offers || 0) > 0)
      .slice(0, 8)
      .map((row) => ({
        companyName: row.company_name,
        offers: Number(row.offers || 0),
        totalApplications: Number(row.totalApplications || 0),
        avgPackage: roundTo(row.avgPackage),
        highestPackage: roundTo(row.highestPackage)
      }));

    const zeroSelectionCompanies = companyRows
      .filter((row) => Number(row.offers || 0) === 0)
      .map((row) => ({
        companyName: row.company_name,
        applications: Number(row.totalApplications || 0)
      }));

    const placementTrend = trendRows.map((row) => ({
      label: row.period,
      offers: Number(row.offers || 0),
      placedStudents: Number(row.placedStudents || 0),
      averagePackage: roundTo(row.averagePackage)
    }));

    const programPerformance = programRows.map((row) => {
      const eligibleStudents = Number(row.eligibleStudents || 0);
      const placedStudents = Number(row.placedStudents || 0);
      return {
        programName: row.program_name,
        eligibleStudents,
        placedStudents,
        placementPercentage: eligibleStudents
          ? roundTo((placedStudents / eligibleStudents) * 100, 1)
          : 0
      };
    });

    const studentTableData = studentTableRows.map((row) => ({
      studentId: row.student_id,
      studentName: row.student_name || 'Student',
      prn: row.prn,
      programName: row.program_name,
      batch: row.program_batch,
      placementStatus: row.placement_status,
      applicationsCount: Number(row.applicationsCount || 0),
      offerCount: Number(row.offerCount || 0),
      pendingCount: Number(row.pendingCount || 0),
      absentCount: Number(row.absentCount || 0),
      selectedCompany: row.selectedCompany,
      selectedJobType: row.selectedJobType,
      bestPackage: roundTo(row.bestPackage),
      lastAppliedAt: row.lastAppliedAt
    }));

    res.json({
      filterOptions,
      selectedFilters: {
        batch: filters.batch || null,
        programs: filters.programs,
        academicYear: filters.academicYear
          ? { value: filters.academicYear, label: academicYearLabel(filters.academicYear) }
          : null
      },
      summaryKPIs: {
        totalStudentsEligible,
        totalStudentsPlaced,
        placementPercentage,
        totalCompaniesVisited,
        averagePackage,
        medianPackage,
        highestPackage,
        totalOffersMade,
        studentsAwaitingResult,
        studentsMarkedAbsent,
        absentRatio,
        offerRatio,
        recruitersWithSelections: Number(summary.recruitersWithSelections || 0)
      },
      jobTypeDistribution,
      companyStats: {
        totalCompanies: companyRows.length,
        topRecruiters,
        zeroSelectionCompanies
      },
      trends: {
        placementTrend,
        programPerformance
      },
      studentTableData,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Placement Report Error:', error);
    res.status(500).json({
      message: 'Failed to load placement report',
      error: error.message
    });
  }
};
