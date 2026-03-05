const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const CATEGORY = 'Kids Haircuts & Clothing';
const LOCATIONS = [
  { city: 'Plano', query: 'find_desc=kids+haircut+children+clothing&find_loc=Plano%2C+TX' },
  { city: 'Frisco', query: 'find_desc=kids+haircut+children+clothing&find_loc=Frisco%2C+TX' }
];
const MAX_PAGES = 3;

async function scrapeYelp(context, location) {
  const businesses = [];
  const page = await context.newPage();
  const baseUrl = `https://www.yelp.com/search?${location.query}`;

  for (let pageNum = 0; pageNum < MAX_PAGES; pageNum++) {
    const url = pageNum === 0 ? baseUrl : `${baseUrl}&start=${pageNum * 10}`;
    console.log(`  Page ${pageNum + 1}: ${url}`);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3000);

    const cards = await page.evaluate(() => {
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

    console.log(`  Found ${cards.length} results`);
    for (const card of cards) {
      try {
        const detailPage = await context.newPage();
        await detailPage.goto(`https://www.yelp.com${card.href}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(2000);
        const details = await detailPage.evaluate(() => {
          const address = document.querySelector('address p, [class*="map"] p')?.textContent?.trim() || '';
          const phone = document.querySelector('p[class*="css-"] a[href^="tel:"]')?.textContent?.trim() || '';
          const website = document.querySelector('a[href*="biz_redir"][class*="css-"]')?.getAttribute('href') || '';
          const descEl = document.querySelector('[class*="fromTheBusiness"] p, [class*="description"] p');
          const description = descEl ? descEl.textContent.trim() : '';
          return { address, phone, website, description };
        });
        businesses.push({
          name: card.name, slug: card.slug, category: CATEGORY, city: location.city,
          neighborhood: card.neighborhood, address: details.address, phone: details.phone,
          website: details.website, description: details.description, image_url: card.imageUrl,
          rating: card.rating, review_count: card.reviewCount, price_range: card.priceRange, source: 'Yelp'
        });
        console.log(`  + ${card.name} (${card.rating || 'N/A'} stars)`);
        await detailPage.close();
        await sleep(1500);
      } catch (err) { console.log(`  ! Error on ${card.name}: ${err.message}`); }
    }
    if (pageNum < MAX_PAGES - 1) await sleep(2000);
  }
  await page.close();
  return businesses;
}

async function scrape() {
  console.log(`\n--- Scraping Yelp: ${CATEGORY} ---`);
  const { browser, context } = await launchBrowser();
  const allBusinesses = [];
  try {
    for (const loc of LOCATIONS) {
      console.log(`\n[${loc.city}]`);
      allBusinesses.push(...await scrapeYelp(context, loc));
    }
  } catch (err) { console.error('Scraper error:', err.message); }
  finally { await browser.close(); }
  console.log(`\nTotal scraped: ${allBusinesses.length}`);
  await pushToAirtable(allBusinesses);
}

scrape().catch(console.error);
