require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  // Tutoring & Learning Centers
  { query: 'tutoring center Plano TX', category: 'Tutoring & Learning Centers' },
  { query: 'Kumon Mathnasium Plano Frisco', category: 'Tutoring & Learning Centers' },
  { query: 'learning center kids Frisco TX', category: 'Tutoring & Learning Centers' },
  // Kids Activities & Classes
  { query: 'kids dance class Plano TX', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Frisco TX', category: 'Kids Activities & Classes' },
  { query: 'kids martial arts gymnastics Plano', category: 'Kids Activities & Classes' },
  { query: 'music lessons for kids Frisco TX', category: 'Kids Activities & Classes' },
  // Birthday Party Venues
  { query: 'birthday party venue kids Plano TX', category: 'Birthday Party Venues' },
  { query: 'kids party place Frisco TX', category: 'Birthday Party Venues' },
  // Summer Camps & After School
  { query: 'summer camp kids Plano TX', category: 'Summer Camps & After School' },
  { query: 'after school program Frisco TX', category: 'Summer Camps & After School' },
  // Pediatric Dentists & Doctors
  { query: 'pediatric dentist Plano TX', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatrician Frisco TX', category: 'Pediatric Dentists & Doctors' },
  // Daycares & Preschools
  { query: 'daycare preschool Plano TX', category: 'Daycares & Preschools' },
  { query: 'preschool Frisco TX', category: 'Daycares & Preschools' },
  // Family-Friendly Restaurants
  { query: 'family friendly restaurant kids menu Plano TX', category: 'Family-Friendly Restaurants' },
  { query: 'kid friendly restaurant Frisco TX', category: 'Family-Friendly Restaurants' },
  // Kids Haircuts & Clothing
  { query: 'kids haircut salon Plano TX', category: 'Kids Haircuts & Clothing' },
  { query: 'children clothing store Frisco TX', category: 'Kids Haircuts & Clothing' },
];

function extractCity(address) {
  if (!address) return 'Plano';
  const lower = address.toLowerCase();
  if (lower.includes('frisco')) return 'Frisco';
  if (lower.includes('plano')) return 'Plano';
  if (lower.includes('allen')) return 'Plano';
  if (lower.includes('mckinney')) return 'Frisco';
  return 'Plano';
}

async function scrapeGoogleMaps(context, query, category) {
  const results = [];
  const page = await context.newPage();

  try {
    const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
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

          const reviewMatch = ratingLabel.match(/(\d[\d,]*)\s*review/i);
          const reviewCount = reviewMatch ? parseInt(reviewMatch[1].replace(',', '')) : null;

          const priceEl = parent.querySelector('span:has(> span)');
          let priceRange = null;
          if (priceEl) {
            const priceMatch = priceEl.textContent.match(/(\${1,4})/);
            if (priceMatch) priceRange = priceMatch[1];
          }

          const textEls = parent.querySelectorAll('div[class] > div > div');
          let address = '';
          textEls.forEach(el => {
            const text = el.textContent.trim();
            if (text.match(/\d+\s+\w+\s+(st|ave|blvd|rd|dr|ln|way|pl|pkwy|hwy)/i)) {
              address = text;
            }
          });

          const imgEl = parent.querySelector('img[src*="googleusercontent"], img[src*="lh5"]');
          const imageUrl = imgEl ? imgEl.getAttribute('src') : '';

          if (name && !items.find(i => i.name === name)) {
            items.push({ name, href, rating, reviewCount, priceRange, address, imageUrl });
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
        await detailPage.goto(biz.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(3000);

        const details = await detailPage.evaluate(() => {
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

        const city = extractCity(details.address || biz.address);

        results.push({
          name: biz.name,
          slug: slugify(biz.name),
          category,
          city,
          neighborhood: '',
          address: details.address || biz.address,
          phone: details.phone,
          website: details.website,
          description: details.description,
          image_url: details.photo || biz.imageUrl,
          rating: biz.rating,
          review_count: biz.reviewCount,
          price_range: biz.priceRange,
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
  console.log('=== Kids Directory: Google Maps Scraper ===\n');
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
