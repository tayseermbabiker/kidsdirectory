require('dotenv').config();
const fetch = require('node-fetch');
const { sleep, launchBrowser } = require('./utils');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Businesses';

async function getAllRecords() {
  const records = [];
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}?${params}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` } });
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);
  return records;
}

async function enrichFromGoogleMaps(context, bizName, bizCity) {
  const page = await context.newPage();
  const result = { services: '', hours: '', image_url: '' };

  try {
    const query = `${bizName} ${bizCity} TX`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(4000);

    const firstResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
    if (firstResult) {
      await firstResult.click();
      await sleep(4000);
    }

    // Hours
    const hoursBtn = await page.$('button[data-item-id="oh"], div[aria-label*="hour" i], button[aria-label*="hour" i]');
    if (hoursBtn) {
      try { await hoursBtn.click(); await sleep(1500); } catch (e) {}
    }

    const hours = await page.evaluate(() => {
      const rows = [];
      const trs = document.querySelectorAll('table.eK4R0e tr, table.WgFkxc tr');
      trs.forEach(tr => {
        const cells = tr.querySelectorAll('td');
        if (cells.length >= 2) {
          const day = cells[0].textContent.trim();
          const time = cells[1].textContent.trim();
          if (day && time) rows.push(`${day}: ${time}`);
        }
      });
      if (rows.length) return rows.join('\n');
      const els = document.querySelectorAll('[aria-label]');
      for (const el of els) {
        const label = el.getAttribute('aria-label') || '';
        if (label.includes('Monday') && label.includes('Tuesday')) return label;
      }
      return '';
    }).catch(() => '');

    // Services
    const aboutTab = await page.$('button[aria-label="About"]');
    if (aboutTab) {
      try { await aboutTab.click(); await sleep(2000); } catch (e) {}
    }

    const services = await page.evaluate(() => {
      const items = [];
      const attrEls = document.querySelectorAll('div[role="region"] li span, div[class*="section"] li');
      attrEls.forEach(el => {
        const text = el.textContent.trim();
        if (text && text.length > 2 && text.length < 60 && !text.startsWith('No ')) items.push(text);
      });
      const unique = [...new Set(items)];
      return unique.slice(0, 20).join(', ');
    }).catch(() => '');

    // Hero image from detail page
    const image_url = await page.evaluate(() => {
      const heroImg = document.querySelector('button[jsaction*="heroHeaderImage"] img, img.Xmpv5');
      if (heroImg) return heroImg.getAttribute('src') || '';
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) return ogImg.getAttribute('content') || '';
      const anyImg = document.querySelector('img[src*="googleusercontent"][src*="w408"]');
      if (anyImg) return anyImg.getAttribute('src') || '';
      return '';
    }).catch(() => '');

    result.services = services;
    result.hours = hours;
    result.image_url = image_url;
  } catch (e) {
    console.log(`    ! Error: ${e.message}`);
  }

  await page.close();
  return result;
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
  if (!res.ok) console.log(`    ! Update failed: ${await res.text()}`);
}

async function run() {
  console.log('=== Kids Directory: Enrichment Scraper ===\n');

  const records = await getAllRecords();
  console.log(`${records.length} total businesses\n`);

  if (!records.length) return;

  const { browser, context } = await launchBrowser();
  let enriched = 0;

  for (const rec of records) {
    const name = rec.fields.name;
    const city = rec.fields.city || 'Plano';
    console.log(`  ${name}...`);

    const data = await enrichFromGoogleMaps(context, name, city);

    const updates = {};
    if (data.services) { updates.services = data.services; console.log(`    Services: ${data.services.substring(0, 80)}...`); }
    if (data.hours) { updates.hours = data.hours; console.log(`    Hours: found`); }

    if (Object.keys(updates).length) {
      await updateRecord(rec.id, updates);
      enriched++;
    } else {
      console.log(`    No data found`);
    }

    await sleep(2000);
  }

  await browser.close();
  console.log(`\nEnriched ${enriched} / ${records.length} businesses`);
}

run().catch(console.error);
