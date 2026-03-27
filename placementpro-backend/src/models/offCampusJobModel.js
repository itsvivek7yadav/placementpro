/**
 * models/offCampusJobModel.js
 * MySQL compatible version
 */

const db = require('../config/db'); // your existing mysql2 pool

const OffCampusJobModel = {

  async insertJob(job) {
    const {
      title, company, location, description, source_url, source,
      role_type, skills, summary, application_tip,
      salary_range, job_type, experience_level, posted_at, expires_at
    } = job;

    const query = `
      INSERT IGNORE INTO offcampus_jobs
        (title, company, location, description, source_url, source,
         role_type, skills, summary, application_tip,
         salary_range, job_type, experience_level, posted_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    // INSERT IGNORE silently skips duplicate key violations (our UNIQUE constraint)

    const values = [
      title, company, location || null, description || null,
      source_url, source || 'unknown',
      role_type || null,
      JSON.stringify(skills || []),
      summary || null, application_tip || null,
      salary_range || null, job_type || null,
      experience_level || null,
      posted_at || new Date(),
      expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    ];

    try {
      const [result] = await db.query(query, values);
      // affectedRows === 0 means it was a duplicate (INSERT IGNORE skipped it)
      return result.affectedRows > 0 ? { id: result.insertId } : null;
    } catch (err) {
      console.error('[OffCampusJobModel.insertJob] Error:', err.message);
      throw err;
    }
  },

  async getJobs(filters = {}, pagination = {}) {
    const { role_type, location, skills, date_from, date_to, source } = filters;
    const page   = parseInt(pagination.page)  || 1;
    const limit  = parseInt(pagination.limit) || 10;
    const offset = (page - 1) * limit;

    const conditions = ['is_active = 1', 'expires_at > NOW()'];
    const values = [];

    if (role_type) {
      conditions.push('role_type LIKE ?');
      values.push(`%${role_type}%`);
    }
    if (location) {
      conditions.push('location LIKE ?');
      values.push(`%${location}%`);
    }
    if (skills && skills.length > 0) {
      // MySQL JSON_OVERLAPS checks if any skill matches
      const skillArr = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim());
      conditions.push(`JSON_OVERLAPS(skills, ?)`);
      values.push(JSON.stringify(skillArr));
    }
    if (date_from) {
      conditions.push('posted_at >= ?');
      values.push(new Date(date_from));
    }
    if (date_to) {
      conditions.push('posted_at <= ?');
      values.push(new Date(date_to));
    }
    if (source) {
      conditions.push('source = ?');
      values.push(source);
    }

    const whereClause = conditions.join(' AND ');

    try {
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM offcampus_jobs WHERE ${whereClause}`,
        values
      );

      const [jobs] = await db.query(
        `SELECT * FROM offcampus_jobs WHERE ${whereClause}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
      );

      // Parse JSON skills field back to array
      const parsed = jobs.map(j => ({
        ...j,
        skills: typeof j.skills === 'string' ? JSON.parse(j.skills) : (j.skills || [])
      }));

      return {
        jobs: parsed,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (err) {
      console.error('[OffCampusJobModel.getJobs] Error:', err.message);
      throw err;
    }
  },

  async getJobById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM offcampus_jobs WHERE id = ? AND is_active = 1',
        [id]
      );
      if (!rows[0]) return null;
      const job = rows[0];
      job.skills = typeof job.skills === 'string' ? JSON.parse(job.skills) : (job.skills || []);
      return job;
    } catch (err) {
      console.error('[OffCampusJobModel.getJobById] Error:', err.message);
      throw err;
    }
  },

  async deleteExpiredUnbookmarkedJobs() {
    try {
      const [result] = await db.query(`
        DELETE FROM offcampus_jobs
        WHERE expires_at < NOW()
          AND id NOT IN (
            SELECT opportunity_id FROM bookmarked_opportunities
            WHERE opportunity_type = 'job'
          )
      `);
      return result.affectedRows;
    } catch (err) {
      console.error('[OffCampusJobModel.deleteExpiredUnbookmarkedJobs] Error:', err.message);
      throw err;
    }
  }
};

module.exports = OffCampusJobModel;