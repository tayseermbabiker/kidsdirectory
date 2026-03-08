/**
 * Unified Yelp scraper for all categories
 * Uses visible browser + homepage cookie warmup to bypass blocking
 */
const { slugify, sleep, pushToAirtable } = require('./utils');

const SEARCHES = [
  // === PLANO & FRISCO, TX ===
  { term: 'tutoring+center', loc: 'Plano%2C+TX', category: 'Tutoring & Learning Centers', city: 'Plano' },
  { term: 'tutoring+center', loc: 'Frisco%2C+TX', category: 'Tutoring & Learning Centers', city: 'Frisco' },
  { term: 'kids+activities+classes', loc: 'Plano%2C+TX', category: 'Kids Activities & Classes', city: 'Plano' },
  { term: 'kids+activities+classes', loc: 'Frisco%2C+TX', category: 'Kids Activities & Classes', city: 'Frisco' },
  { term: 'birthday+party+venue+kids', loc: 'Plano%2C+TX', category: 'Birthday Party Venues', city: 'Plano' },
  { term: 'birthday+party+venue+kids', loc: 'Frisco%2C+TX', category: 'Birthday Party Venues', city: 'Frisco' },
  { term: 'summer+camp+after+school', loc: 'Plano%2C+TX', category: 'Summer Camps & After School', city: 'Plano' },
  { term: 'summer+camp+after+school', loc: 'Frisco%2C+TX', category: 'Summer Camps & After School', city: 'Frisco' },
  { term: 'pediatric+dentist+doctor', loc: 'Plano%2C+TX', category: 'Pediatric Dentists & Doctors', city: 'Plano' },
  { term: 'pediatric+dentist+doctor', loc: 'Frisco%2C+TX', category: 'Pediatric Dentists & Doctors', city: 'Frisco' },
  { term: 'daycare+preschool', loc: 'Plano%2C+TX', category: 'Daycares & Preschools', city: 'Plano' },
  { term: 'daycare+preschool', loc: 'Frisco%2C+TX', category: 'Daycares & Preschools', city: 'Frisco' },
  { term: 'family+friendly+restaurant+kids', loc: 'Plano%2C+TX', category: 'Family-Friendly Restaurants', city: 'Plano' },
  { term: 'family+friendly+restaurant+kids', loc: 'Frisco%2C+TX', category: 'Family-Friendly Restaurants', city: 'Frisco' },
  { term: 'kids+haircut+children+clothing', loc: 'Plano%2C+TX', category: 'Kids Haircuts & Clothing', city: 'Plano' },
  { term: 'kids+haircut+children+clothing', loc: 'Frisco%2C+TX', category: 'Kids Haircuts & Clothing', city: 'Frisco' },

  // === BALTIMORE AREA, MD ===
  { term: 'tutoring+center', loc: 'Columbia%2C+MD', category: 'Tutoring & Learning Centers', city: 'Baltimore' },
  { term: 'tutoring+center', loc: 'Towson%2C+MD', category: 'Tutoring & Learning Centers', city: 'Baltimore' },
  { term: 'kids+activities+classes', loc: 'Columbia%2C+MD', category: 'Kids Activities & Classes', city: 'Baltimore' },
  { term: 'kids+activities+classes', loc: 'Towson%2C+MD', category: 'Kids Activities & Classes', city: 'Baltimore' },
  { term: 'birthday+party+venue+kids', loc: 'Columbia%2C+MD', category: 'Birthday Party Venues', city: 'Baltimore' },
  { term: 'birthday+party+venue+kids', loc: 'Catonsville%2C+MD', category: 'Birthday Party Venues', city: 'Baltimore' },
  { term: 'summer+camp+after+school', loc: 'Columbia%2C+MD', category: 'Summer Camps & After School', city: 'Baltimore' },
  { term: 'summer+camp+after+school', loc: 'Severna+Park%2C+MD', category: 'Summer Camps & After School', city: 'Baltimore' },
  { term: 'pediatric+dentist+doctor', loc: 'Columbia%2C+MD', category: 'Pediatric Dentists & Doctors', city: 'Baltimore' },
  { term: 'pediatric+dentist+doctor', loc: 'Towson%2C+MD', category: 'Pediatric Dentists & Doctors', city: 'Baltimore' },
  { term: 'daycare+preschool', loc: 'Columbia%2C+MD', category: 'Daycares & Preschools', city: 'Baltimore' },
  { term: 'daycare+preschool', loc: 'Catonsville%2C+MD', category: 'Daycares & Preschools', city: 'Baltimore' },
  { term: 'family+friendly+restaurant+kids', loc: 'Columbia%2C+MD', category: 'Family-Friendly Restaurants', city: 'Baltimore' },
  { term: 'family+friendly+restaurant+kids', loc: 'Towson%2C+MD', category: 'Family-Friendly Restaurants', city: 'Baltimore' },
  { term: 'kids+haircut+children+clothing', loc: 'Columbia%2C+MD', category: 'Kids Haircuts & Clothing', city: 'Baltimore' },
  { term: 'kids+haircut+children+clothing', loc: 'Severna+Park%2C+MD', category: 'Kids Haircuts & Clothing', city: 'Baltimore' },

  // === HARFORD COUNTY, MD ===
  { term: 'tutoring+center', loc: 'Bel+Air%2C+MD', category: 'Tutoring & Learning Centers', city: 'Baltimore' },
  { term: 'kids+activities+classes', loc: 'Bel+Air%2C+MD', category: 'Kids Activities & Classes', city: 'Baltimore' },
  { term: 'birthday+party+venue+kids', loc: 'Bel+Air%2C+MD', category: 'Birthday Party Venues', city: 'Baltimore' },
  { term: 'summer+camp+after+school', loc: 'Bel+Air%2C+MD', category: 'Summer Camps & After School', city: 'Baltimore' },
  { term: 'pediatric+dentist+doctor', loc: 'Bel+Air%2C+MD', category: 'Pediatric Dentists & Doctors', city: 'Baltimore' },
  { term: 'daycare+preschool', loc: 'Bel+Air%2C+MD', category: 'Daycares & Preschools', city: 'Baltimore' },
  { term: 'family+friendly+restaurant+kids', loc: 'Bel+Air%2C+MD', category: 'Family-Friendly Restaurants', city: 'Baltimore' },
  { term: 'kids+haircut+children+clothing', loc: 'Bel+Air%2C+MD', category: 'Kids Haircuts & Clothing', city: 'Baltimore' },
];

