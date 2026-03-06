/**
 * Fix missing images — visits Google Maps detail pages for businesses without image_url
 */
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

async function fetchImage(context, bizName, bizCity) {
  const page = await context.newPage();
  let imageUrl = '';

  try {
    const query = `${bizName} ${bizCity} TX`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3000);

    // Click first result to go to detail page
    const firstResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
    if (firstResult) {
      await firstResult.click();
      await sleep(3000);
    }

    // Try multiple image selectors
    imageUrl = await page.evaluate(() => {
      // Hero image (main photo button)
      const heroImg = document.querySelector('button[jsaction*="heroHeaderImage"] img');
      if (heroImg && heroImg.src && heroImg.src.includes('googleusercontent')) return heroImg.src;
      // Class-based hero
      const classImg = document.querySelector('img.Xmpv5');
      if (classImg && classImg.src) return classImg.src;
      // Any large Google user content image
      const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
      for (const img of imgs) {
        if (img.width > 100 || img.src.includes('w400') || img.src.includes('w408')) return img.src;
      }
      // OG image meta tag
      const ogImg = document.querySelector('meta[property="og:image"]');
      if (ogImg) return ogImg.getAttribute('content') || '';
      return '';
    }).catch(() => '');

  } catch (e) {
    console.log(`    ! Error: ${e.message}`);
  }

  await page.close();
  return imageUrl;
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
  console.log('=== Fix Missing Images ===\n');

  const records = await getAllRecords();
  const missing = records.filter(r => !r.fields.image_url);
  console.log(`${records.length} total, ${missing.length} missing images\n`);

  if (!missing.length) {
    console.log('All businesses have images!');
    return;
  }

  const { browser, context } = await launchBrowser();
  let fixed = 0;

  for (let i = 0; i < missing.length; i++) {
    const rec = missing[i];
    const name = rec.fields.name;
    const city = rec.fields.city || 'Plano';
    console.log(`  [${i + 1}/${missing.length}] ${name}...`);

    const imageUrl = await fetchImage(context, name, city);

    if (imageUrl) {
      await updateRecord(rec.id, { image_url: imageUrl });
      fixed++;
      console.log(`    Got image`);
    } else {
      console.log(`    No image found`);
    }

    await sleep(1500);
  }

  await browser.close();
  console.log(`\nFixed ${fixed} / ${missing.length} businesses`);
}

run().catch(console.error);
