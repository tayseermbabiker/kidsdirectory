require('dotenv').config();
const fetch = require('node-fetch');
const { launchBrowser, sleep } = require('./utils');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
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

function tagCity(title, source) {
  const t = (title + ' ' + (source || '')).toLowerCase();
  if (/plano|pisd|collin county/.test(t)) return 'Plano';
  if (/frisco|fisd/.test(t)) return 'Frisco';
  if (/columbia|howard county|ellicott city/.test(t)) return 'Baltimore';
  if (/towson|baltimore county|lutherville|timonium/.test(t)) return 'Baltimore';
  if (/catonsville|severna park|anne arundel/.test(t)) return 'Baltimore';
  if (/bel air|harford county|aberdeen|edgewood/.test(t)) return 'Baltimore';
  if (/maryland/.test(t)) return 'Baltimore';
  if (/dfw|north texas|texas/.test(t)) return 'Plano';
  return '';
}

function categorize(title, snippet) {
  const text = (title + ' ' + (snippet || '')).toLowerCase();
  if (/school|isd|pisd|fisd|education|teacher|student|enrollment|calendar|board|rezoning/.test(text)) return 'Education';
  if (/sport|league|registration|tryout|soccer|baseball|swim|ymca|athletic|season|signup/.test(text)) return 'Sports & Activities';
  if (/open|coming soon|new .*(restaurant|store|shop|venue)|grand opening|grandscape|legacy west/.test(text)) return 'New Openings';
  if (/health|vaccine|measles|recall|safety|pediatric|flu|covid|water quality|boil/.test(text)) return 'Health & Safety';
  if (/event|festival|concert|fair|celebration|parade|firework|holiday|spring break|weekend/.test(text)) return 'Events';
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

// --- SCRAPER: Google News RSS (HTTP — covers all cities from multiple sources) ---
async function scrapeGoogleNewsRSS() {
  console.log('\n--- Google News RSS ---');
  const queries = [
    // Plano TX
    'plano+texas+kids+OR+school+OR+family+OR+park+when:30d',
    'plano+texas+camp+OR+event+OR+registration+OR+opening+when:30d',
    // Frisco TX
    'frisco+texas+kids+OR+school+OR+family+OR+park+when:30d',
    'frisco+texas+camp+OR+event+OR+registration+OR+opening+when:30d',
    // Baltimore area MD
    'columbia+maryland+kids+OR+school+OR+family+OR+camp+when:30d',
    'towson+maryland+kids+OR+school+OR+family+OR+camp+when:30d',
    'catonsville+OR+"severna+park"+maryland+kids+OR+school+OR+event+when:30d',
    'howard+county+OR+baltimore+county+maryland+camp+OR+event+OR+opening+when:30d',
    '"bel+air"+OR+"harford+county"+maryland+kids+OR+school+OR+family+when:30d',
  ];
  const articles = [];
  const seen = new Set();

  for (const q of queries) {
    try {
      const res = await fetch(`https://news.google.com/rss/search?q=${q}&hl=en-US&gl=US&ceid=US:en`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });
      const rss = await res.text();
      const items = rss.match(/<item>[\s\S]*?<\/item>/g) || [];

      for (const item of items) {
        const title = ((item.match(/<title>(.*?)<\/title>/) || [])[1] || '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');
        // Google News wraps links in a redirect — extract the actual link text
        const link = (item.match(/<link\/>\s*(https?:\/\/[^\s<]+)/) || [])[1] ||
                     (item.match(/<link>(https?:\/\/[^\s<]+)<\/link>/) || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || 'Google News';

        if (!title || title.length < 15 || !link || seen.has(title)) continue;
        seen.add(title);

        // Must mention a covered city/area
        const t = (title + ' ' + source).toLowerCase();
        if (!/(plano|frisco|collin county|dfw|north texas|pisd|fisd|columbia|towson|catonsville|severna park|howard county|baltimore county|harford county|bel air|maryland)/.test(t)) continue;

        // Skip obituaries, crime, generic national news — not useful for parents
        if (/obituary|murdered|homicide|indicted|sentenced|mugshot/i.test(title)) continue;
        // Skip generic state/national stories not specific to our cities
        if (!/plano|frisco|pisd|fisd|collin county|columbia|towson|catonsville|severna park|howard county|baltimore county|harford county|bel air/i.test(title) && /statewide|legislature|governor|abbott|hogan|moore/i.test(title)) continue;

        let dateStr = '';
        if (pubDate) {
          try { dateStr = new Date(pubDate).toISOString().split('T')[0]; } catch (e) {}
        }

        // Only include articles from the last 30 days
        if (dateStr) {
          const d = new Date(dateStr);
          const cutoff = new Date();
          cutoff.setDate(cutoff.getDate() - 30);
          if (d < cutoff) continue;
        }

        articles.push({ title, url: link, source, dateStr });
      }
    } catch (err) {
      console.error(`  Error with query "${q}":`, err.message);
    }
  }

  console.log(`  Found ${articles.length} relevant articles`);
  return articles;
}

// --- SCRAPER: Community Impact Homepage (HTTP — Plano/Frisco articles) ---
async function scrapeCommunityImpact() {
  console.log('\n--- Community Impact ---');
  try {
    const res = await fetch('https://communityimpact.com/', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    });
    const html = await res.text();
    const articles = [];
    // Find article links containing plano or frisco in URL
    const linkRegex = /<a[^>]*href="(https?:\/\/communityimpact\.com\/dallas-fort-worth\/(?:plano|frisco)[^"]*)"[^>]*>([^<]*)<\/a>/gi;
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const url = match[1];
      let title = match[2].trim();
      if (title.length < 15 || title.length > 200) continue;
      if (/subscribe|newsletter|advertise/i.test(title)) continue;
      if (articles.some(a => a.url === url)) continue;
      articles.push({ title, url, source: 'Community Impact' });
    }

    // Also extract from heading tags that contain links
    const headingRegex = /<h[234][^>]*>[\s\S]*?<a[^>]*href="(https?:\/\/communityimpact\.com\/dallas-fort-worth\/(?:plano|frisco)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
    while ((match = headingRegex.exec(html)) !== null) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      if (title.length < 15 || title.length > 200) continue;
      if (articles.some(a => a.url === url)) continue;
      articles.push({ title, url, source: 'Community Impact' });
    }

    console.log(`  Found ${articles.length} Plano/Frisco articles`);
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
      city: a.city || tagCity(a.title, a.source),
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

