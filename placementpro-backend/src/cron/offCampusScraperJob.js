/**
 * cron/offCampusScraperJob.js
 * Runs all scrapers every 6 hours
 */

const cron = require('node-cron');
const { scrapeAdzuna }   = require('../scrapers/adzunaScraper');
const { scrapeLinkedIn } = require('../scrapers/linkedinScraper');
const { scrapeEvents }   = require('../scrapers/eventsScraper');

/**
 * Run all scrapers sequentially
 * Sequential (not parallel) to respect rate limits
 */
async function runAllScrapers() {
  console.log(`[ScraperJob] ===== Starting full scrape at ${new Date().toISOString()} =====`);

  const results = { adzuna: null, linkedin: null, events: null };

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
    console.log('[ScraperJob] Running Events scraper...');
    results.events = await scrapeEvents();
  } catch (err) {
    console.error('[ScraperJob] Events failed:', err.message);
    results.events = { error: err.message };
  }

  console.log('[ScraperJob] ===== Scrape complete =====');
  console.log('[ScraperJob] Results:', JSON.stringify(results, null, 2));

  return results;
}

/**
 * Schedule: every 6 hours
 * Cron pattern: 0 slash-6 star star star (at minute 0 of every 6th hour)
 */
function startScraperJob() {
  console.log('[ScraperJob] Scheduling scraper cron (every 6 hours)...');

  const job = cron.schedule('0 */6 * * *', async () => {
    try {
      await runAllScrapers();
    } catch (err) {
      console.error('[ScraperJob] Unhandled cron error:', err.message);
    }
  }, {
    scheduled: true,
    timezone: 'Asia/Kolkata'
  });

  console.log('[ScraperJob] Scraper cron started. Next run in up to 6 hours.');

  return job;
}

module.exports = { startScraperJob, runAllScrapers };
