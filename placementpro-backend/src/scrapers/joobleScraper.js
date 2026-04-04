const axios = require('axios');
const OffCampusJobModel = require('../models/offCampusJobModel');
const { summarize } = require('../services/summarizerService');

const JOOBLE_API_KEY = process.env.JOOBLE_API_KEY;

const SEARCH_TERMS = [
  'business analyst fresher',
  'data analyst entry level',
  'junior consultant',
  'graduate analyst'
];

function mapRoleType(title = '') {
  const value = title.toLowerCase();
  if (value.includes('business analyst')) return 'business analyst';
  if (value.includes('data analyst')) return 'data analyst';
  if (value.includes('consultant')) return 'consultant';
  if (value.includes('graduate') || value.includes('trainee') || value.includes('fresher')) return 'fresher';
  return 'analyst';
}

async function scrapeJooble() {
  if (!JOOBLE_API_KEY) {
    console.warn('[JoobleScraper] Missing JOOBLE_API_KEY — skipping');
    return { saved: 0, skipped: 0, errors: 0 };
  }

  console.log('[JoobleScraper] Starting...');

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const keywords of SEARCH_TERMS) {
    try {
      const response = await axios.post(
        `https://jooble.org/api/${JOOBLE_API_KEY}`,
        {
          keywords,
          location: 'India',
          page: 1
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 15000
        }
      );

      const jobs = response.data?.jobs || [];

      for (const job of jobs) {
        try {
          const title = job.title || '';
          const company = job.company || 'Unknown';
          const sourceUrl = job.link || '';

          if (!title || !sourceUrl) {
            skipped++;
            continue;
          }

          const summary = await summarize(title, company, job.snippet || '');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const inserted = await OffCampusJobModel.insertJob({
            title,
            company,
            location: job.location || 'India',
            description: job.snippet || '',
            source_url: sourceUrl,
            source: 'jooble',
            role_type: summary.role_type || mapRoleType(title),
            skills: summary.skills,
            summary: summary.short_summary,
            application_tip: summary.application_tip,
            salary_range: job.salary || null,
            job_type: null,
            experience_level: 'fresher',
            posted_at: job.updated ? new Date(job.updated) : new Date(),
            expires_at: expiresAt
          });

          if (inserted) saved++;
          else skipped++;
        } catch (jobErr) {
          console.error('[JoobleScraper] Job processing error:', jobErr.message);
          errors++;
        }
      }
    } catch (err) {
      console.error(`[JoobleScraper] Error for ${keywords}:`, err.message);
      errors++;
    }
  }

  console.log(`[JoobleScraper] Done. Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
  return { saved, skipped, errors };
}

module.exports = { scrapeJooble };
