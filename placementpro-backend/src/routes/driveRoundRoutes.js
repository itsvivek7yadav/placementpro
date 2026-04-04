const express = require('express');
const router = express.Router();

const controller = require('../controllers/driveRoundController');
const { verifyToken, isTPO } = require('../middlewares/authMiddleware');

router.post('/:driveId/rounds', verifyToken, isTPO, controller.createDriveRounds);
router.get('/:driveId/applications', verifyToken, isTPO, controller.getDriveApplications);
router.post('/:driveId/rounds/:roundId/bulk-update', verifyToken, isTPO, controller.bulkUpdateRoundStatus);
router.post('/:driveId/export-resumes', verifyToken, isTPO, controller.exportApplicantResumesZip);

module.exports = router;
