/**
 * scrapers/eventsScraper.js
 *
 * Sources:
 *   1. Unstop       — Playwright headless (only way to get Unstop data)
 *   2. Devpost      — hackathons.json (needs specific headers)
 *   3. MLH          — events.mlh.io + ghw.mlh.io (confirmed working URLs)
 *   4. Eventbrite   — REST API (needs EVENTBRITE_API_TOKEN)
 */

const axios = require('axios');
const cheerio = require('cheerio');
const IndustryEventModel = require('../models/industryEventModel');

let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  console.warn('[EventsScraper] playwright not installed — Unstop skipped. Run: npx playwright install chromium');
}

const EVENTBRITE_TOKEN = process.env.EVENTBRITE_API_TOKEN || '';

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function classifyEventType(title = '', desc = '') {
  const t = `${title} ${desc}`.toLowerCase();
  if (t.includes('hackathon'))    return 'hackathon';
  if (t.includes('webinar'))      return 'webinar';
  if (t.includes('workshop'))     return 'workshop';
  if (t.includes('competition'))  return 'competition';
  if (t.includes('conference'))   return 'conference';
  if (t.includes('networking'))   return 'networking';
  return 'event';
}

function extractTags(title = '', desc = '') {
  const keywords = [
    'data', 'analytics', 'business', 'technology',
    'ai', 'consulting', 'mba', 'startup', 'management',
    'finance', 'marketing', 'career', 'open source'
  ];
  const text = `${title} ${desc}`.toLowerCase();
  return keywords.filter(k => text.includes(k));
}

function isRelevant(title = '', desc = '') {
  const keywords = [
    'data', 'business', 'analytics', 'consulting',
    'technology', 'ai', 'management', 'startup',
    'hackathon', 'career', 'finance', 'marketing', 'hack'
  ];
  const text = `${title} ${desc}`.toLowerCase();
  return keywords.some(k => text.includes(k));
}

// ── 1. UNSTOP (Playwright) ────────────────────────────────────────────────────

async function scrapeUnstop() {
  if (!chromium) {
    console.warn('[EventsScraper] Unstop skipped — playwright not available');
    return [];
  }

  console.log('[EventsScraper] Scraping Unstop (Playwright)...');
  let browser;
  const events = [];

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const urls = [
      'https://unstop.com/hackathons',
      'https://unstop.com/competitions',
      'https://unstop.com/workshops'
    ];

    for (const url of urls) {
      const page = await browser.newPage();
      try {
        await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.mouse.wheel(0, 4000);
        await page.waitForTimeout(2000);

        const data = await page.evaluate(() => {
          // Try multiple selector patterns Unstop may use
          const cards = document.querySelectorAll(
            'a[href*="/opportunity/"], .opportunity-card a, .card-content a'
          );
          return Array.from(cards).slice(0, 20).map(card => ({
            title:     (
                         card.querySelector('h3')?.innerText ||
                         card.querySelector('.title')?.innerText ||
                         card.querySelector('strong')?.innerText ||
                         card.closest('.opportunity-card')?.querySelector('h3')?.innerText ||
                         ''
                       ).trim(),
            organizer: (
                         card.querySelector('p')?.innerText ||
                         card.querySelector('.org-name')?.innerText ||
                         card.querySelector('small')?.innerText ||
                         ''
                       ).trim(),
            url: card.href || ''
          }));
        });

        const filtered = data.filter(e => e.title && e.url && isRelevant(e.title));
        console.log(`[EventsScraper] Unstop ${url}: found ${filtered.length} relevant events`);

        events.push(...filtered.map(e => ({
          title:                 e.title,
          organizer:             e.organizer || 'Unstop',
          location:              'India',
          event_url:             e.url,
          source:                'unstop',
          description:           '',
          event_type:            classifyEventType(e.title),
          tags:                  extractTags(e.title),
          is_online:             true,
          is_free:               true,
          event_date:            null,
          registration_deadline: null
        })));

        await delay(1500);
      } catch (pageErr) {
        console.warn(`[EventsScraper] Unstop page error (${url}): ${pageErr.message}`);
      } finally {
        await page.close();
      }
    }
  } catch (err) {
    console.warn(`[EventsScraper] Unstop browser error: ${err.message}`);
  } finally {
    if (browser) await browser.close();
  }

  return events;
}