const MAX_PAGES = 2; // 2 pages per search to be safe

async function launchStealthBrowser() {
  const { chromium } = require('playwright');
  const browser = await chromium.launch({
    headless: false,
    args: ['--disable-blink-features=AutomationControlled']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 },
    locale: 'en-US'
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    window.chrome = { runtime: {} };
  });
  return { browser, context };
}

async function scrapeSearchPage(page) {
  return page.evaluate(() => {
    const results = [];
    const items = document.querySelectorAll('[data-testid="serp-ia-card"]');
    items.forEach(item => {
      try {
        const nameEl = item.querySelector('a[href*="/biz/"] h3, a[href*="/biz/"] span');
        const linkEl = item.querySelector('a[href*="/biz/"]');
        const ratingEl = item.querySelector('[aria-label*="star rating"]');
        const reviewEl = item.querySelector('span[class*="css-"] a[href*="#reviews"]');
        const priceEl = item.querySelector('span.priceRange');
        const hoodEl = item.querySelector('span[class*="css-"]:not([aria-label])');
        const imgEl = item.querySelector('img[src*="bphoto"], img[loading]');
        if (!nameEl || !linkEl) return;
        const name = nameEl.textContent.replace(/^\d+\.\s*/, '').trim();
        const href = linkEl.getAttribute('href');
        const slug = href ? href.split('/biz/')[1]?.split('?')[0] : null;
        let rating = null;
        if (ratingEl) { const m = (ratingEl.getAttribute('aria-label') || '').match(/([\d.]+)/); if (m) rating = parseFloat(m[1]); }
        let reviewCount = null;
        if (reviewEl) { const m = reviewEl.textContent.match(/(\d+)/); if (m) reviewCount = parseInt(m[1]); }
        const priceRange = priceEl ? priceEl.textContent.trim() : null;
        const neighborhood = hoodEl ? hoodEl.textContent.trim() : '';
        const imageUrl = imgEl ? imgEl.getAttribute('src') : '';
        if (name && slug) results.push({ name, slug, rating, reviewCount, priceRange, neighborhood, imageUrl, href });
      } catch (e) {}
    });
    return results;
  });
}

