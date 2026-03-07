require('dotenv').config();
const fetch = require('node-fetch');
const { launchBrowser, sleep } = require('./utils');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Businesses';

async function fetchAllBusinesses() {
  const all = [];
  let offset = null;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    ['name', 'category', 'city', 'website', 'business_type', 'services', 'description', 'price_note'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of data.records || []) all.push({ id: r.id, ...r.fields });
    offset = data.offset || null;
  } while (offset);
  return all;
}

async function updateRecord(id, fields) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}/${id}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) {
    const err = await res.text();
    console.error(`  Airtable error: ${err}`);
  }
}

// --- EXTRACTION HELPERS (work on raw HTML string) ---

function extractFromHtml(html) {
  // Meta description
  let about = '';
  const metaMatch = html.match(/<meta[^>]*(?:name="description"|property="og:description")[^>]*content="([^"]{30,400})"/i)
    || html.match(/<meta[^>]*content="([^"]{30,400})"[^>]*(?:name="description"|property="og:description")/i);
  if (metaMatch) about = metaMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

  // Strip HTML tags for text analysis
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // Age range
  let ageRange = '';
  const agePatterns = [
    /ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
    /(\d{1,2})\s*months?\s*[-–to]+\s*(\d{1,2})\s*years?/i,
    /children\s*ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
    /serving\s*(?:children|kids|students)\s*ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
    /pre-?k\s*(?:through|to|-)\s*(\d+)(?:th|st|nd|rd)?\s*grade/i,
    /infants?\s*(?:through|to|-)\s*pre-?k/i,
    /toddlers?\s*(?:through|to|-)\s*(\w+)/i
  ];
  for (const p of agePatterns) {
    const m = text.match(p);
    if (m) { ageRange = m[0].substring(0, 50); break; }
  }

  // Pricing
  let pricing = '';
  const pricePatterns = [
    /\$\s*(\d{2,4})\s*(?:\/|per)\s*(?:month|mo|session|class|week)/i,
    /(?:tuition|fee|cost|price|rate)s?\s*(?:start|begin|from|:)?\s*(?:at\s*)?\$\s*(\d{2,4})/i,
    /\$\s*(\d{2,4})\s*[-–]\s*\$?\s*(\d{2,4})\s*(?:\/|per)?\s*(?:month|mo)?/i,
    /(?:starting|from)\s*(?:at\s*)?\$\s*(\d{2,4})/i,
    /free\s*(?:trial|assessment|evaluation|consultation|class)/i
  ];
  for (const p of pricePatterns) {
    const m = text.match(p);
    if (m) { pricing = m[0].substring(0, 80); break; }
  }

  // Free trial
  let freeTrial = '';
  const lower = text.toLowerCase();
  if (lower.includes('free trial') || lower.includes('free class') || lower.includes('free assessment') ||
      lower.includes('free evaluation') || lower.includes('free consultation') || lower.includes('try a class')) {
    const trialPatterns = [
      /free\s*(?:trial|introductory|first)\s*(?:class|lesson|session)/i,
      /free\s*(?:assessment|evaluation|consultation)/i,
      /try\s*a\s*(?:free\s*)?class/i,
      /book\s*(?:a\s*)?free/i
    ];
    for (const p of trialPatterns) {
      const m = text.match(p);
      if (m) { freeTrial = m[0].substring(0, 60); break; }
    }
  }

  return { about, ageRange, pricing, freeTrial };
}

// --- PHASE 1: Lightweight HTTP fetch ---
async function fetchHtml(url) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal,
      redirect: 'follow'
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const html = await res.text();
    if (html.length < 500) return null; // too small, probably a redirect page
    return html;
  } catch (err) {
    return null;
  }
}

// --- PHASE 2: Browser scrape for JS-heavy sites ---
async function scrapeWithBrowser(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await sleep(4000);

    const html = await page.content();
    return html;
  } catch (err) {
    return null;
  }
}

