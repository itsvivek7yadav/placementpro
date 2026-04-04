/**
 * models/bookmarkModel.js
 * MySQL compatible version
 */

const db = require('../config/db');

const BookmarkModel = {

  async bookmarkOpportunity(userId, opportunityId, opportunityType) {
    if (opportunityType !== 'job') {
      throw new Error('opportunityType must be "job"');
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

        rows = [
          ...rows,
          ...jobRows.map(j => ({
            ...j,
            skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || [])
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
      const [jobRows] = await db.query(`
        SELECT j.*, r.score, r.reason, r.is_seen, 'job' AS opportunity_type
        FROM offcampus_jobs j
        JOIN recommended_opportunities r
          ON r.opportunity_id = j.id AND r.opportunity_type = 'job'
        WHERE r.user_id = ? AND j.is_active = 1 AND j.expires_at > NOW()
        ORDER BY r.score DESC
        LIMIT ?
      `, [userId, limit]);

      return [
        ...jobRows.map(j => ({
          ...j,
          skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || [])
        }))
      ].sort((a, b) => b.score - a.score);
    } catch (err) {
      console.error('[BookmarkModel.getUserRecommendations] Error:', err.message);
      throw err;
    }
  }
};

module.exports = BookmarkModel;
