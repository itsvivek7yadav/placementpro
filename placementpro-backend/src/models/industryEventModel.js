/**
 * models/industryEventModel.js
 * MySQL compatible version
 */

const db = require('../config/db');

const IndustryEventModel = {

  async insertEvent(event) {
    const {
      title, organizer, location, event_url, source,
      description, summary, event_type, tags,
      is_online, is_free, event_date, registration_deadline, expires_at
    } = event;

    const query = `
      INSERT IGNORE INTO industry_events
        (title, organizer, location, event_url, source,
         description, summary, event_type, tags,
         is_online, is_free, event_date, registration_deadline, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      title,
      organizer || null,
      location  || null,
      event_url,
      source    || 'unknown',
      description || null,
      summary     || null,
      event_type  || null,
      JSON.stringify(tags || []),
      is_online === true ? 1 : 0,
      is_free   === true ? 1 : 0,
      event_date  ? new Date(event_date)  : null,
      registration_deadline ? new Date(registration_deadline) : null,
      expires_at  || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
    ];

    try {
      const [result] = await db.query(query, values);
      return result.affectedRows > 0 ? { id: result.insertId } : null;
    } catch (err) {
      console.error('[IndustryEventModel.insertEvent] Error:', err.message);
      throw err;
    }
  },

  async getEvents(filters = {}, pagination = {}) {
    const { event_type, is_online, is_free, date_from, date_to, source } = filters;
    const page   = parseInt(pagination.page)  || 1;
    const limit  = parseInt(pagination.limit) || 10;
    const offset = (page - 1) * limit;

    const conditions = ['is_active = 1', 'expires_at > NOW()'];
    const values = [];

    if (event_type) {
      conditions.push('event_type LIKE ?');
      values.push(`%${event_type}%`);
    }
    if (is_online !== undefined && is_online !== '') {
      conditions.push('is_online = ?');
      values.push(is_online === 'true' || is_online === true ? 1 : 0);
    }
    if (is_free !== undefined && is_free !== '') {
      conditions.push('is_free = ?');
      values.push(is_free === 'true' || is_free === true ? 1 : 0);
    }
    if (date_from) {
      conditions.push('event_date >= ?');
      values.push(new Date(date_from));
    }
    if (date_to) {
      conditions.push('event_date <= ?');
      values.push(new Date(date_to));
    }
    if (source) {
      conditions.push('source = ?');
      values.push(source);
    }

    const whereClause = conditions.join(' AND ');

    try {
      const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM industry_events WHERE ${whereClause}`,
        values
      );

      const [events] = await db.query(
        `SELECT * FROM industry_events WHERE ${whereClause}
         ORDER BY event_date ASC LIMIT ? OFFSET ?`,
        [...values, limit, offset]
      );

      const parsed = events.map(e => ({
        ...e,
        tags:      typeof e.tags === 'string' ? JSON.parse(e.tags) : (e.tags || []),
        is_online: e.is_online === 1,
        is_free:   e.is_free   === 1
      }));

      return {
        events: parsed,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      };
    } catch (err) {
      console.error('[IndustryEventModel.getEvents] Error:', err.message);
      throw err;
    }
  },

  async getEventById(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM industry_events WHERE id = ? AND is_active = 1',
        [id]
      );
      if (!rows[0]) return null;
      const evt = rows[0];
      evt.tags      = typeof evt.tags === 'string' ? JSON.parse(evt.tags) : (evt.tags || []);
      evt.is_online = evt.is_online === 1;
      evt.is_free   = evt.is_free   === 1;
      return evt;
    } catch (err) {
      console.error('[IndustryEventModel.getEventById] Error:', err.message);
      throw err;
    }
  },

  async deleteExpiredUnbookmarkedEvents() {
    try {
      const [result] = await db.query(`
        DELETE FROM industry_events
        WHERE expires_at < NOW()
          AND id NOT IN (
            SELECT opportunity_id FROM bookmarked_opportunities
            WHERE opportunity_type = 'event'
          )
      `);
      return result.affectedRows;
    } catch (err) {
      console.error('[IndustryEventModel.deleteExpiredUnbookmarkedEvents] Error:', err.message);
      throw err;
    }
  }
};

module.exports = IndustryEventModel;