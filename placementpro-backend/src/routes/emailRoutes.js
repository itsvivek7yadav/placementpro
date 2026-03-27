const express = require("express");
const router = express.Router();
const multer = require("multer");
const emailController = require("../controllers/emailController");

const upload = multer({ dest: "uploads/" });

// List all campaigns
router.get("/", emailController.getAllCampaigns);

// Upload CSV and create campaign
router.post("/upload", upload.single("csvFile"), emailController.uploadCampaign);

// Get single campaign stats
router.get("/:campaignId", emailController.getCampaignDetails);

// Get all emails in queue for a campaign
router.get("/:campaignId/emails", emailController.getCampaignEmails);

module.exports = router;