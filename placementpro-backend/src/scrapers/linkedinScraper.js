/**
 * scrapers/linkedinScraper.js
 *
 * Uses LinkedIn's public guest API — no login required.
 *
 * IMPORTANT RATE LIMIT REALITY (March 2026):
 * LinkedIn blocks after ~10 requests from the same IP.
 * Strategy: run only 2-3 searches per cron cycle, rotate keywords
 * across runs so all keywords get covered over multiple cycles.
 *
 * Endpoints:
 *   Search : https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search
 *   Detail : https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}
 */

const axios             = require('axios');
const cheerio           = require('cheerio');
const OffCampusJobModel = require('../models/offCampusJobModel');
const { summarize }     = require('../services/summarizerService');

// ── Config ────────────────────────────────────────────────────────────────────

// ALL keywords — rotated across cron runs, not all at once
const ALL_KEYWORDS = [
  'business analyst fresher',
  'data analyst entry level',
  'junior consultant',
  'graduate analyst',
  'fresher analyst india'
];

// Only 1 location per run to keep request count low
const LOCATIONS = ['India', 'Pune', 'Mumbai', 'Bangalore', 'Hyderabad'];

// KEY SETTING: only 2 searches per run to stay under LinkedIn's rate limit
// Across 4 daily runs (every 6h), all 5 keywords rotate through
const MAX_SEARCHES_PER_RUN = 2;
const MAX_PAGES            = 1;       // 1 page per search = 25 results max
const RESULTS_PER_PAGE     = 25;
const MAX_JOB_AGE_HOURS    = 72;

// Long delays to avoid triggering rate limits
const DELAY_BETWEEN_JOBS    = 3000;   // 3s between detail fetches
const DELAY_BETWEEN_SEARCHES = 8000;  // 8s between searches

const HEADERS = {
  'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Referer':         'https://www.linkedin.com/jobs/'
};

const BASE_URL       = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const DETAIL_URL_TPL = 'https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/{job_id}';

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms) {
  const jitter = Math.floor(Math.random() * 1000); // add random jitter
  return new Promise(resolve => setTimeout(resolve, ms + jitter));
}

function isWithinAgeLimit(datetimeAttr) {
  if (!datetimeAttr) return true;
  try {
    const ageHrs = (Date.now() - new Date(datetimeAttr).getTime()) / 3600000;
    return ageHrs <= MAX_JOB_AGE_HOURS;
  } catch { return true; }
}

/**
 * Pick which keywords to run this cycle
 * Rotates based on hour of day so each keyword gets covered across daily runs
 */
function getKeywordsForThisRun() {
  const hour  = new Date().getHours();
  const slot  = Math.floor(hour / 6); // 0,1,2,3 for 4 daily runs
  const start = (slot * MAX_SEARCHES_PER_RUN) % ALL_KEYWORDS.length;
  const end   = start + MAX_SEARCHES_PER_RUN;

  if (end <= ALL_KEYWORDS.length) {
    return ALL_KEYWORDS.slice(start, end);
  }
  // Wrap around if needed
  return [
    ...ALL_KEYWORDS.slice(start),
    ...ALL_KEYWORDS.slice(0, end - ALL_KEYWORDS.length)
  ];
}

/**
 * Pick location for this run (rotates daily)
 */
function getLocationForThisRun() {
  const dayOfYear = Math.floor(Date.now() / 86400000);
  return LOCATIONS[dayOfYear % LOCATIONS.length];
}

// ── Fetcher ───────────────────────────────────────────────────────────────────

async function fetchJobsPage(params) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await axios.get(BASE_URL, {
        headers: HEADERS,
        params,
        timeout: 10000
      });
      if (response.status === 200) return response.data;
      if (response.status === 429) {
        console.warn(`[LinkedInScraper] Rate limited (429) on attempt ${attempt}/3 — waiting 30s`);
        await delay(30000);
        continue;
      }
      console.warn(`[LinkedInScraper] Status ${response.status} on attempt ${attempt}/3`);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        console.warn(`[LinkedInScraper] Rate limited (429) on attempt ${attempt}/3 — waiting 30s`);
        await delay(30000);
        continue;
      }
      console.warn(`[LinkedInScraper] Request failed attempt ${attempt}/3: ${err.message}`);
    }
    await delay(5000);
  }
  return null;
}