async function run() {
  console.log('=== Kids Directory: Yelp Scraper (Stealth) ===\n');
  const { browser, context } = await launchStealthBrowser();
  const allBusinesses = [];

  try {
    // Warmup: visit Yelp homepage to get cookies
    const warmup = await context.newPage();
    console.log('Warming up cookies on Yelp homepage...');
    await warmup.goto('https://www.yelp.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);
    await warmup.close();

    for (const search of SEARCHES) {
      const baseUrl = `https://www.yelp.com/search?find_desc=${search.term}&find_loc=${search.loc}`;
      console.log(`\n[${search.category} — ${search.city}]`);

      for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
        const url = pageNum === 0 ? baseUrl : `${baseUrl}&start=${pageNum * 10}`;
        console.log(`  Page ${pageNum + 1}`);

        const page = await context.newPage();
        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await sleep(4000);

          const cards = await scrapeSearchPage(page);
          console.log(`  Found ${cards.length} results`);

          for (const card of cards) {
            // Visit detail page for address/phone/website
            try {
              const detailPage = await context.newPage();
              await detailPage.goto(`https://www.yelp.com${card.href}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
              await sleep(2500);

              const details = await detailPage.evaluate(() => {
                const address = document.querySelector('address p, [class*="map"] p')?.textContent?.trim() || '';
                const phone = document.querySelector('p[class*="css-"] a[href^="tel:"]')?.textContent?.trim() || '';
                const website = document.querySelector('a[href*="biz_redir"][class*="css-"]')?.getAttribute('href') || '';
                const descEl = document.querySelector('[class*="fromTheBusiness"] p, [class*="description"] p');
                const description = descEl ? descEl.textContent.trim() : '';
                return { address, phone, website, description };
              });

              allBusinesses.push({
                name: card.name,
                slug: card.slug,
                category: search.category,
                city: search.city,
                neighborhood: card.neighborhood,
                address: details.address,
                phone: details.phone,
                website: details.website,
                description: details.description,
                image_url: card.imageUrl,
                rating: card.rating,
                review_count: card.reviewCount,
                price_range: card.priceRange,
                source: 'Yelp'
              });

              console.log(`    + ${card.name} (${card.rating || 'N/A'})`);
              await detailPage.close();
              await sleep(1500);
            } catch (err) {
              console.log(`    ! ${card.name}: ${err.message}`);
            }
          }
        } catch (err) {
          console.log(`  ! Page error: ${err.message}`);
        }

        await page.close();
        await sleep(3000);
      }
    }
  } catch (err) {
    console.error('Scraper error:', err.message);
  } finally {
    await browser.close();
  }

  // Deduplicate
  const seen = new Set();
  const unique = allBusinesses.filter(b => {
    if (seen.has(b.slug)) return false;
    seen.add(b.slug);
    return true;
  });

  console.log(`\nTotal scraped: ${allBusinesses.length}, unique: ${unique.length}`);
  await pushToAirtable(unique);
}

run().catch(console.error);
