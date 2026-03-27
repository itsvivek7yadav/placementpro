/**
 * models/bookmarkModel.js
 * MySQL compatible version
 */

const db = require('../config/db');

const BookmarkModel = {

  async bookmarkOpportunity(userId, opportunityId, opportunityType) {
    if (!['job', 'event'].includes(opportunityType)) {
      throw new Error('opportunityType must be "job" or "event"');
    }

    try {
      // INSERT IGNORE skips the row silently if UNIQUE key already exists
      const [result] = await db.query(
        `INSERT IGNORE INTO bookmarked_opportunities
           (user_id, opportunity_id, opportunity_type)
         VALUES (?, ?, ?)`,
        [userId, opportunityId, opportunityType]
      );
      return result.affectedRows > 0 ? { userId, opportunityId, opportunityType } : null;
    } catch (err) {
      console.error('[BookmarkModel.bookmarkOpportunity] Error:', err.message);
      throw err;
    }
  },

  async removeBookmark(userId, opportunityId, opportunityType) {
    try {
      const [result] = await db.query(
        `DELETE FROM bookmarked_opportunities
         WHERE user_id = ? AND opportunity_id = ? AND opportunity_type = ?`,
        [userId, opportunityId, opportunityType]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error('[BookmarkModel.removeBookmark] Error:', err.message);
      throw err;
    }
  },

  async isBookmarked(userId, opportunityId, opportunityType) {
    try {
      const [rows] = await db.query(
        `SELECT id FROM bookmarked_opportunities
         WHERE user_id = ? AND opportunity_id = ? AND opportunity_type = ?`,
        [userId, opportunityId, opportunityType]
      );
      return rows.length > 0;
    } catch (err) {
      console.error('[BookmarkModel.isBookmarked] Error:', err.message);
      throw err;
    }
  },

  async getUserBookmarks(userId, type) {
    try {
      let rows = [];

      if (!type || type === 'job') {
        const [jobRows] = await db.query(`
          SELECT j.*, b.created_at AS bookmarked_at, 'job' AS opportunity_type
          FROM offcampus_jobs j
          JOIN bookmarked_opportunities b
            ON b.opportunity_id = j.id AND b.opportunity_type = 'job'
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC
        `, [userId]);

        // Parse JSON skills
        rows = [
          ...rows,
          ...jobRows.map(j => ({
            ...j,
            skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || [])
          }))
        ];
      }

      if (!type || type === 'event') {
        const [evtRows] = await db.query(`
          SELECT e.*, b.created_at AS bookmarked_at, 'event' AS opportunity_type
          FROM industry_events e
          JOIN bookmarked_opportunities b
            ON b.opportunity_id = e.id AND b.opportunity_type = 'event'
          WHERE b.user_id = ?
          ORDER BY b.created_at DESC
        `, [userId]);

        rows = [
          ...rows,
          ...evtRows.map(e => ({
            ...e,
            tags:      typeof e.tags === 'string' ? JSON.parse(e.tags) : (e.tags || []),
            is_online: e.is_online === 1,
            is_free:   e.is_free   === 1
          }))
        ];
      }

      return rows;
    } catch (err) {
      console.error('[BookmarkModel.getUserBookmarks] Error:', err.message);
      throw err;
    }
  },

  async saveRecommendation(userId, opportunityId, opportunityType, score, reason) {
    try {
      // INSERT ... ON DUPLICATE KEY UPDATE (MySQL equivalent of upsert)
      const [result] = await db.query(`
        INSERT INTO recommended_opportunities
          (user_id, opportunity_id, opportunity_type, score, reason)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE score = VALUES(score), reason = VALUES(reason)
      `, [userId, opportunityId, opportunityType, score, reason]);

      return { userId, opportunityId, opportunityType, score, reason };
    } catch (err) {
      console.error('[BookmarkModel.saveRecommendation] Error:', err.message);
      throw err;
    }
  },

  async getUserRecommendations(userId, limit = 10) {
    try {
      const half = Math.floor(limit / 2);
      const ceil = Math.ceil(limit / 2);

      const [jobRows] = await db.query(`
        SELECT j.*, r.score, r.reason, r.is_seen, 'job' AS opportunity_type
        FROM offcampus_jobs j
        JOIN recommended_opportunities r
          ON r.opportunity_id = j.id AND r.opportunity_type = 'job'
        WHERE r.user_id = ? AND j.is_active = 1 AND j.expires_at > NOW()
        ORDER BY r.score DESC
        LIMIT ?
      `, [userId, half]);

      const [evtRows] = await db.query(`
        SELECT e.*, r.score, r.reason, r.is_seen, 'event' AS opportunity_type
        FROM industry_events e
        JOIN recommended_opportunities r
          ON r.opportunity_id = e.id AND r.opportunity_type = 'event'
        WHERE r.user_id = ? AND e.is_active = 1 AND e.expires_at > NOW()
        ORDER BY r.score DESC
        LIMIT ?
      `, [userId, ceil]);

      return [
        ...jobRows.map(j => ({
          ...j,
          skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || [])
        })),
        ...evtRows.map(e => ({
          ...e,
          tags:      typeof e.tags === 'string' ? JSON.parse(e.tags) : (e.tags || []),
          is_online: e.is_online === 1,
          is_free:   e.is_free   === 1
        }))
      ].sort((a, b) => b.score - a.score);
    } catch (err) {
      console.error('[BookmarkModel.getUserRecommendations] Error:', err.message);
      throw err;
    }
  }
};

module.exports = BookmarkModel;