// ── 2. DEVPOST ────────────────────────────────────────────────────────────────
// 406 fix: must send X-Requested-With + matching Referer + correct Accept

async function scrapeDevpost() {
  console.log('[EventsScraper] Scraping Devpost...');
  const events = [];

  try {
    const res = await axios.get('https://devpost.com/hackathons.json', {
      headers: {
        'User-Agent':          BROWSER_UA,
        'Accept':              'application/json, text/javascript, */*; q=0.01',
        'Accept-Language':     'en-US,en;q=0.9',
        'Referer':             'https://devpost.com/hackathons',
        'X-Requested-With':    'XMLHttpRequest',
        'Sec-Fetch-Dest':      'empty',
        'Sec-Fetch-Mode':      'cors',
        'Sec-Fetch-Site':      'same-origin'
      },
      params: { status: 'open', order_by: 'deadline', page: 1 },
      timeout: 15000
    });

    const hacks = res.data?.hackathons || [];
    console.log(`[EventsScraper] Devpost: fetched ${hacks.length} hackathons`);

    for (const h of hacks) {
      if (!h.title || !h.url) continue;

      events.push({
        title:                 h.title,
        organizer:             h.organization_name || 'Devpost',
        location:              h.displayed_location?.location || 'Online',
        event_url:             h.url,
        source:                'devpost',
        description:           h.tagline || '',
        event_type:            'hackathon',
        tags:                  extractTags(h.title, h.tagline),
        is_online:             h.online_only === true,
        is_free:               true,
        event_date:            h.submission_period_start_date
                                 ? new Date(h.submission_period_start_date) : null,
        registration_deadline: h.submission_period_end_date
                                 ? new Date(h.submission_period_end_date)   : null
      });
    }

    console.log(`[EventsScraper] Devpost: saved ${events.length} hackathons`);

  } catch (err) {
    console.warn(`[EventsScraper] Devpost error: ${err.response?.status || err.message}`);
  }

  return events;
}

// ── 3. MLH ────────────────────────────────────────────────────────────────────
// FIXED URLs (confirmed from search results March 2026):
//   Season hackathons : events.mlh.io  (NOT mlh.io/seasons/...)
//   Global Hack Week  : ghw.mlh.io/events (weekly online events, perfect for students)

async function scrapeMLH() {
  console.log('[EventsScraper] Scraping MLH...');
  const events = [];

  const mlhUrls = [
    {
      url:    'https://events.mlh.io',
      source: 'mlh',
      type:   'hackathon'
    },
    {
      url:    'https://ghw.mlh.io/events',
      source: 'mlh-ghw',
      type:   'workshop'
    }
  ];

  for (const { url, source, type } of mlhUrls) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':      BROWSER_UA,
          'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        timeout: 15000
      });

      const $ = cheerio.load(response.data);

      // Log actual HTML structure snippet for debugging if no events found
      let found = 0;

      // Try multiple selector patterns MLH may use
      const selectors = [
        '.event-wrapper',
        '.event',
        'article.event',
        '.hackathon-tile',
        '.events-list li',
        'a[href*="/events/"]'
      ];

      for (const selector of selectors) {
        const els = $(selector);
        if (els.length === 0) continue;

        els.each((_, el) => {
          const $el = $(el);

          // Try various title selectors
          const title = (
            $el.find('.event-name').text() ||
            $el.find('h3').text()          ||
            $el.find('h2').text()          ||
            $el.find('.title').text()      ||
            $el.attr('title')              ||
            $el.text()
          ).trim().split('\n')[0].trim();

          // Try various link selectors
          const link = (
            $el.find('a').first().attr('href') ||
            $el.attr('href') ||
            ''
          );

          // Try location
          const location = (
            $el.find('.event-location').text() ||
            $el.find('.location').text()        ||
            ''
          ).trim();

          // Try date
          const datetime = $el.find('time').attr('datetime') || '';

          if (!title || title.length < 3) return;

          found++;
          events.push({
            title,
            organizer:             'MLH',
            location:              location || 'Online',
            event_url:             link.startsWith('http') ? link : `https://mlh.io${link}`,
            source,
            description:           `MLH event: ${title}. Free and open to all students worldwide.`,
            event_type:            type,
            tags:                  ['hackathon', 'technology', 'career', 'networking'],
            is_online:             !location || location.toLowerCase().includes('online'),
            is_free:               true,
            event_date:            datetime ? new Date(datetime) : null,
            registration_deadline: null
          });
        });

        if (found > 0) break; // found events with this selector, stop trying others
      }

      console.log(`[EventsScraper] MLH (${url}): found ${found} events`);
      await delay(1000);

    } catch (err) {
      console.warn(`[EventsScraper] MLH error (${url}): ${err.response?.status || err.message}`);
    }
  }

  return events;
}

