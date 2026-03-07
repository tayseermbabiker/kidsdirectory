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
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
  if (!res.ok) console.error(`  Airtable error: ${await res.text()}`);
}

function extractFromHtml(html) {
  let about = '';
  const metaMatch = html.match(/<meta[^>]*(?:name="description"|property="og:description")[^>]*content="([^"]{30,400})"/i)
    || html.match(/<meta[^>]*content="([^"]{30,400})"[^>]*(?:name="description"|property="og:description")/i);
  if (metaMatch) about = metaMatch[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"');

  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ');

  // If no meta description, try to find a good paragraph from text
  if (!about) {
    // Look for sentences that describe the business (30-300 chars, has a verb)
    const sentences = text.match(/[A-Z][^.!?]{30,300}[.!?]/g) || [];
    for (const s of sentences) {
      if (/cookie|privacy|©|copyright|accept|subscribe|sign up|log in|javascript/i.test(s)) continue;
      if (/we |our |offer|provid|serv|speciali|welcome|located|family|kids|children/i.test(s)) {
        about = s.trim();
        break;
      }
    }
  }

  let ageRange = '';
  const agePatterns = [
    /ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
    /(\d{1,2})\s*months?\s*[-–to]+\s*(\d{1,2})\s*years?/i,
    /pre-?k\s*(?:through|to|-)\s*(\d+)(?:th|st|nd|rd)?\s*grade/i,
    /infants?\s*(?:through|to|-)\s*pre-?k/i
  ];
  for (const p of agePatterns) {
    const m = text.match(p);
    if (m) { ageRange = m[0].substring(0, 50); break; }
  }

  let pricing = '';
  const pricePatterns = [
    /\$\s*(\d{2,4})\s*(?:\/|per)\s*(?:month|mo|session|class|week)/i,
    /(?:tuition|fee|cost|price|rate)s?\s*(?:start|begin|from|:)?\s*(?:at\s*)?\$\s*(\d{2,4})/i,
    /\$\s*(\d{2,4})\s*[-–]\s*\$?\s*(\d{2,4})/i,
    /free\s*(?:trial|assessment|evaluation|consultation|class)/i
  ];
  for (const p of pricePatterns) {
    const m = text.match(p);
    if (m) { pricing = m[0].substring(0, 80); break; }
  }

  let freeTrial = '';
  const lower = text.toLowerCase();
  if (lower.includes('free trial') || lower.includes('free class') || lower.includes('free assessment') ||
      lower.includes('free consultation') || lower.includes('try a class')) {
    const trialPatterns = [
      /free\s*(?:trial|introductory|first)\s*(?:class|lesson|session)/i,
      /free\s*(?:assessment|evaluation|consultation)/i,
      /try\s*a\s*(?:free\s*)?class/i
    ];
    for (const p of trialPatterns) {
      const m = text.match(p);
      if (m) { freeTrial = m[0].substring(0, 60); break; }
    }
  }

  return { about, ageRange, pricing, freeTrial };
}

async function main() {
  console.log('Fetching businesses...');
  const businesses = await fetchAllBusinesses();

  // Target: local businesses with website but no description
  const targets = businesses.filter(b =>
    b.website &&
    b.business_type === 'local' &&
    (!b.description || b.description.length < 20)
  );
  console.log(`Retry targets: ${targets.length}`);

  if (!targets.length) {
    console.log('Nothing to retry.');
    return;
  }

  const MAX_RETRIES = 5;
  const { browser, context } = await launchBrowser();
  let enriched = 0;
  let failed = 0;

  for (let i = 0; i < targets.length; i++) {
    const biz = targets[i];
    const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;
    process.stdout.write(`[${i + 1}/${targets.length}] ${biz.name}... `);

    let html = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await sleep(5000);
        html = await page.content();
        await page.close();
        if (html && html.length > 500) break;
        html = null;
      } catch (err) {
        // close page on error
        try { const pages = context.pages(); if (pages.length > 1) await pages[pages.length - 1].close(); } catch(e) {}
      }
      if (attempt < MAX_RETRIES) {
        process.stdout.write(`retry ${attempt + 1}/${MAX_RETRIES}... `);
        await sleep(3000);
      }
    }

    if (!html) {
      console.log('FAILED (all retries)');
      failed++;
      continue;
    }

    const extracted = extractFromHtml(html);
    const fields = {};

    if (extracted.about && extracted.about.length > 20 && !/cookie|privacy|©/i.test(extracted.about)) {
      fields.description = extracted.about;
    }

    let servicesArr = biz.services ? biz.services.split(',').map(s => s.trim()) : [];
    if (extracted.ageRange && !servicesArr.some(s => /ages?\s*\d/i.test(s))) {
      servicesArr.unshift(extracted.ageRange);
    }
    if (extracted.freeTrial && !servicesArr.some(s => /free/i.test(s))) {
      servicesArr.push(extracted.freeTrial);
    }
    if (servicesArr.length > 0 && servicesArr.join(', ') !== (biz.services || '')) {
      fields.services = servicesArr.join(', ');
    }
    if (extracted.pricing && extracted.pricing.length > 3 && !biz.price_note) {
      fields.price_note = extracted.pricing;
    }

    if (Object.keys(fields).length > 0) {
      await updateRecord(biz.id, fields);
      enriched++;
      console.log(`OK — desc:${fields.description ? 'Y' : 'N'} age:${extracted.ageRange ? 'Y' : 'N'} price:${extracted.pricing ? 'Y' : 'N'} trial:${extracted.freeTrial ? 'Y' : 'N'}`);
    } else {
      console.log('SKIP (no extractable data)');
      failed++;
    }

    await sleep(2000);
  }

  await browser.close();

  console.log(`\n=== DONE ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Failed: ${failed}`);
  console.log(`Run "npm run export" to update businesses.json.`);
}

main().catch(console.error);
