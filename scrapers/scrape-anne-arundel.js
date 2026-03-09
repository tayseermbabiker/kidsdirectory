// Thorough scraper for Anne Arundel County
require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  // Tutoring & Learning Centers
  { query: 'tutoring center Annapolis MD', category: 'Tutoring & Learning Centers' },
  { query: 'Kumon Mathnasium Severna Park MD', category: 'Tutoring & Learning Centers' },
  { query: 'learning center kids Glen Burnie MD', category: 'Tutoring & Learning Centers' },
  { query: 'tutoring center Crofton Odenton MD', category: 'Tutoring & Learning Centers' },
  // Kids Activities & Classes
  { query: 'kids dance class Annapolis MD', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Severna Park MD', category: 'Kids Activities & Classes' },
  { query: 'kids martial arts gymnastics Glen Burnie MD', category: 'Kids Activities & Classes' },
  { query: 'music lessons for kids Annapolis MD', category: 'Kids Activities & Classes' },
  { query: 'kids art class Crofton MD', category: 'Kids Activities & Classes' },
  { query: 'kids gymnastics Severna Park Annapolis MD', category: 'Kids Activities & Classes' },
  // Birthday Party Venues
  { query: 'birthday party venue kids Annapolis MD', category: 'Birthday Party Venues' },
  { query: 'kids party place Glen Burnie Severna Park MD', category: 'Birthday Party Venues' },
  { query: 'trampoline park bowling kids Anne Arundel MD', category: 'Birthday Party Venues' },
  // Summer Camps & After School
  { query: 'summer camp kids Annapolis MD', category: 'Summer Camps & After School' },
  { query: 'after school program Severna Park MD', category: 'Summer Camps & After School' },
  { query: 'summer camp kids Crofton Glen Burnie MD', category: 'Summer Camps & After School' },
  // Pediatric Dentists & Doctors
  { query: 'pediatric dentist Annapolis MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatrician Severna Park Glen Burnie MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatric dentist Crofton Odenton MD', category: 'Pediatric Dentists & Doctors' },
  // Daycares & Preschools
  { query: 'daycare preschool Annapolis MD', category: 'Daycares & Preschools' },
  { query: 'preschool Severna Park MD', category: 'Daycares & Preschools' },
  { query: 'daycare Glen Burnie Crofton MD', category: 'Daycares & Preschools' },
  // Family-Friendly Restaurants
  { query: 'family friendly restaurant kids Annapolis MD', category: 'Family-Friendly Restaurants' },
  { query: 'kid friendly restaurant Severna Park MD', category: 'Family-Friendly Restaurants' },
  { query: 'family restaurant Glen Burnie MD', category: 'Family-Friendly Restaurants' },
  // Kids Haircuts & Clothing
  { query: 'kids haircut salon Annapolis MD', category: 'Kids Haircuts & Clothing' },
  { query: 'children clothing store Severna Park Annapolis MD', category: 'Kids Haircuts & Clothing' },
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
          const typeEl = document.querySelector('button[jsaction*="category"]');
          const bizType = typeEl ? typeEl.textContent.trim() : '';
          return { phone, website, address, description, photo, bizType };
        });

        // Hours
        const hoursBtn = await detailPage.$('button[data-item-id="oh"], div[aria-label*="hour" i], button[aria-label*="hour" i]');
        if (hoursBtn) { try { await hoursBtn.click(); await sleep(1500); } catch (e) {} }

        const hours = await detailPage.evaluate(() => {
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
          return rows.join('\n');
        }).catch(() => '');

        // Reviews
        const reviewsTab = await detailPage.$('button[aria-label="Reviews"]');
        if (reviewsTab) { try { await reviewsTab.click(); await sleep(2500); } catch (e) {} }

        const reviews = await detailPage.evaluate(() => {
          const snippets = [];
          const reviewEls = document.querySelectorAll('span.wiI7pd');
          reviewEls.forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 30 && text.length < 500) snippets.push(text);
          });
          return snippets.slice(0, 3).join('\n---\n');
        }).catch(() => '');

        // Services (About tab)
        const overviewTab = await detailPage.$('button[aria-label="Overview"]');
        if (overviewTab) { try { await overviewTab.click(); await sleep(1000); } catch (e) {} }
        const aboutTab = await detailPage.$('button[aria-label="About"]');
        if (aboutTab) { try { await aboutTab.click(); await sleep(2000); } catch (e) {} }

        const services = await detailPage.evaluate(() => {
          const items = [];
          document.querySelectorAll('div[role="region"] li span, div[class*="attr"] span').forEach(el => {
            const t = el.textContent.trim();
            if (t && t.length > 2 && t.length < 60 && !t.startsWith('No ')) items.push(t);
          });
          return [...new Set(items)].slice(0, 20).join(', ');
        }).catch(() => '');

        let description = basicInfo.description || '';
        if (basicInfo.bizType && !description.includes(basicInfo.bizType)) {
          description = basicInfo.bizType + (description ? '. ' + description : '');
        }

        results.push({
          name: biz.name,
          slug: slugify(biz.name),
          category,
          city: 'Baltimore',
          neighborhood: 'Anne Arundel County',
          address: basicInfo.address || biz.address,
          phone: basicInfo.phone,
          website: basicInfo.website,
          description: description.substring(0, 1000),
          image_url: basicInfo.photo || biz.imageUrl,
          rating: biz.rating,
          review_count: biz.reviewCount,
          services,
          hours,
          reviews,
          source: 'Google Maps'
        });

        console.log(`    + ${biz.name} (${biz.rating || 'N/A'}) [${services ? 'services' : ''}${hours ? ' hours' : ''}${reviews ? ' reviews' : ''}]`);
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
  console.log('=== Anne Arundel County Scraper ===\n');
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
