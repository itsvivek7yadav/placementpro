/**
 * services/offCampusService.js
 * Business logic for off-campus jobs
 */

const OffCampusJobModel = require('../models/offCampusJobModel');
const BookmarkModel = require('../models/bookmarkModel');

const OffCampusService = {

  // ─── JOBS ─────────────────────────────────────────────

  /**
   * Fetch jobs with filters and pagination
   * @param {Object} filters - { role_type, location, skills, date_from, date_to, source }
   * @param {Object} pagination - { page, limit }
   * @param {number|null} userId - if provided, attaches bookmark status
   */
  async getJobs(filters = {}, pagination = {}, userId = null) {
    const result = await OffCampusJobModel.getJobs(filters, pagination);

    if (userId && result.jobs.length > 0) {
      // Batch check bookmark status
      const bookmarkedIds = await getBookmarkedIds(userId, 'job');
      result.jobs = result.jobs.map(job => ({
        ...job,
        is_bookmarked: bookmarkedIds.has(job.id)
      }));
    }

    return result;
  },

  /**
   * Get a single job by ID
   */
  async getJobById(id, userId = null) {
    const job = await OffCampusJobModel.getJobById(id);
    if (!job) return null;

    if (userId) {
      job.is_bookmarked = await BookmarkModel.isBookmarked(userId, id, 'job');
    }
    return job;
  },

  // ─── BOOKMARKS ────────────────────────────────────────

  /**
   * Toggle bookmark for a job
   * Returns { action: 'bookmarked' | 'removed', item }
   */
  async toggleBookmark(userId, opportunityId, opportunityType) {
    if (!userId) throw new Error('userId is required for bookmarking');

    const alreadyBookmarked = await BookmarkModel.isBookmarked(
      userId, opportunityId, opportunityType
    );

    if (alreadyBookmarked) {
      await BookmarkModel.removeBookmark(userId, opportunityId, opportunityType);
      return { action: 'removed', opportunityId, opportunityType };
    } else {
      const exists = !!(await OffCampusJobModel.getJobById(opportunityId));
      if (!exists) throw new Error('Opportunity not found');

      const bookmark = await BookmarkModel.bookmarkOpportunity(
        userId, opportunityId, opportunityType
      );
      return { action: 'bookmarked', bookmark };
    }
  },

  /**
   * Get all bookmarks for a user
   */
  async getUserBookmarks(userId, type) {
    return BookmarkModel.getUserBookmarks(userId, type || 'job');
  },

  // ─── RECOMMENDATIONS ──────────────────────────────────

  /**
   * Generate and store simple content-based recommendations for a user.
   * Strategy: look at what they bookmarked, find similar active items.
   * @param {number} userId
   */
  async generateRecommendations(userId) {
    if (!userId) throw new Error('userId required');

    // Get user's bookmarked jobs to understand preferences
    const bookmarks = await BookmarkModel.getUserBookmarks(userId, 'job');
    const bookmarkedJobIds = new Set(bookmarks.map(b => b.id));

    // Collect role types and skills from bookmarked jobs
    const roleCounts = {};
    const skillCounts = {};

    for (const job of bookmarks) {
      if (job.role_type) {
        roleCounts[job.role_type] = (roleCounts[job.role_type] || 0) + 1;
      }
      const skills = Array.isArray(job.skills) ? job.skills : [];
      for (const skill of skills) {
        skillCounts[skill] = (skillCounts[skill] || 0) + 1;
      }
    }

    const topRole  = Object.entries(roleCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const topSkills = Object.entries(skillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([s]) => s);

    const recommendations = [];

    // Find similar jobs not yet bookmarked
    if (topRole || topSkills.length > 0) {
      const filters = {};
      if (topRole) filters.role_type = topRole;
      if (topSkills.length) filters.skills = topSkills;

      const { jobs } = await OffCampusJobModel.getJobs(filters, { page: 1, limit: 20 });

      for (const job of jobs) {
        if (bookmarkedJobIds.has(job.id)) continue;

        // Score based on skill overlap
        const jobSkills = Array.isArray(job.skills) ? job.skills : [];
        const overlap   = jobSkills.filter(s => topSkills.includes(s)).length;
        const score     = Math.min(100, overlap * 20 + (job.role_type === topRole ? 40 : 0));

        if (score > 20) {
          await BookmarkModel.saveRecommendation(
            userId, job.id, 'job', score,
            `Matches your interest in ${topRole || 'similar roles'}`
          );
          recommendations.push({ id: job.id, type: 'job', score });
        }
      }
    }

    return recommendations;
  },

  /**
   * Get existing recommendations for a user
   */
  async getRecommendations(userId, limit = 10) {
    return BookmarkModel.getUserRecommendations(userId, limit);
  }
};

// ─── HELPERS ──────────────────────────────────────────────

/**
 * Return a Set of bookmarked opportunity IDs of given type for a user
 */
async function getBookmarkedIds(userId, type) {
  const bookmarks = await BookmarkModel.getUserBookmarks(userId, type);
  return new Set(bookmarks.map(b => b.id));
}

module.exports = OffCampusService;
