require('dotenv').config();
const fetch = require('node-fetch');
const { launchBrowser, sleep } = require('./utils');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const NEWS_TABLE = 'News';

// Keywords that indicate relevance to parents
const PARENT_KEYWORDS = [
  'school', 'student', 'child', 'kid', 'family', 'parent', 'youth',
  'camp', 'registration', 'enrollment', 'playground', 'park', 'library',
  'pediatric', 'vaccine', 'health', 'safety', 'recall', 'opening',
  'restaurant', 'event', 'festival', 'summer', 'spring break',
  'sports', 'league', 'swim', 'soccer', 'baseball', 'dance',
  'preschool', 'daycare', 'education', 'teacher', 'elementary',
  'middle school', 'high school', 'isd', 'pisd', 'fisd',
  'water', 'boil', 'alert', 'recall'
];

// Skip articles about traffic/road construction and weather — stale too fast
const SKIP_KEYWORDS = [
  'traffic', 'lane closure', 'road closure', 'construction update',
  'roadwork', 'detour', 'road block', 'intermittent',
  'weather', 'tornado', 'thunderstorm', 'freeze warning',
  'wind advisory', 'heat advisory'
];

function isRelevant(title, snippet) {
  const text = (title + ' ' + (snippet || '')).toLowerCase();
  // Skip traffic/weather — stale too fast for a daily scrape
  if (SKIP_KEYWORDS.some(kw => text.includes(kw))) return false;
  return PARENT_KEYWORDS.some(kw => text.includes(kw));
}

function categorize(title, snippet) {
  const text = (title + ' ' + (snippet || '')).toLowerCase();
  if (/school|isd|pisd|fisd|education|teacher|student|enrollment|calendar|board/.test(text)) return 'Education';
  if (/sport|league|registration|tryout|soccer|baseball|swim|ymca|athletic/.test(text)) return 'Sports & Activities';
  if (/open|coming soon|new .*(restaurant|store|shop|venue)|grand opening/.test(text)) return 'New Openings';
  if (/health|vaccine|measles|recall|safety|pediatric|flu|covid|water quality|boil/.test(text)) return 'Health & Safety';
  if (/event|festival|concert|fair|celebration|parade|firework|holiday/.test(text)) return 'Events';
  return 'Community';
}

// --- SCRAPER: Frisco City Alerts (HTTP — server rendered) ---
async function scrapeFriscoCityAlerts() {
  console.log('\n--- Frisco City Alerts ---');
  try {
    const res = await fetch('https://www.friscotexas.gov/CivicAlerts.aspx', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();

    const articles = [];
    // Match alert items: title in <a> tags, date nearby
    const itemRegex = /<div class="(?:row|item)[^"]*"[^>]*>[\s\S]*?<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?(?:posted\s*(?:on\s*)?:?\s*)?(\w+ \d{1,2},?\s*\d{4})?/gi;

    // Simpler approach — find all links with newsflash detail URLs
    const linkRegex = /<a[^>]*href="(\/[^"]*(?:newsflash|CivicAlerts)[^"]*Detail[^"]*)"[^>]*>\s*([^<]+?)\s*<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = 'https://www.friscotexas.gov' + match[1];
      const title = match[2].trim();
      if (title.length < 10 || title.length > 200) continue;
      if (/more|read|view all|subscribe|rss/i.test(title)) continue;
      articles.push({ title, url, source: 'City of Frisco' });
    }

    // Also try the listing format
    const listRegex = /<h\d[^>]*>\s*<a[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>\s*<\/h\d>\s*(?:<[^>]*>)*\s*(?:Posted on:?\s*)?(\w+\s+\d{1,2},?\s*\d{4})?/gi;
    while ((match = listRegex.exec(html)) !== null) {
      const url = match[1].startsWith('http') ? match[1] : 'https://www.friscotexas.gov' + match[1];
      const title = match[2].trim();
      const dateStr = match[3] || '';
      if (title.length < 10 || title.length > 200) continue;
      if (articles.some(a => a.title === title)) continue;
      articles.push({ title, url, source: 'City of Frisco', dateStr });
    }

    console.log(`  Found ${articles.length} alerts`);
    return articles;
  } catch (err) {
    console.error('  Error:', err.message);
    return [];
  }
}