// ── 4. EVENTBRITE ─────────────────────────────────────────────────────────────

async function scrapeEventbrite() {
  if (!EVENTBRITE_TOKEN) {
    console.warn('[EventsScraper] No EVENTBRITE_API_TOKEN — skipping Eventbrite');
    return [];
  }

  console.log('[EventsScraper] Scraping Eventbrite...');
  const events = [];

  try {
    const res = await axios.get('https://www.eventbriteapi.com/v3/events/search/', {
      headers: { Authorization: `Bearer ${EVENTBRITE_TOKEN}` },
      params: {
        q:                    'data analytics OR business OR technology',
        'location.address':   'India',
        expand:               'organizer,venue',
        'start_date.range_start': new Date().toISOString(),
        page_size:            20
      },
      timeout: 15000
    });

    for (const e of res.data?.events || []) {
      const title = e.name?.text || '';
      const desc  = e.description?.text || '';
      if (!isRelevant(title, desc)) continue;

      events.push({
        title,
        organizer:             e.organizer?.name || 'Eventbrite',
        location:              e.venue?.address?.city || 'India',
        event_url:             e.url || '',
        source:                'eventbrite',
        description:           desc.substring(0, 500),
        event_type:            classifyEventType(title, desc),
        tags:                  extractTags(title, desc),
        is_online:             !e.venue,
        is_free:               e.is_free || false,
        event_date:            e.start?.utc ? new Date(e.start.utc) : null,
        registration_deadline: e.end?.utc   ? new Date(e.end.utc)   : null
      });
    }

    console.log(`[EventsScraper] Eventbrite: found ${events.length} relevant events`);

  } catch (err) {
    console.warn(`[EventsScraper] Eventbrite error: ${err.message}`);
  }

  return events;
}

// ── MAIN ──────────────────────────────────────────────────────────────────────

async function scrapeEvents() {
  console.log('[EventsScraper] ===== START =====');

  const [u, d, m, e] = await Promise.allSettled([
    scrapeUnstop(),
    scrapeDevpost(),
    scrapeMLH(),
    scrapeEventbrite()
  ]);

  const allEvents = [
    ...(u.status === 'fulfilled' ? u.value : []),
    ...(d.status === 'fulfilled' ? d.value : []),
    ...(m.status === 'fulfilled' ? m.value : []),
    ...(e.status === 'fulfilled' ? e.value : [])
  ];

  console.log(`[EventsScraper] Total collected: ${allEvents.length}`);

  let saved = 0, skipped = 0, errors = 0;

  for (const event of allEvents) {
    try {
      const expiresAt = event.event_date
        ? new Date(event.event_date.getTime() + 2 * 86400000)
        : new Date(Date.now() + 30 * 86400000);

      const inserted = await IndustryEventModel.insertEvent({
        ...event,
        expires_at: expiresAt
      });

      if (inserted) saved++;
      else          skipped++;

      await delay(100);

    } catch (err) {
      console.error(`[EventsScraper] Save error for "${event.title}": ${err.message}`);
      errors++;
    }
  }

  console.log(`[EventsScraper] ===== END — Saved: ${saved}, Skipped: ${skipped}, Errors: ${errors} =====`);
  return { saved, skipped, errors };
}

module.exports = { scrapeEvents };