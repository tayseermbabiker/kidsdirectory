// One-time scraper for Harford County only
require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  { query: 'tutoring center Bel Air MD', category: 'Tutoring & Learning Centers' },
  { query: 'kids dance class Bel Air MD', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Aberdeen MD', category: 'Kids Activities & Classes' },
  { query: 'birthday party venue kids Bel Air MD', category: 'Birthday Party Venues' },
  { query: 'summer camp kids Harford County MD', category: 'Summer Camps & After School' },
  { query: 'pediatric dentist Bel Air MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'daycare preschool Bel Air MD', category: 'Daycares & Preschools' },
  { query: 'family friendly restaurant Bel Air MD', category: 'Family-Friendly Restaurants' },
  { query: 'kids haircut salon Bel Air MD', category: 'Kids Haircuts & Clothing' },
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
    if (feed) {
      for (let i = 0; i < 3; i++) {
        await feed.evaluate(el => el.scrollBy(0, 1000));
        await sleep(1500);
      }
    }

    const businesses = await page.evaluate(() => {
      const items = [];
      const cards = document.querySelectorAll('div[role="feed"] > div > div > a[href*="/maps/place/"]');
      cards.forEach(card => {
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
          const textEls = parent.querySelectorAll('div[class] > div > div');
          let address = '';
          textEls.forEach(el => {
            const text = el.textContent.trim();
            if (text.match(/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|pl|pkwy|hwy)/i)) address = text;
          });
          const imgEl = parent.querySelector('img[src*="googleusercontent"], img[src*="lh5"]');
          const imageUrl = imgEl ? imgEl.getAttribute('src') : '';
          if (name && !items.find(i => i.name === name)) {
            items.push({ name, href, rating, reviewCount, address, imageUrl });
          }
        } catch (e) {}
      });
      return items;
    });

    console.log(`  Found ${businesses.length} businesses`);

    for (const biz of businesses.slice(0, 8)) {
      try {
        if (!biz.href) continue;
        const detailPage = await context.newPage();
        const detailUrl = biz.href.includes('?') ? biz.href + '&hl=en' : biz.href + '?hl=en';
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(3000);

        const basicInfo = await detailPage.evaluate(() => {
          const phoneEl = document.querySelector('button[data-item-id*="phone"] div.fontBodyMedium');
          const phone = phoneEl ? phoneEl.textContent.trim() : '';
          const webEl = document.querySelector('a[data-item-id="authority"]');
          const website = webEl ? webEl.getAttribute('href') : '';
          const addrEl = document.querySelector('button[data-item-id="address"] div.fontBodyMedium');
          const address = addrEl ? addrEl.textContent.trim() : '';
          const descEl = document.querySelector('div[class*="section-editorial"] span, div.PYvSYb span');
          const description = descEl ? descEl.textContent.trim() : '';
          const photoEl = document.querySelector('button[jsaction*="heroHeaderImage"] img');
          const photo = photoEl ? photoEl.getAttribute('src') : '';
          return { phone, website, address, description, photo };
        });

        results.push({
          name: biz.name,
          slug: slugify(biz.name),
          category,
          city: 'Baltimore',
          neighborhood: 'Harford County',
          address: basicInfo.address || biz.address,
          phone: basicInfo.phone,
          website: basicInfo.website,
          description: (basicInfo.description || '').substring(0, 1000),
          image_url: basicInfo.photo || biz.imageUrl,
          rating: biz.rating,
          review_count: biz.reviewCount,
          source: 'Google Maps'
        });

        console.log(`    + ${biz.name} (${biz.rating || 'N/A'})`);
        await detailPage.close();
        await sleep(2000);
      } catch (e) {
        console.log(`    ! ${biz.name}: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`  ! Search error: ${e.message}`);
  }
  await page.close();
  return results;
}

async function run() {
  console.log('=== Harford County Scraper ===\n');
  const { browser, context } = await launchBrowser();
  const allResults = [];

  for (const search of SEARCHES) {
    const results = await scrapeGoogleMaps(context, search.query, search.category);
    allResults.push(...results);
    await sleep(3000);
  }

  await browser.close();

  const seen = new Set();
  const unique = allResults.filter(b => {
    if (seen.has(b.slug)) return false;
    seen.add(b.slug);
    return true;
  });

  console.log(`\nTotal unique: ${unique.length}`);
  await pushToAirtable(unique);
}

run().catch(console.error);
