const pool = require('../config/db');

function deriveDriveStatus(drive) {
  const declaredResults = Number(drive.declaredResults || 0);
  const pendingResults = Number(drive.pendingResults || 0);
  const deadlinePassed = drive.application_deadline
    ? new Date(drive.application_deadline) <= new Date()
    : false;

  if (drive.status === 'LIVE' && !deadlinePassed) {
    return { statusLabel: 'Form Open', statusTone: 'open' };
  }

  if (declaredResults > 0 && pendingResults > 0) {
    return { statusLabel: 'Result Yet To Declare', statusTone: 'pending' };
  }

  if (declaredResults > 0 && pendingResults === 0) {
    return { statusLabel: 'Result Declared', statusTone: 'declared' };
  }

  return { statusLabel: 'Form Closed', statusTone: 'closed' };
}

exports.getDashboardStats = async (req, res) => {
  try {
    const [
      [students],
      [drives],
      [activeDrives],
      [applications],
      [placed],
      [driveStats]
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) AS totalStudents FROM students'),
      pool.query('SELECT COUNT(*) AS totalDrives FROM placement_drives'),
      pool.query("SELECT COUNT(*) AS activeDrives FROM placement_drives WHERE status = 'LIVE'"), // ✅ was 'OPEN'
      pool.query('SELECT COUNT(*) AS totalApplications FROM applications'),
      pool.query("SELECT COUNT(*) AS totalPlaced FROM students WHERE placement_status = 'PLACED'"),
      pool.query(`
        SELECT
          pd.drive_id,
          pd.company_name,
          pd.status,
          pd.application_deadline,
          COUNT(a.application_id) AS applicationCount,
          SUM(CASE WHEN a.result IN ('SELECTED', 'REJECTED') THEN 1 ELSE 0 END) AS declaredResults,
          SUM(CASE WHEN a.result = 'PENDING' THEN 1 ELSE 0 END) AS pendingResults
        FROM placement_drives pd
        LEFT JOIN applications a ON a.drive_id = pd.drive_id
        GROUP BY pd.drive_id, pd.company_name, pd.status, pd.application_deadline
        ORDER BY pd.application_deadline DESC, pd.drive_id DESC
        LIMIT 8
      `)
    ]);

    const normalizedDriveStats = driveStats.map((drive) => ({
      ...drive,
      ...deriveDriveStatus(drive)
    }));

    res.status(200).json({
      totalStudents:     students[0].totalStudents,
      totalDrives:       drives[0].totalDrives,
      activeDrives:      activeDrives[0].activeDrives,
      totalApplications: applications[0].totalApplications,
      totalPlaced:       placed[0].totalPlaced,
      driveStats: normalizedDriveStats
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats', error: error.message });
  }
};
