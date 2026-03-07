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
    ['name', 'category', 'city', 'website', 'take', 'services', 'rating', 'review_count'].forEach(f => params.append('fields[]', f));
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

async function scrapeWebsite(page, url, category) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);

    const data = await page.evaluate((cat) => {
      const body = document.body ? document.body.innerText : '';
      const lower = body.toLowerCase();

      // --- AGE RANGE ---
      let ageRange = '';
      const agePatterns = [
        /ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
        /(\d{1,2})\s*months?\s*[-–to]+\s*(\d{1,2})\s*years?/i,
        /children\s*ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
        /serving\s*(?:children|kids|students)\s*ages?\s*(\d{1,2})\s*[-–to]+\s*(\d{1,2})/i,
        /grades?\s*(\w+)\s*[-–to]+\s*(\w+)/i,
        /pre-?k\s*(?:through|to|-)\s*(\d+)(?:th|st|nd|rd)?\s*grade/i,
        /infants?\s*(?:through|to|-)\s*pre-?k/i,
        /toddlers?\s*(?:through|to|-)\s*(\w+)/i
      ];
      for (const p of agePatterns) {
        const m = body.match(p);
        if (m) { ageRange = m[0]; break; }
      }

      // --- PRICING ---
      let pricing = '';
      const pricePatterns = [
        /\$\s*(\d{2,4})\s*(?:\/|per)\s*(?:month|mo|session|class|week)/i,
        /(?:tuition|fee|cost|price|rate)s?\s*(?:start|begin|from|:)?\s*(?:at\s*)?\$\s*(\d{2,4})/i,
        /\$\s*(\d{2,4})\s*[-–]\s*\$?\s*(\d{2,4})\s*(?:\/|per)?\s*(?:month|mo)?/i,
        /(?:starting|from)\s*(?:at\s*)?\$\s*(\d{2,4})/i,
        /free\s*(?:trial|assessment|evaluation|consultation|class)/i
      ];
      for (const p of pricePatterns) {
        const m = body.match(p);
        if (m) { pricing = m[0]; break; }
      }

      // --- PROGRAMS / SERVICES ---
      const programs = [];
      const meta = document.querySelectorAll('meta[name="description"], meta[property="og:description"]');
      let metaDesc = '';
      meta.forEach(m => { if (m.content) metaDesc += ' ' + m.content; });

      // Look for lists of programs/services
      const listItems = [];
      document.querySelectorAll('li, h2, h3, .service, .program, [class*="service"], [class*="program"]').forEach(el => {
        const t = el.innerText.trim();
        if (t.length > 3 && t.length < 60 && !t.includes('\n')) {
          listItems.push(t);
        }
      });

      // --- DESCRIPTION / ABOUT ---
      let about = '';
      // Try meta description first
      if (metaDesc.trim().length > 30) {
        about = metaDesc.trim();
      }
      // Try looking for an about section
      if (!about) {
        const aboutEls = document.querySelectorAll('[class*="about"] p, [id*="about"] p, .description p, .intro p');
        aboutEls.forEach(el => {
          const t = el.innerText.trim();
          if (t.length > 50 && t.length < 500 && !about) about = t;
        });
      }
      // Try first significant paragraph
      if (!about) {
        document.querySelectorAll('p').forEach(el => {
          const t = el.innerText.trim();
          if (t.length > 80 && t.length < 500 && !about && !t.match(/cookie|privacy|©|copyright/i)) {
            about = t;
          }
        });
      }

      // --- FREE TRIAL ---
      let freeTrial = '';
      if (lower.includes('free trial') || lower.includes('free class') || lower.includes('free assessment') ||
          lower.includes('free evaluation') || lower.includes('free consultation') || lower.includes('try a class')) {
        const trialPatterns = [
          /free\s*(?:trial|introductory|first)\s*(?:class|lesson|session)/i,
          /free\s*(?:assessment|evaluation|consultation)/i,
          /try\s*a\s*(?:free\s*)?class/i,
          /book\s*(?:a\s*)?free/i
        ];
        for (const p of trialPatterns) {
          const m = body.match(p);
          if (m) { freeTrial = m[0]; break; }
        }
      }

      return {
        ageRange: ageRange.substring(0, 50),
        pricing: pricing.substring(0, 80),
        about: about.substring(0, 400),
        freeTrial: freeTrial.substring(0, 60),
        programCount: listItems.length,
        topPrograms: listItems.slice(0, 15).join(' | ')
      };
    }, category);

    return data;
  } catch (err) {
    return null;
  }
}

function buildFields(scraped, biz) {
  const fields = {};
  let servicesArr = biz.services ? biz.services.split(',').map(s => s.trim()) : [];

  // Add age range to services if found and not already there
  if (scraped.ageRange && !servicesArr.some(s => /ages?\s*\d/i.test(s))) {
    servicesArr.unshift(scraped.ageRange);
  }

  // Add free trial to services if found
  if (scraped.freeTrial && !servicesArr.some(s => /free/i.test(s))) {
    servicesArr.push(scraped.freeTrial);
  }

  if (servicesArr.length > 0 && servicesArr.join(', ') !== (biz.services || '')) {
    fields.services = servicesArr.join(', ');
  }

  // Price note
  if (scraped.pricing && scraped.pricing.length > 3) {
    fields.price_note = scraped.pricing;
  }

  return fields;
}

async function main() {
  console.log('Fetching businesses...');
  const businesses = await fetchAllBusinesses();

  // Only process businesses that: have a website, don't have a take yet
  const targets = businesses.filter(b => b.website && !b.take);
  console.log(`Total: ${businesses.length}, Targets (have website, no take): ${targets.length}`);

  if (!targets.length) {
    console.log('Nothing to process.');
    return;
  }

  const { browser, context } = await launchBrowser();
  const page = await context.newPage();

  let enriched = 0;
  let errors = 0;
  let skipped = 0;

  for (let i = 0; i < targets.length; i++) {
    const biz = targets[i];
    const url = biz.website.startsWith('http') ? biz.website : `https://${biz.website}`;

    process.stdout.write(`[${i + 1}/${targets.length}] ${biz.name}... `);

    try {
      const scraped = await scrapeWebsite(page, url, biz.category);

      if (!scraped) {
        console.log('FAILED (timeout/error)');
        errors++;
        continue;
      }

      const fields = buildFields(scraped, biz);

      const foundAnything = scraped.ageRange || scraped.pricing || scraped.freeTrial || scraped.about;

      if (Object.keys(fields).length > 0) {
        await updateRecord(biz.id, fields);
        enriched++;
        console.log(`OK — age:${scraped.ageRange ? 'Y' : 'N'} price:${scraped.pricing ? 'Y' : 'N'} trial:${scraped.freeTrial ? 'Y' : 'N'}`);
      } else {
        skipped++;
        console.log(`SKIP (no extractable data)`);
      }

      // Log interesting finds for manual review
      if (scraped.about && scraped.about.length > 50) {
        console.log(`  ABOUT: ${scraped.about.substring(0, 120)}...`);
      }
      if (scraped.ageRange) console.log(`  AGE: ${scraped.ageRange}`);
      if (scraped.pricing) console.log(`  PRICE: ${scraped.pricing}`);
      if (scraped.freeTrial) console.log(`  TRIAL: ${scraped.freeTrial}`);

    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      errors++;
    }

    await sleep(2000);
  }

  await browser.close();

  console.log(`\n=== DONE ===`);
  console.log(`Enriched: ${enriched}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  console.log(`Run "npm run export" to update businesses.json.`);
}

main().catch(console.error);