async function fetchJobDetail(url) {
  const match = url.match(/\/view\/[^/]*?(\d+)(?:\?|$)/);
  if (!match) return null;

  const detailUrl = DETAIL_URL_TPL.replace('{job_id}', match[1]);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.get(detailUrl, {
        headers: HEADERS,
        timeout: 10000
      });
      if (response.status === 200) return response.data;
      if (response.status === 429) {
        console.warn('[LinkedInScraper] Rate limited on detail fetch — skipping');
        return null; // skip detail rather than retry and burn more requests
      }
      if (response.status === 999) return null; // actively blocked
    } catch (err) {
      if (err.response?.status === 429 || err.response?.status === 999) return null;
    }
    await delay(3000);
  }
  return null;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function countJobCards(html) {
  const $ = cheerio.load(html);
  return $('div.base-card').length;
}

function parseJobs(html) {
  const $    = cheerio.load(html);
  const jobs = [];

  $('div.base-card').each((_, card) => {
    try {
      const $card    = $(card);
      const title    = $card.find('h3').first().text().trim();
      const company  = $card.find('h4').first().text().trim();
      const location = $card.find('span.job-search-card__location').first().text().trim();
      const link     = ($card.find('a.base-card__full-link').first().attr('href') || '').trim();
      const datetime = $card.find('time').first().attr('datetime') || '';

      if (!title || !link) return;
      if (!isWithinAgeLimit(datetime)) return;

      jobs.push({ title, company, location, link });
    } catch { }
  });

  return jobs;
}

function parseJobDetail(html) {
  const $ = cheerio.load(html);
  return (
    $('div.show-more-less-html__markup').first().text() ||
    $('div.description__text').first().text() ||
    ''
  ).replace(/\s+/g, ' ').trim();
}

// ── Main Scraper ──────────────────────────────────────────────────────────────

async function scrapeLinkedIn() {
  console.log('[LinkedInScraper] Starting (rate-limit-aware mode)...');

  const keywords = getKeywordsForThisRun();
  const location = getLocationForThisRun();

  console.log(`[LinkedInScraper] This run: keywords=${JSON.stringify(keywords)}, location=${location}`);

  let saved = 0, skipped = 0, errors = 0;

  for (const keyword of keywords) {
    const params = {
      keywords: keyword,
      location,
      f_TPR:    `r${MAX_JOB_AGE_HOURS * 3600}`,
      start:    0
    };

    console.log(`[LinkedInScraper] Searching: "${keyword}" in ${location}`);

    const html = await fetchJobsPage(params);

    if (!html) {
      console.warn(`[LinkedInScraper] No response for "${keyword}" — likely rate limited, stopping run`);
      break; // stop entire run if rate limited
    }

    const cardCount = countJobCards(html);
    if (cardCount === 0) {
      console.log(`[LinkedInScraper] 0 cards for "${keyword}" — skipping`);
      continue;
    }

    const jobs = parseJobs(html);
    console.log(`[LinkedInScraper] Found ${jobs.length} jobs for "${keyword}"`);

    for (const job of jobs) {
      try {
        // Fetch detail — skip if rate limited to protect remaining quota
        await delay(DELAY_BETWEEN_JOBS);
        const detailHtml  = await fetchJobDetail(job.link);
        const description = detailHtml ? parseJobDetail(detailHtml) : '';

        const aiResult  = await summarize(job.title, job.company, description);
        const expiresAt = new Date(Date.now() + 30 * 86400000);

        const inserted = await OffCampusJobModel.insertJob({
          title:            job.title,
          company:          job.company,
          location:         job.location,
          description,
          source_url:       job.link,
          source:           'linkedin',
          role_type:        aiResult.role_type,
          skills:           aiResult.skills,
          summary:          aiResult.short_summary,
          application_tip:  aiResult.application_tip,
          experience_level: 'fresher',
          posted_at:        new Date(),
          expires_at:       expiresAt
        });

        if (inserted) saved++;
        else          skipped++;

      } catch (jobErr) {
        console.error(`[LinkedInScraper] Save error: ${jobErr.message}`);
        errors++;
      }
    }

    // Long delay between searches
    await delay(DELAY_BETWEEN_SEARCHES);
  }

  console.log(`[LinkedInScraper] Done. Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
  return { saved, skipped, errors };
}

module.exports = { scrapeLinkedIn };