function buildFields(extracted, biz) {
  const fields = {};
  let servicesArr = biz.services ? biz.services.split(',').map(s => s.trim()) : [];

  // Add age range to services
  if (extracted.ageRange && !servicesArr.some(s => /ages?\s*\d/i.test(s))) {
    servicesArr.unshift(extracted.ageRange);
  }

  // Add free trial to services
  if (extracted.freeTrial && !servicesArr.some(s => /free/i.test(s))) {
    servicesArr.push(extracted.freeTrial);
  }

  if (servicesArr.length > 0 && servicesArr.join(', ') !== (biz.services || '')) {
    fields.services = servicesArr.join(', ');
  }

  // Price note (only if not already set)
  if (extracted.pricing && extracted.pricing.length > 3 && !biz.price_note) {
    fields.price_note = extracted.pricing;
  }

  // Description / about (only if not already set)
  if (extracted.about && extracted.about.length > 30 && !biz.description) {
    // Clean up the about text
    let desc = extracted.about.trim();
    // Don't save if it's just a cookie/privacy notice
    if (!/cookie|privacy|©|copyright|accept all/i.test(desc)) {
      fields.description = desc;
    }
  }

  return fields;
}

async function main() {
  console.log('Fetching businesses...');
  const businesses = await fetchAllBusinesses();

  // Only process local businesses with websites
  const targets = businesses.filter(b =>
    b.website &&
    b.business_type === 'local' &&
    !b.description // only if they don't have a description yet
  );
  console.log(`Total: ${businesses.length}, Local targets (have website, no description): ${targets.length}`);

  if (!targets.length) {
    console.log('Nothing to process.');
    return;
  }

  let enriched = 0;
  let browserNeeded = [];
  let errors = 0;
  let skipped = 0;

  // PHASE 1: Try lightweight HTTP fetch first
  console.log('\n=== PHASE 1: HTTP Fetch ===');
  for (let i = 0; i < targets.length; i++) {
    const biz = targets[i];
    const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;

    process.stdout.write(`[${i + 1}/${targets.length}] ${biz.name}... `);

    const html = await fetchHtml(url);
    if (!html) {
      console.log('HTTP failed — queued for browser');
      browserNeeded.push(biz);
      continue;
    }

    const extracted = extractFromHtml(html);
    const foundAnything = extracted.ageRange || extracted.pricing || extracted.freeTrial || extracted.about;

    if (!foundAnything) {
      // Might be a JS-rendered site — queue for browser
      console.log('No data from HTML — queued for browser');
      browserNeeded.push(biz);
      continue;
    }

    const fields = buildFields(extracted, biz);
    if (Object.keys(fields).length > 0) {
      await updateRecord(biz.id, fields);
      enriched++;
      console.log(`OK — desc:${extracted.about ? 'Y' : 'N'} age:${extracted.ageRange ? 'Y' : 'N'} price:${extracted.pricing ? 'Y' : 'N'} trial:${extracted.freeTrial ? 'Y' : 'N'}`);
    } else {
      skipped++;
      console.log('SKIP (data already exists)');
    }

    // Brief pause to avoid rate limiting
    await sleep(500);
  }

  console.log(`\nPhase 1: Enriched ${enriched}, Skipped ${skipped}, Browser needed: ${browserNeeded.length}`);

  // PHASE 2: Browser scrape for remaining
  if (browserNeeded.length > 0) {
    console.log('\n=== PHASE 2: Browser Scrape ===');
    const { browser, context } = await launchBrowser();
    const page = await context.newPage();

    for (let i = 0; i < browserNeeded.length; i++) {
      const biz = browserNeeded[i];
      const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;

      process.stdout.write(`[${i + 1}/${browserNeeded.length}] ${biz.name}... `);

      const html = await scrapeWithBrowser(page, url);
      if (!html) {
        console.log('FAILED (timeout)');
        errors++;
        continue;
      }

      const extracted = extractFromHtml(html);
      const fields = buildFields(extracted, biz);

      if (Object.keys(fields).length > 0) {
        await updateRecord(biz.id, fields);
        enriched++;
        console.log(`OK — desc:${extracted.about ? 'Y' : 'N'} age:${extracted.ageRange ? 'Y' : 'N'} price:${extracted.pricing ? 'Y' : 'N'} trial:${extracted.freeTrial ? 'Y' : 'N'}`);
      } else {
        skipped++;
        console.log('SKIP (no extractable data)');
      }

      await sleep(2000);
    }

    await browser.close();
  }

  console.log(`\n=== DONE ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Run "npm run export" to update businesses.json.`);
}

main().catch(console.error);
