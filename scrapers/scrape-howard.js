// Thorough scraper for Howard County
require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  // Tutoring & Learning Centers
  { query: 'tutoring center Columbia MD', category: 'Tutoring & Learning Centers' },
  { query: 'Kumon Mathnasium Columbia Ellicott City MD', category: 'Tutoring & Learning Centers' },
  { query: 'learning center kids Ellicott City MD', category: 'Tutoring & Learning Centers' },
  { query: 'math tutoring reading center Howard County MD', category: 'Tutoring & Learning Centers' },
  // Kids Activities & Classes
  { query: 'kids dance class Columbia MD', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Columbia Ellicott City MD', category: 'Kids Activities & Classes' },
  { query: 'kids martial arts karate Columbia MD', category: 'Kids Activities & Classes' },
  { query: 'music lessons for kids Ellicott City MD', category: 'Kids Activities & Classes' },
  { query: 'kids gymnastics Columbia MD', category: 'Kids Activities & Classes' },
  { query: 'kids art class pottery painting Howard County MD', category: 'Kids Activities & Classes' },
  // Birthday Party Venues
  { query: 'birthday party venue kids Columbia MD', category: 'Birthday Party Venues' },
  { query: 'kids party place Ellicott City MD', category: 'Birthday Party Venues' },
  { query: 'trampoline park bowling kids Howard County MD', category: 'Birthday Party Venues' },
  // Summer Camps & After School
  { query: 'summer camp kids Columbia MD', category: 'Summer Camps & After School' },
  { query: 'after school program Ellicott City MD', category: 'Summer Camps & After School' },
  { query: 'summer camp Howard County MD', category: 'Summer Camps & After School' },
  // Pediatric Dentists & Doctors
  { query: 'pediatric dentist Columbia MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatrician Ellicott City MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatric dentist Howard County MD', category: 'Pediatric Dentists & Doctors' },
  // Daycares & Preschools
  { query: 'daycare preschool Columbia MD', category: 'Daycares & Preschools' },
  { query: 'preschool Ellicott City MD', category: 'Daycares & Preschools' },
  { query: 'daycare Montessori Howard County MD', category: 'Daycares & Preschools' },
  // Family-Friendly Restaurants
  { query: 'family friendly restaurant kids Columbia MD', category: 'Family-Friendly Restaurants' },
  { query: 'kid friendly restaurant Ellicott City MD', category: 'Family-Friendly Restaurants' },
  { query: 'family restaurant brunch kids Howard County MD', category: 'Family-Friendly Restaurants' },
  // Kids Haircuts & Clothing
  { query: 'kids haircut salon Columbia MD', category: 'Kids Haircuts & Clothing' },
  { query: 'children clothing store Ellicott City Columbia MD', category: 'Kids Haircuts & Clothing' },
];

