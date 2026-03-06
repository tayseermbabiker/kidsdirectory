/**
 * Enrichment scraper — visits Google Maps detail pages to add:
 * phone, website, description, hours, services, reviews, image_url
 * Only updates fields that are currently empty.
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

async function enrichFromGoogleMaps(context, bizName, bizCity) {
  const page = await context.newPage();
  const result = { phone: '', website: '', description: '', services: '', hours: '', reviews: '', image_url: '' };

  try {
    const query = `${bizName} ${bizCity} TX`;
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(3500);

    const firstResult = await page.$('div[role="feed"] a[href*="/maps/place/"]');
    if (firstResult) {
      await firstResult.click();
      await sleep(3500);
    }

    // Basic info: phone, website, address, description, image
    const basicInfo = await page.evaluate(() => {
      const phoneEl = document.querySelector('button[data-item-id*="phone"] div.fontBodyMedium');
      const phone = phoneEl ? phoneEl.textContent.trim() : '';
      const webEl = document.querySelector('a[data-item-id="authority"]');
      const website = webEl ? webEl.getAttribute('href') : '';
      const descEl = document.querySelector('div[class*="section-editorial"] span, div.PYvSYb span');
      const description = descEl ? descEl.textContent.trim() : '';
      const typeEl = document.querySelector('button[jsaction*="category"]');
      const bizType = typeEl ? typeEl.textContent.trim() : '';
      // Hero image
      const heroImg = document.querySelector('button[jsaction*="heroHeaderImage"] img');
      let imageUrl = '';
      if (heroImg && heroImg.src && heroImg.src.includes('googleusercontent')) imageUrl = heroImg.src;
      if (!imageUrl) {
        const classImg = document.querySelector('img.Xmpv5');
        if (classImg && classImg.src) imageUrl = classImg.src;
      }
      if (!imageUrl) {
        const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
        for (const img of imgs) {
          if (img.width > 100 || img.src.includes('w400') || img.src.includes('w408')) { imageUrl = img.src; break; }
        }
      }
      return { phone, website, description, bizType, imageUrl };
    }).catch(() => ({ phone: '', website: '', description: '', bizType: '', imageUrl: '' }));

    result.phone = basicInfo.phone;
    result.website = basicInfo.website;
    result.image_url = basicInfo.imageUrl;

    // Build description from bizType + editorial
    let desc = basicInfo.description || '';
    if (basicInfo.bizType && !desc.includes(basicInfo.bizType)) {
      desc = basicInfo.bizType + (desc ? '. ' + desc : '');
    }
    result.description = desc;

    // Hours
    const hoursBtn = await page.$('button[data-item-id="oh"], div[aria-label*="hour" i], button[aria-label*="hour" i]');
    if (hoursBtn) {
      try { await hoursBtn.click(); await sleep(1500); } catch (e) {}
    }

    result.hours = await page.evaluate(() => {
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

    // About tab — services
    const aboutTab = await page.$('button[aria-label="About"]');
    if (aboutTab) {
      try { await aboutTab.click(); await sleep(2000); } catch (e) {}
    }

    const aboutData = await page.evaluate(() => {
      const services = [];
      const highlights = [];
      const sections = document.querySelectorAll('div[role="region"]');
      sections.forEach(section => {
        const heading = section.querySelector('h2, h3, [role="heading"]');
        const headingText = heading ? heading.textContent.trim().toLowerCase() : '';
        const items = section.querySelectorAll('li span, div[class*="attr"] span');
        items.forEach(el => {
          const text = el.textContent.trim();
          if (!text || text.length < 3 || text.length > 80 || text.startsWith('No ')) return;
          if (headingText.includes('highlight') || headingText.includes('amenit') || headingText.includes('offering')) {
            highlights.push(text);
          } else {
            services.push(text);
          }
        });
      });
      return {
        services: [...new Set(services)].slice(0, 20).join(', '),
        highlights: [...new Set(highlights)].slice(0, 10).join(', ')
      };
    }).catch(() => ({ services: '', highlights: '' }));

    result.services = aboutData.services;
    if (aboutData.highlights && result.description) {
      result.description += '\n\n' + aboutData.highlights;
    } else if (aboutData.highlights) {
      result.description = aboutData.highlights;
    }

    // Reviews tab
    const overviewTab = await page.$('button[aria-label="Overview"]');
    if (overviewTab) { try { await overviewTab.click(); await sleep(800); } catch (e) {} }

    const reviewsTab = await page.$('button[aria-label="Reviews"]');
    if (reviewsTab) {
      try { await reviewsTab.click(); await sleep(2500); } catch (e) {}
    }

    result.reviews = await page.evaluate(() => {
      const snippets = [];
      const reviewEls = document.querySelectorAll('span.wiI7pd, div.MyEned span, div[data-review-id] span.wiI7pd');
      reviewEls.forEach(el => {
        const text = el.textContent.trim();
        if (text.length > 30 && text.length < 500) snippets.push(text);
      });
      return snippets.slice(0, 3).join('\n---\n');
    }).catch(() => '');

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
  console.log('=== Kids Directory: Full Enrichment Scraper ===\n');

  const records = await getAllRecords();
  console.log(`${records.length} total businesses\n`);

  // Prioritize records missing the most data
  const needsEnrichment = records.filter(r => {
    const f = r.fields;
    return !f.phone || !f.website || !f.description || !f.hours || !f.reviews || !f.image_url;
  });

  console.log(`${needsEnrichment.length} need enrichment\n`);
  if (!needsEnrichment.length) { console.log('All businesses fully enriched!'); return; }

  const { browser, context } = await launchBrowser();
  let enriched = 0;

  for (let i = 0; i < needsEnrichment.length; i++) {
    const rec = needsEnrichment[i];
    const f = rec.fields;
    const name = f.name;
    const city = f.city || 'Plano';
    console.log(`  [${i + 1}/${needsEnrichment.length}] ${name}...`);

    const data = await enrichFromGoogleMaps(context, name, city);

    // Only update empty fields
    const updates = {};
    if (!f.phone && data.phone) updates.phone = data.phone;
    if (!f.website && data.website) updates.website = data.website;
    if (!f.description && data.description) updates.description = data.description.substring(0, 1000);
    if (!f.services && data.services) updates.services = data.services;
    if (!f.hours && data.hours) updates.hours = data.hours;
    if (!f.reviews && data.reviews) updates.reviews = data.reviews;
    if (!f.image_url && data.image_url) updates.image_url = data.image_url;

    const fields = Object.keys(updates);
    if (fields.length) {
      await updateRecord(rec.id, updates);
      enriched++;
      console.log(`    + ${fields.join(', ')}`);
    } else {
      console.log(`    (no new data)`);
    }

    await sleep(1500);
  }

  await browser.close();
  console.log(`\nEnriched ${enriched} / ${needsEnrichment.length} businesses`);
}

run().catch(console.error);
