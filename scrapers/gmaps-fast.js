/**
 * FAST Google Maps scraper — listing pages only, no detail visits
 * Pushes after each search query for reliability
 * Detail enrichment done separately by enrich-businesses.js
 */
require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  { query: 'tutoring center Plano TX', category: 'Tutoring & Learning Centers' },
  { query: 'Kumon Mathnasium Plano Frisco', category: 'Tutoring & Learning Centers' },
  { query: 'learning center kids Frisco TX', category: 'Tutoring & Learning Centers' },
  { query: 'kids dance class Plano TX', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Frisco TX', category: 'Kids Activities & Classes' },
  { query: 'kids martial arts gymnastics Plano', category: 'Kids Activities & Classes' },
  { query: 'music lessons for kids Frisco TX', category: 'Kids Activities & Classes' },
  { query: 'birthday party venue kids Plano TX', category: 'Birthday Party Venues' },
  { query: 'kids party place Frisco TX', category: 'Birthday Party Venues' },
  { query: 'summer camp kids Plano TX', category: 'Summer Camps & After School' },
  { query: 'after school program Frisco TX', category: 'Summer Camps & After School' },
  { query: 'pediatric dentist Plano TX', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatrician Frisco TX', category: 'Pediatric Dentists & Doctors' },
  { query: 'daycare preschool Plano TX', category: 'Daycares & Preschools' },
  { query: 'preschool Frisco TX', category: 'Daycares & Preschools' },
  { query: 'family friendly restaurant kids menu Plano TX', category: 'Family-Friendly Restaurants' },
  { query: 'kid friendly restaurant Frisco TX', category: 'Family-Friendly Restaurants' },
  { query: 'kids haircut salon Plano TX', category: 'Kids Haircuts & Clothing' },
  { query: 'children clothing store Frisco TX', category: 'Kids Haircuts & Clothing' },
];

function extractCity(text) {
  if (!text) return 'Plano';
  const lower = text.toLowerCase();
  if (lower.includes('frisco')) return 'Frisco';
  if (lower.includes('plano')) return 'Plano';
  if (lower.includes('allen')) return 'Plano';
  if (lower.includes('mckinney')) return 'Frisco';
  return 'Plano';
}

async function scrapeListings(page, query, category) {
  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=en`;
  console.log(`  Searching: ${query}`);
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  // Scroll to load more results
  const feed = await page.$('div[role="feed"]');
  if (feed) {
    for (let i = 0; i < 4; i++) {
      await feed.evaluate(el => el.scrollBy(0, 1200));
      await sleep(1000);
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
        const nums = ratingLabel.match(/[\d,.]+/g) || [];
        const rating = nums[0] ? parseFloat(nums[0].replace(',', '.')) : null;
        const reviewCount = nums[1] ? parseInt(nums[1].replace(/[,\.]/g, '')) : null;

        // Get all visible text snippets for address + type
        const allText = [];
        parent.querySelectorAll('div[class] > div > div, span').forEach(el => {
          const t = el.textContent.trim();
          if (t && t.length > 3 && t.length < 150) allText.push(t);
        });

        let address = '';
        let bizType = '';
        for (const t of allText) {
          if (t.match(/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|pl|pkwy|hwy|tx)/i) && !address) {
            address = t;
          }
          if (t.match(/(tutor|school|dance|swim|martial|music|dentist|doctor|daycare|preschool|restaurant|salon|camp|gym|party|pediatric)/i) && !bizType && t.length < 60) {
            bizType = t;
          }
        }

        const imgEl = parent.querySelector('img[src*="googleusercontent"], img[src*="lh5"]');
        const imageUrl = imgEl ? imgEl.getAttribute('src') : '';

        if (name && !items.find(i => i.name === name)) {
          items.push({ name, href, rating, reviewCount, address, imageUrl, bizType });
        }
      } catch (e) {}
    });

    return items;
  });

  console.log(`  Found ${businesses.length} businesses`);

  return businesses.map(biz => ({
    name: biz.name,
    slug: slugify(biz.name),
    category,
    city: extractCity(biz.address || query),
    neighborhood: '',
    address: biz.address || '',
    phone: '',
    website: '',
    description: biz.bizType || '',
    image_url: biz.imageUrl || '',
    rating: biz.rating,
    review_count: biz.reviewCount,
    price_range: null,
    source: 'Google Maps'
  }));
}

async function run() {
  console.log('=== Kids Directory: FAST Google Maps Scraper (EN) ===\n');
  const { browser, context } = await launchBrowser();
  const page = await context.newPage();
  const allResults = [];

  for (const search of SEARCHES) {
    try {
      const results = await scrapeListings(page, search.query, search.category);
      allResults.push(...results);
    } catch (e) {
      console.log(`  ! Error: ${e.message}`);
    }
    await sleep(2000);
  }

  await browser.close();

  // Deduplicate
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
