const pool = require('../config/db');

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
          COUNT(a.application_id) AS applicationCount
        FROM placement_drives pd
        LEFT JOIN applications a ON a.drive_id = pd.drive_id
        GROUP BY pd.drive_id, pd.company_name, pd.status
        ORDER BY pd.drive_id DESC
        LIMIT 8
      `)
    ]);

    res.status(200).json({
      totalStudents:     students[0].totalStudents,
      totalDrives:       drives[0].totalDrives,
      activeDrives:      activeDrives[0].activeDrives,
      totalApplications: applications[0].totalApplications,
      totalPlaced:       placed[0].totalPlaced,
      driveStats
    });

  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ message: 'Failed to load dashboard stats', error: error.message });
  }
};