async function scrapeGoogleMaps(context, query, category) {
  const results = [];
  const page = await context.newPage();
  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
    console.log(`  Searching: ${query}`);
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);
    const feed = await page.$('div[role="feed"]');
    if (feed) { for (let i = 0; i < 3; i++) { await feed.evaluate(el => el.scrollBy(0, 1000)); await sleep(1500); } }
    const businesses = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('div[role="feed"] > div > div > a[href*="/maps/place/"]').forEach(card => {
        try {
          const parent = card.closest('div[role="feed"] > div');
          if (!parent) return;
          const name = card.getAttribute('aria-label') || '';
          const href = card.getAttribute('href') || '';
          const ratingEl = parent.querySelector('span[role="img"]');
          const ratingLabel = ratingEl ? ratingEl.getAttribute('aria-label') || '' : '';
          const ratingMatch = ratingLabel.match(/([\d.]+)/);
          const rating = ratingMatch ? parseFloat(ratingMatch[1]) : null;
          const nums = ratingLabel.match(/[\d,]+/g);
          let reviewCount = null;
          if (nums && nums.length >= 2) reviewCount = parseInt(nums[1].replace(/,/g, ''));
          let address = '';
          parent.querySelectorAll('div[class] > div > div').forEach(el => {
            const text = el.textContent.trim();
            if (text.match(/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|pl|pkwy|hwy)/i)) address = text;
          });
          const imgEl = parent.querySelector('img[src*="googleusercontent"], img[src*="lh5"]');
          const imageUrl = imgEl ? imgEl.getAttribute('src') : '';
          if (name && !items.find(i => i.name === name)) items.push({ name, href, rating, reviewCount, address, imageUrl });
        } catch (e) {}
      });
      return items;
    });
    console.log(`  Found ${businesses.length} businesses`);
    for (const biz of businesses.slice(0, 8)) {
      try {
        if (!biz.href) continue;
        const dp = await context.newPage();
        await dp.goto(biz.href.includes('?') ? biz.href + '&hl=en' : biz.href + '?hl=en', { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(3000);
        const info = await dp.evaluate(() => {
          const p = s => { const e = document.querySelector(s); return e ? e.textContent.trim() : ''; };
          const a = s => { const e = document.querySelector(s); return e ? e.getAttribute('href') : ''; };
          return { phone: p('button[data-item-id*="phone"] div.fontBodyMedium'), website: a('a[data-item-id="authority"]'), address: p('button[data-item-id="address"] div.fontBodyMedium'), description: p('div[class*="section-editorial"] span, div.PYvSYb span'), photo: (document.querySelector('button[jsaction*="heroHeaderImage"] img') || {}).src || '', bizType: p('button[jsaction*="category"]') };
        });
        const hb = await dp.$('button[data-item-id="oh"], div[aria-label*="hour" i]');
        if (hb) { try { await hb.click(); await sleep(1500); } catch(e){} }
        const hours = await dp.evaluate(() => { const r=[]; document.querySelectorAll('table.eK4R0e tr, table.WgFkxc tr').forEach(tr => { const c=tr.querySelectorAll('td'); if(c.length>=2) r.push(c[0].textContent.trim()+': '+c[1].textContent.trim()); }); return r.join('\n'); }).catch(()=>'');
        const rt = await dp.$('button[aria-label="Reviews"]');
        if (rt) { try { await rt.click(); await sleep(2500); } catch(e){} }
        const reviews = await dp.evaluate(() => { const s=[]; document.querySelectorAll('span.wiI7pd').forEach(el => { const t=el.textContent.trim(); if(t.length>30&&t.length<500) s.push(t); }); return s.slice(0,3).join('\n---\n'); }).catch(()=>'');
        const ot = await dp.$('button[aria-label="Overview"]');
        if (ot) { try { await ot.click(); await sleep(1000); } catch(e){} }
        const at = await dp.$('button[aria-label="About"]');
        if (at) { try { await at.click(); await sleep(2000); } catch(e){} }
        const services = await dp.evaluate(() => { const i=[]; document.querySelectorAll('div[role="region"] li span, div[class*="attr"] span').forEach(el => { const t=el.textContent.trim(); if(t&&t.length>2&&t.length<60&&!t.startsWith('No ')) i.push(t); }); return [...new Set(i)].slice(0,20).join(', '); }).catch(()=>'');
        let desc = info.description || '';
        if (info.bizType && !desc.includes(info.bizType)) desc = info.bizType + (desc ? '. ' + desc : '');
        results.push({ name: biz.name, slug: slugify(biz.name), category, city: 'Baltimore', neighborhood: 'Howard County', address: info.address || biz.address, phone: info.phone, website: info.website, description: desc.substring(0,1000), image_url: info.photo || biz.imageUrl, rating: biz.rating, review_count: biz.reviewCount, services, hours, reviews, source: 'Google Maps' });
        console.log(`    + ${biz.name} (${biz.rating||'N/A'}) [${services?'services':''}${hours?' hours':''}${reviews?' reviews':''}]`);
        await dp.close(); await sleep(2000);
      } catch (e) { console.log(`    ! ${biz.name}: ${e.message}`); }
    }
  } catch (e) { console.log(`  ! Search error: ${e.message}`); }
  await page.close();
  return results;
}

async function run() {
  console.log('=== Howard County Scraper ===\n');
  const { browser, context } = await launchBrowser();
  const all = [];
  for (const s of SEARCHES) { all.push(...await scrapeGoogleMaps(context, s.query, s.category)); await sleep(3000); }
  await browser.close();
  const seen = new Set();
  const unique = all.filter(b => { if (seen.has(b.slug)) return false; seen.add(b.slug); return true; });
  console.log(`\nTotal unique: ${unique.length}`);
  await pushToAirtable(unique);
}
run().catch(console.error);
