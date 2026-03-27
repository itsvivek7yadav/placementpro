/**
 * controllers/offCampusController.js
 */

const OffCampusService = require('../services/offCampusService');

async function getJobs(req, res) {
  try {
    const { role_type, location, skills, date_from, date_to, source, page = 1, limit = 10 } = req.query;
    const filters = { role_type, location, skills: skills ? skills.split(',') : undefined, date_from, date_to, source };
    Object.keys(filters).forEach(k => !filters[k] && delete filters[k]);
    const userId = req.user?.user_id || null;
    const result = await OffCampusService.getJobs(filters, { page, limit }, userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[offCampusController.getJobs] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch jobs' });
  }
}

async function getEvents(req, res) {
  try {
    const { event_type, is_online, is_free, date_from, date_to, source, page = 1, limit = 10 } = req.query;
    const filters = { event_type, is_online, is_free, date_from, date_to, source };
    Object.keys(filters).forEach(k => filters[k] === undefined && delete filters[k]);
    const userId = req.user?.user_id || null;
    const result = await OffCampusService.getEvents(filters, { page, limit }, userId);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[offCampusController.getEvents] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch events' });
  }
}

async function getJobById(req, res) {
  try {
    const { id } = req.params;
    if (!id || isNaN(Number(id))) return res.status(400).json({ success: false, message: 'Invalid job ID' });
    const userId = req.user?.user_id || null;
    const job = await OffCampusService.getJobById(Number(id), userId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.status(200).json({ success: true, data: job });
  } catch (err) {
    console.error('[offCampusController.getJobById] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch job' });
  }
}

async function toggleBookmark(req, res) {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    const { opportunityId, opportunityType } = req.body;
    if (!opportunityId || !opportunityType) return res.status(400).json({ success: false, message: 'opportunityId and opportunityType are required' });
    if (!['job', 'event'].includes(opportunityType)) return res.status(400).json({ success: false, message: 'opportunityType must be "job" or "event"' });
    const result = await OffCampusService.toggleBookmark(userId, Number(opportunityId), opportunityType);
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    console.error('[offCampusController.toggleBookmark] Error:', err.message);
    if (err.message === 'Opportunity not found') return res.status(404).json({ success: false, message: err.message });
    return res.status(500).json({ success: false, message: 'Bookmark operation failed' });
  }
}

async function getRecommendations(req, res) {
  try {
    const userId = req.user?.user_id;
    if (!userId) return res.status(401).json({ success: false, message: 'Authentication required' });
    const { refresh } = req.query;
    if (refresh === 'true') await OffCampusService.generateRecommendations(userId);
    const recommendations = await OffCampusService.getRecommendations(userId, 10);
    return res.status(200).json({ success: true, data: recommendations });
  } catch (err) {
    console.error('[offCampusController.getRecommendations] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch recommendations' });
  }
}

// ── NEW: GET /api/offcampus/bookmarks ─────────────────────────────────────────
async function getUserBookmarks(req, res) {
  try {
    const userId = req.user?.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    const bookmarks = await OffCampusService.getUserBookmarks(userId);
    return res.status(200).json({ success: true, data: bookmarks });
  } catch (err) {
    console.error('[offCampusController.getUserBookmarks] Error:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to fetch bookmarks' });
  }
}

module.exports = {
  getJobs,
  getEvents,
  getJobById,
  toggleBookmark,
  getRecommendations,
  getUserBookmarks      // ← NEW
};
