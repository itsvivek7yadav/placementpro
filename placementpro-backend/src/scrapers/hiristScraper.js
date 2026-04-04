const axios = require('axios');
const cheerio = require('cheerio');
const OffCampusJobModel = require('../models/offCampusJobModel');
const { summarize } = require('../services/summarizerService');

const KEYWORDS = [
  'business-analyst',
  'data-analyst',
  'consultant',
  'fresher'
];

function mapRoleType(title = '') {
  const value = title.toLowerCase();
  if (value.includes('business analyst')) return 'business analyst';
  if (value.includes('data analyst')) return 'data analyst';
  if (value.includes('consultant')) return 'consultant';
  if (value.includes('fresher') || value.includes('graduate') || value.includes('trainee')) return 'fresher';
  return 'analyst';
}

async function scrapeHirist() {
  console.log('[HiristScraper] Starting...');

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const keyword of KEYWORDS) {
    try {
      const response = await axios.get(`https://www.hirist.tech/${keyword}-jobs`, {
        headers: {
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);
      const cards = $('a[href*="/j/"], a[href*="/job/"], .job-card, .jobTuple').slice(0, 20);

      for (const card of cards.toArray()) {
        try {
          const element = $(card);
          const title = (
            element.find('h3').first().text() ||
            element.find('.job-title').first().text() ||
            element.text()
          ).trim().split('\n')[0].trim();

          const company = (
            element.find('.company-name').first().text() ||
            element.find('h4').first().text() ||
            'Unknown'
          ).trim();

          const location = (
            element.find('.location').first().text() ||
            element.find('.job-location').first().text() ||
            'India'
          ).trim();

          const href = element.attr('href') || element.find('a').first().attr('href') || '';
          const sourceUrl = href.startsWith('http') ? href : `https://www.hirist.tech${href}`;

          if (!title || !sourceUrl || title.length < 3) {
            skipped++;
            continue;
          }

          const summary = await summarize(title, company, '');
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 21);

          const inserted = await OffCampusJobModel.insertJob({
            title,
            company,
            location,
            description: '',
            source_url: sourceUrl,
            source: 'hirist',
            role_type: summary.role_type || mapRoleType(title),
            skills: summary.skills,
            summary: summary.short_summary,
            application_tip: summary.application_tip,
            salary_range: null,
            job_type: null,
            experience_level: 'fresher',
            posted_at: new Date(),
            expires_at: expiresAt
          });

          if (inserted) saved++;
          else skipped++;
        } catch (jobErr) {
          console.error('[HiristScraper] Job processing error:', jobErr.message);
          errors++;
        }
      }
    } catch (err) {
      console.error(`[HiristScraper] Error for ${keyword}:`, err.message);
      errors++;
    }
  }

  console.log(`[HiristScraper] Done. Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors}`);
  return { saved, skipped, errors };
}

module.exports = { scrapeHirist };
