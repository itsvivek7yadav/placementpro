const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');

dotenv.config();

const app = express();

// ─── Middlewares ───────────────────────────────────────────────────────────
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));
app.use(express.json());

// ─── DB Connection ─────────────────────────────────────────────────────────
require('./config/db');

// ─── Cron Jobs ─────────────────────────────────────────────────────────────
require('./cron/closeExpiredDrives');

// ─── Route Imports ─────────────────────────────────────────────────────────
const authRoutes               = require('./routes/authRoutes');
const userRoutes               = require('./routes/userRoutes');
const placementDriveRoutes     = require('./routes/placementDriveRoutes');
const studentDriveRoutes       = require('./routes/studentDriveRoutes');
const applicationRoutes        = require('./routes/applicationRoutes');        // student apply/my/withdraw
const applicationReviewRoutes  = require('./routes/applicationReviewRoutes');  // TPO review
const tpoDashboardRoutes       = require('./routes/tpoDashboardRoutes');
const bulkUploadRoutes         = require('./routes/bulkUploadRoutes');
const studentRoutes            = require('./routes/studentRoutes');
const programRoutes            = require('./routes/programRoutes');
const studentProfileRoutes     = require('./routes/studentProfileRoutes');
                                 
// const driveNoticeRoutes        = require('./routes/driveNoticeRoutes');

// ─── Route Mounts ──────────────────────────────────────────────────────────
app.use('/api/auth',                 authRoutes);
app.use('/api/users',                userRoutes);
app.use('/api/drives',               placementDriveRoutes);
app.use('/api/student/drives',       studentDriveRoutes);
app.use('/api/student/applications', applicationRoutes);        // student apply/my/withdraw
app.use('/api/tpo/applications',     applicationReviewRoutes);  // TPO view/update applicants
app.use('/api/tpo-dashboard',        tpoDashboardRoutes);
app.use('/api/upload',               bulkUploadRoutes);
app.use('/api/programs',             programRoutes);
app.use('/api/students',             studentRoutes);
app.use('/api/student/profile',      studentProfileRoutes);
app.use('/uploads',                  express.static('uploads'));

// app.use('/api/tpo/drives',           driveNoticeRoutes);
// ─── Health Check ──────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('PlacementPro Backend Running 🚀');
});

// ─── Start Server ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});