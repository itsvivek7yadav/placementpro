const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');

dotenv.config();

const app = express();

// ─── CORS Middleware (MUST BE FIRST) ────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:4200',
  'http://localhost:3000',
  'http://127.0.0.1:4200',
  process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));

// ─── JSON Parser Middleware ────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ─── DB Connection ─────────────────────────────────────────────────────────
require('./config/db');

// ─── Cron Jobs ─────────────────────────────────────────────────────────────
require('./cron/closeExpiredDrives');
require('./cron/closeExpiredMockTests');
require('./cron/remailWorker');

// ─── Off-Campus Cron Jobs ─────────────────────────────────────────────────
const { startScraperJob } = require('./cron/offCampusScraperJob');
const { startCleanupJob } = require('./cron/cleanupExpiredOpportunities');
startScraperJob();
startCleanupJob();

// ─── Route Imports ─────────────────────────────────────────────────────────
const authRoutes              = require('./routes/authRoutes');
const userRoutes              = require('./routes/userRoutes');
const placementDriveRoutes    = require('./routes/placementDriveRoutes');
const studentDriveRoutes      = require('./routes/studentDriveRoutes');
const applicationRoutes       = require('./routes/applicationRoutes');
const driveRoundRoutes        = require('./routes/driveRoundRoutes');
const applicationReviewRoutes = require('./routes/applicationReviewRoutes');
const tpoDashboardRoutes      = require('./routes/tpoDashboardRoutes');
const reportRoutes            = require('./routes/reportRoutes');
const notificationRoutes      = require('./routes/notificationRoutes');
const bulkUploadRoutes        = require('./routes/bulkUploadRoutes');
const studentRoutes           = require('./routes/studentRoutes');
const programRoutes           = require('./routes/programRoutes');
const studentProfileRoutes    = require('./routes/studentProfileRoutes');
const studentProgressRoutes   = require('./routes/studentProgressRoutes');
const mockTestRoutes          = require('./routes/mockTestRoutes');
const studentTestRoutes       = require('./routes/studentTestRoutes');
const resumeRoutes            = require('./routes/resumeRoutes');
const emailRoutes             = require('./routes/emailRoutes');
const offCampusRoutes         = require('./routes/offCampusRoutes');  // ← NEW

// ─── Route Mounts ──────────────────────────────────────────────────────────
app.use('/api/auth',               authRoutes);
app.use('/api/users',              userRoutes);
app.use('/api/placement-drives',   placementDriveRoutes);
app.use('/api/student-drives',     studentDriveRoutes);
app.use('/api/applications',       applicationRoutes);
app.use('/api/drives',             driveRoundRoutes);
app.use('/api/application-review', applicationReviewRoutes);
app.use('/api/tpo/dashboard',      tpoDashboardRoutes);
app.use('/api/reports',            reportRoutes);
app.use('/api/notifications',      notificationRoutes);
app.use('/api/bulk-upload',        bulkUploadRoutes);
app.use('/api/students',           studentRoutes);
app.use('/api/programs',           programRoutes);
app.use('/api/student-profile',    studentProfileRoutes);
app.use('/api/student-progress',   studentProgressRoutes);
app.use('/api/mock-tests',         mockTestRoutes);
app.use('/api/student-tests',      studentTestRoutes);
app.use('/api/resume',             resumeRoutes);
app.use('/api/tpo/email-campaigns', emailRoutes);
app.use('/api/offcampus',          offCampusRoutes);  // ← NEW

if (process.env.ALLOW_MANUAL_SCRAPER === 'true') {
  app.get('/api/run-scraper', async (req, res) => {
    const { runAllScrapers } = require('./cron/offCampusScraperJob');
    const result = await runAllScrapers();
    res.json(result);
  });
}


// 
// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('PlacementPro Backend Running 🚀');
});

// ─── 404 Handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// ─── Global Error Handler (MUST BE LAST) ───────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    status: err.status || 500
  });
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
