-- Placement Report Dashboard sample queries
-- These mirror the API aggregations used by /api/reports/tpo

-- 1. Eligible students by batch/program filters
SELECT COUNT(*) AS totalStudentsEligible
FROM students s
WHERE s.program_batch = ?
  AND s.program_name IN (?, ?);

-- 2. Offers / placed students / company coverage
SELECT
  COUNT(DISTINCT CASE WHEN a.result = 'SELECTED' THEN a.student_id END) AS totalStudentsPlaced,
  COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS totalOffersMade,
  COUNT(DISTINCT pd.company_name) AS totalCompaniesVisited,
  AVG(CASE WHEN a.result = 'SELECTED' THEN pd.ctc END) AS averagePackage,
  MAX(CASE WHEN a.result = 'SELECTED' THEN pd.ctc END) AS highestPackage
FROM students s
LEFT JOIN applications a ON a.student_id = s.student_id
LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
WHERE s.program_batch = ?
  AND s.program_name IN (?, ?)
  AND YEAR(COALESCE(a.applied_at, s.placed_at, pd.application_deadline)) = ?;

-- 3. Median package source values
SELECT pd.ctc
FROM students s
JOIN applications a ON a.student_id = s.student_id
JOIN placement_drives pd ON pd.drive_id = a.drive_id
WHERE a.result = 'SELECTED'
  AND s.program_batch = ?
ORDER BY pd.ctc ASC;

-- 4. Job type placement breakdown
SELECT pd.job_type, COUNT(*) AS offers
FROM students s
JOIN applications a ON a.student_id = s.student_id
JOIN placement_drives pd ON pd.drive_id = a.drive_id
WHERE a.result = 'SELECTED'
  AND s.program_batch = ?
GROUP BY pd.job_type;

-- 5. Recruiter insights
SELECT
  pd.company_name,
  COUNT(a.application_id) AS totalApplications,
  COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS offers,
  AVG(CASE WHEN a.result = 'SELECTED' THEN pd.ctc END) AS avgPackage
FROM students s
JOIN applications a ON a.student_id = s.student_id
JOIN placement_drives pd ON pd.drive_id = a.drive_id
WHERE s.program_batch = ?
GROUP BY pd.company_name
ORDER BY offers DESC, avgPackage DESC;

-- 6. Monthly placement trend
SELECT
  DATE_FORMAT(COALESCE(a.applied_at, s.placed_at, pd.application_deadline), '%Y-%m') AS period,
  COUNT(CASE WHEN a.result = 'SELECTED' THEN 1 END) AS offers,
  COUNT(DISTINCT CASE WHEN a.result = 'SELECTED' THEN a.student_id END) AS placedStudents
FROM students s
JOIN applications a ON a.student_id = s.student_id
LEFT JOIN placement_drives pd ON pd.drive_id = a.drive_id
WHERE s.program_batch = ?
GROUP BY period
ORDER BY period ASC;