// --- AIRTABLE: Delete news older than 60 days ---
async function cleanupOldNews() {
  console.log('\n--- Cleaning up old news ---');
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const toDelete = [];
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.set('filterByFormula', `IS_BEFORE({published_at}, '${cutoffStr}')`);
    params.append('fields[]', 'title');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(NEWS_TABLE)}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of (data.records || [])) toDelete.push(r.id);
    offset = data.offset || null;
  } while (offset);

  if (toDelete.length === 0) {
    console.log('  No old news to clean up');
    return;
  }

  // Delete in batches of 10
  for (let i = 0; i < toDelete.length; i += 10) {
    const batch = toDelete.slice(i, i + 10);
    const params = batch.map(id => `records[]=${id}`).join('&');
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(NEWS_TABLE)}?${params}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    if (!res.ok) console.error('  Delete error:', await res.text());
    if (i + 10 < toDelete.length) await sleep(250);
  }
  console.log(`  Deleted ${toDelete.length} articles older than 60 days`);
}

async function main() {
  console.log('=== KidCompass News Scraper ===');

  // Clean up old news first (keeps Airtable under free tier limit)
  await cleanupOldNews();

  // Get existing URLs to avoid dupes
  const existing = await fetchExistingUrls();
  console.log(`Existing news items: ${existing.size}`);

  // Phase 1: HTTP scrapers (fast, no browser needed)
  let allArticles = [];
  const friscoAlerts = await scrapeFriscoCityAlerts();
  allArticles.push(...friscoAlerts);

  const googleNews = await scrapeGoogleNewsRSS();
  allArticles.push(...googleNews);

  const communityImpact = await scrapeCommunityImpact();
  allArticles.push(...communityImpact);

  // Phase 2: Browser scrapers (only Frisco ISD needs browser)
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();

  const friscoISD = await scrapeFriscoISD(page);
  allArticles.push(...friscoISD);

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
