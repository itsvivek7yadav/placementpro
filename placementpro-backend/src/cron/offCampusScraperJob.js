/**
 * cron/offCampusScraperJob.js
 * Runs all scrapers every 3 hours
 */

const cron = require('node-cron');
const { scrapeAdzuna }   = require('../scrapers/adzunaScraper');
const { scrapeLinkedIn } = require('../scrapers/linkedinScraper');
const { scrapeHirist }   = require('../scrapers/hiristScraper');
const { scrapeJooble }   = require('../scrapers/joobleScraper');

/**
 * Run all scrapers sequentially
 * Sequential (not parallel) to respect rate limits
 */
async function runAllScrapers() {
  console.log(`[ScraperJob] ===== Starting full scrape at ${new Date().toISOString()} =====`);

  const results = { adzuna: null, linkedin: null, hirist: null, jooble: null };

  try {
    console.log('[ScraperJob] Running Adzuna scraper...');
    results.adzuna = await scrapeAdzuna();
  } catch (err) {
    console.error('[ScraperJob] Adzuna failed:', err.message);
    results.adzuna = { error: err.message };
  }

  try {
    console.log('[ScraperJob] Running LinkedIn scraper...');
    results.linkedin = await scrapeLinkedIn();
  } catch (err) {
    console.error('[ScraperJob] LinkedIn failed:', err.message);
    results.linkedin = { error: err.message };
  }

  try {
    console.log('[ScraperJob] Running Hirist scraper...');
    results.hirist = await scrapeHirist();
  } catch (err) {
    console.error('[ScraperJob] Hirist failed:', err.message);
    results.hirist = { error: err.message };
  }

  try {
    console.log('[ScraperJob] Running Jooble scraper...');
    results.jooble = await scrapeJooble();
  } catch (err) {
    console.error('[ScraperJob] Jooble failed:', err.message);
    results.jooble = { error: err.message };
  }

  console.log('[ScraperJob] ===== Scrape complete =====');
  console.log('[ScraperJob] Results:', JSON.stringify(results, null, 2));

  return results;
}

/**
 * Schedule: every 3 hours
 * Cron pattern: 0 slash-3 star star star (at minute 0 of every 3rd hour)
 */
function startScraperJob() {
  console.log('[ScraperJob] Scheduling scraper cron (every 3 hours)...');

  const job = cron.schedule('0 */3 * * *', async () => {
    try {
      await runAllScrapers();
    } catch (err) {
      console.error('[ScraperJob] Unhandled cron error:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('[ScraperJob] Scraper cron started. Next run in up to 3 hours.');

  return job;
}

module.exports = { startScraperJob, runAllScrapers };
