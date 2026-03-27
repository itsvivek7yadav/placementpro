/**
 * scrapers/adzunaScraper.js
 * Fetches jobs from Adzuna API and saves to DB
 * Filters for: business analyst, data analyst, consultant, fresher roles
 */

const axios = require('axios');
const OffCampusJobModel = require('../models/offCampusJobModel');
const { summarize } = require('../services/summarizerService');

const ADZUNA_APP_ID  = process.env.ADZUNA_APP_ID;
const ADZUNA_API_KEY = process.env.ADZUNA_API_KEY;
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'in';

// Target roles for filtering
const TARGET_ROLES = [
  'business analyst',
  'data analyst',
  'consultant',
  'fresher',
  'graduate trainee',
  'junior analyst',
  'entry level analyst'
];

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isTargetRole(title = '', description = '') {
  const text = `${title} ${description}`.toLowerCase();
  return TARGET_ROLES.some(role => text.includes(role));
}

function classifyRoleType(title = '') {
  const t = title.toLowerCase();
  if (t.includes('business analyst') || t.includes('ba ')) return 'business analyst';
  if (t.includes('data analyst'))   return 'data analyst';
  if (t.includes('consultant'))     return 'consultant';
  if (t.includes('fresher') || t.includes('graduate') || t.includes('entry')) return 'fresher';
  return 'other';
}

/**
 * Fetch one page of Adzuna results
 * Correct URL format: /v1/api/jobs/{country}/search/{page}?app_id=...&app_key=...&what=...
 */
async function fetchPage(searchTerm, page = 1) {
  // ── FIX: page goes in the PATH, not as a query param ──
  const url = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/${page}`;

  const response = await axios.get(url, {
    params: {
      app_id:           ADZUNA_APP_ID,
      app_key:          ADZUNA_API_KEY,
      results_per_page: 20,
      what:             searchTerm,
      // ── FIX: removed invalid 'content_type' and duplicate 'page' params ──
    },
    timeout: 15000
  });

  return response.data?.results || [];
}

/**
 * Main scraper function
 */
async function scrapeAdzuna() {
  if (!ADZUNA_APP_ID || !ADZUNA_API_KEY) {
    console.warn('[AdzunaScraper] Missing ADZUNA_APP_ID or ADZUNA_API_KEY — skipping');
    return { saved: 0, skipped: 0, errors: 0 };
  }

  console.log('[AdzunaScraper] Starting...');

  const searchTerms = [
    'business analyst fresher',
    'data analyst entry level',
    'junior consultant',
    'graduate analyst'
  ];

  let saved = 0, skipped = 0, errors = 0;

  for (const term of searchTerms) {
    try {
      const jobs = await fetchPage(term, 1);
      console.log(`[AdzunaScraper] Fetched ${jobs.length} jobs for "${term}"`);

      for (const job of jobs) {
        try {
          const title       = job.title || '';
          const company     = job.company?.display_name || 'Unknown';
          const location    = job.location?.display_name || '';
          const description = job.description || '';
          const source_url  = job.redirect_url || '';

          if (!title || !source_url) { skipped++; continue; }
          if (!isTargetRole(title, description)) { skipped++; continue; }

          // Summarize with AI
          const aiResult = await summarize(title, company, description);

          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);

          const inserted = await OffCampusJobModel.insertJob({
            title,
            company,
            location,
            description,
            source_url,
            source:           'adzuna',
            role_type:        aiResult.role_type || classifyRoleType(title),
            skills:           aiResult.skills,
            summary:          aiResult.short_summary,
            application_tip:  aiResult.application_tip,
            salary_range:     job.salary_min && job.salary_max
                                ? `${job.salary_min}-${job.salary_max}`
                                : null,
            job_type:         job.contract_time || null,
            experience_level: classifyRoleType(title) === 'fresher' ? 'fresher' : 'junior',
            posted_at:        job.created ? new Date(job.created) : new Date(),
            expires_at:       expiresAt
          });

          if (inserted) { saved++; }
          else          { skipped++; }

          await delay(500);

        } catch (jobErr) {
          console.error('[AdzunaScraper] Job processing error:', jobErr.message);
          errors++;
        }
      }

      await delay(2000);

    } catch (termErr) {
      console.error(`[AdzunaScraper] Error fetching "${term}":`, termErr.message);
      // Log the full error for debugging
      if (termErr.response) {
        console.error(`[AdzunaScraper] Status: ${termErr.response.status}`, JSON.stringify(termErr.response.data));
      }
      errors++;
    }
  }

  console.log(`[AdzunaScraper] Done. Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
  return { saved, skipped, errors };
}

module.exports = { scrapeAdzuna };