// --- SCRAPER: Frisco ISD News (browser) ---
async function scrapeFriscoISD(page) {
  console.log('\n--- Frisco ISD News ---');
  try {
    await page.goto('https://www.friscoisd.org/news', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(5000);

    const articles = await page.evaluate(() => {
      const items = [];
      // Try common news listing patterns
      document.querySelectorAll('a[href*="/news/"], a[href*="/article"], .news-item a, .post a, article a').forEach(a => {
        const title = a.innerText.trim();
        const href = a.href;
        if (title.length > 15 && title.length < 200 && href && !items.some(i => i.title === title)) {
          items.push({ title, url: href });
        }
      });
      // Fallback: any h2/h3 inside main content
      if (items.length < 3) {
        document.querySelectorAll('h2 a, h3 a, h4 a').forEach(a => {
          const title = a.innerText.trim();
          const href = a.href;
          if (title.length > 15 && title.length < 200 && href && !items.some(i => i.title === title)) {
            items.push({ title, url: href });
          }
        });
      }
      return items.slice(0, 15);
    });

    articles.forEach(a => a.source = 'Frisco ISD');
    console.log(`  Found ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('  Error:', err.message);
    return [];
  }
}

// --- SCRAPER: Plano ISD News (browser) ---
async function scalePlanoISD(page) {
  console.log('\n--- Plano ISD News ---');
  try {
    await page.goto('https://www.pisd.edu/news', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(5000);

    const articles = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a').forEach(a => {
        const title = a.innerText.trim();
        const href = a.href;
        if (title.length > 15 && title.length < 200 && href &&
            (href.includes('/article/') || href.includes('/news/') || href.includes('/page/')) &&
            !items.some(i => i.title === title) &&
            !/menu|nav|footer|login|sign/i.test(title)) {
          items.push({ title, url: href });
        }
      });
      if (items.length < 3) {
        document.querySelectorAll('h2, h3, h4').forEach(h => {
          const a = h.querySelector('a') || h.closest('a');
          if (a) {
            const title = h.innerText.trim();
            const href = a.href;
            if (title.length > 15 && title.length < 200 && !items.some(i => i.title === title)) {
              items.push({ title, url: href });
            }
          }
        });
      }
      return items.slice(0, 15);
    });

    articles.forEach(a => a.source = 'Plano ISD');
    console.log(`  Found ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('  Error:', err.message);
    return [];
  }
}

// --- SCRAPER: Community Impact (browser) ---
async function scrapeCommunityImpact(page) {
  console.log('\n--- Community Impact ---');
  try {
    // Try the main DFW page
    await page.goto('https://communityimpact.com/news/dallas-fort-worth/', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(5000);

    const articles = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('article a, .post a, a[href*="/news/"]').forEach(a => {
        const title = (a.querySelector('h2, h3, h4') || a).innerText.trim();
        const href = a.href;
        if (title.length > 15 && title.length < 200 && href.includes('communityimpact.com') &&
            !items.some(i => i.title === title) &&
            !/subscribe|newsletter|advertise/i.test(title)) {
          items.push({ title, url: href });
        }
      });
      return items.slice(0, 15);
    });

    // Filter for Plano/Frisco relevance
    const relevant = articles.filter(a => {
      const t = a.title.toLowerCase();
      return t.includes('plano') || t.includes('frisco') || t.includes('collin') ||
             t.includes('dfw') || t.includes('texas') || isRelevant(a.title, '');
    });

    relevant.forEach(a => a.source = 'Community Impact');
    console.log(`  Found ${relevant.length} relevant articles (of ${articles.length} total)`);
    return relevant;
  } catch (err) {
    console.error('  Error:', err.message);
    return [];
  }
}

// --- SCRAPER: City of Plano News (browser) ---
async function scrapePlanoCity(page) {
  console.log('\n--- City of Plano ---');
  try {
    await page.goto('https://www.plano.gov/1862/All-News-Releases', { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(5000);

    const articles = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('a').forEach(a => {
        const title = a.innerText.trim();
        const href = a.href;
        if (title.length > 15 && title.length < 200 && href &&
            (href.includes('/news/') || href.includes('/CivicAlerts') || href.includes('/newsflash') || href.includes('/Archive')) &&
            !items.some(i => i.title === title) &&
            !/more|view all|subscribe|rss|menu/i.test(title)) {
          items.push({ title, url: href });
        }
      });
      // Fallback
      if (items.length < 3) {
        document.querySelectorAll('.listing a, .news a, h3 a, h4 a').forEach(a => {
          const title = a.innerText.trim();
          const href = a.href;
          if (title.length > 15 && title.length < 200 && !items.some(i => i.title === title)) {
            items.push({ title, url: href });
          }
        });
      }
      return items.slice(0, 15);
    });

    articles.forEach(a => a.source = 'City of Plano');
    console.log(`  Found ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error('  Error:', err.message);
    return [];
  }
}

// --- AIRTABLE: Fetch existing news URLs to avoid duplicates ---
async function fetchExistingUrls() {
  const urls = new Set();
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.append('fields[]', 'url');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(NEWS_TABLE)}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of (data.records || [])) {
      if (r.fields.url) urls.add(r.fields.url);
    }
    offset = data.offset || null;
  } while (offset);
  return urls;
}

// --- AIRTABLE: Push new articles ---
async function pushToAirtable(articles) {
  const today = new Date().toISOString().split('T')[0];
  const records = articles.map(a => ({
    fields: {
      title: a.title.substring(0, 200),
      snippet: (a.snippet || '').substring(0, 500),
      url: a.url,
      source: a.source,
      category: categorize(a.title, a.snippet),
      published_at: a.dateStr ? parseDate(a.dateStr) : today,
      scraped_at: today
    }
  }));

  for (let i = 0; i < records.length; i += 10) {
    const batch = records.slice(i, i + 10);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(NEWS_TABLE)}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ records: batch })
    });
    if (!res.ok) {
      console.error('Airtable error:', await res.text());
    } else {
      console.log(`  Pushed ${Math.min(i + 10, records.length)}/${records.length}`);
    }
    if (i + 10 < records.length) await sleep(250);
  }
}

function parseDate(str) {
  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return new Date().toISOString().split('T')[0];
    return d.toISOString().split('T')[0];
  } catch (e) {
    return new Date().toISOString().split('T')[0];
  }
}

async function main() {
  console.log('=== KidCompass News Scraper ===');

  // Get existing URLs to avoid dupes
  const existing = await fetchExistingUrls();
  console.log(`Existing news items: ${existing.size}`);

  // Phase 1: HTTP scrapers
  let allArticles = [];
  const friscoAlerts = await scrapeFriscoCityAlerts();
  allArticles.push(...friscoAlerts);

  // Phase 2: Browser scrapers
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();

  const friscoISD = await scrapeFriscoISD(page);
  allArticles.push(...friscoISD);

  const planoISD = await scalePlanoISD(page);
  allArticles.push(...planoISD);

  const communityImpact = await scrapeCommunityImpact(page);
  allArticles.push(...communityImpact);

  const planoCity = await scrapePlanoCity(page);
  allArticles.push(...planoCity);

  await browser.close();

  // Deduplicate by URL
  const seen = new Set();
  allArticles = allArticles.filter(a => {
    if (!a.url || seen.has(a.url) || existing.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });

  // Filter for parent relevance
  const relevant = allArticles.filter(a => isRelevant(a.title, a.snippet));
  console.log(`\nTotal scraped: ${allArticles.length}`);
  console.log(`Parent-relevant: ${relevant.length}`);

  // If very few relevant, include all (they're from targeted sources anyway)
  const toPush = relevant.length >= 5 ? relevant : allArticles;
  console.log(`Pushing: ${toPush.length} articles`);

  if (toPush.length > 0) {
    await pushToAirtable(toPush);
  }

  console.log('\n=== DONE ===');
}

main().catch(console.error);
