require('dotenv').config();
const { slugify, sleep, pushToAirtable, launchBrowser } = require('./utils');

const SEARCHES = [
  // === PLANO & FRISCO, TX ===
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

  // === BALTIMORE AREA, MD ===
  // Tutoring & Learning Centers
  { query: 'tutoring center Columbia MD', category: 'Tutoring & Learning Centers' },
  { query: 'Kumon Mathnasium Towson MD', category: 'Tutoring & Learning Centers' },
  { query: 'learning center kids Catonsville MD', category: 'Tutoring & Learning Centers' },
  // Kids Activities & Classes
  { query: 'kids dance class Columbia MD', category: 'Kids Activities & Classes' },
  { query: 'kids swim lessons Towson MD', category: 'Kids Activities & Classes' },
  { query: 'kids martial arts gymnastics Severna Park MD', category: 'Kids Activities & Classes' },
  { query: 'music lessons for kids Columbia MD', category: 'Kids Activities & Classes' },
  // Birthday Party Venues
  { query: 'birthday party venue kids Columbia MD', category: 'Birthday Party Venues' },
  { query: 'kids party place Towson Catonsville MD', category: 'Birthday Party Venues' },
  // Summer Camps & After School
  { query: 'summer camp kids Columbia Howard County MD', category: 'Summer Camps & After School' },
  { query: 'after school program Towson MD', category: 'Summer Camps & After School' },
  // Pediatric Dentists & Doctors
  { query: 'pediatric dentist Columbia MD', category: 'Pediatric Dentists & Doctors' },
  { query: 'pediatrician Towson Catonsville MD', category: 'Pediatric Dentists & Doctors' },
  // Daycares & Preschools
  { query: 'daycare preschool Columbia MD', category: 'Daycares & Preschools' },
  { query: 'preschool Severna Park Catonsville MD', category: 'Daycares & Preschools' },
  // Family-Friendly Restaurants
  { query: 'family friendly restaurant kids Columbia MD', category: 'Family-Friendly Restaurants' },
  { query: 'kid friendly restaurant Towson MD', category: 'Family-Friendly Restaurants' },
  // Kids Haircuts & Clothing
  { query: 'kids haircut salon Columbia MD', category: 'Kids Haircuts & Clothing' },
  { query: 'children clothing store Towson MD', category: 'Kids Haircuts & Clothing' },
];

function extractCity(address, query) {
  const lower = (address || '').toLowerCase();
  const q = (query || '').toLowerCase();
  // Maryland → all grouped as "Baltimore"
  if (lower.includes('columbia') || lower.includes('ellicott city') || lower.includes('towson') ||
      lower.includes('lutherville') || lower.includes('timonium') || lower.includes('catonsville') ||
      lower.includes('severna park') || lower.includes('howard county') || lower.includes('baltimore')) {
    return 'Baltimore';
  }
  if (q.includes('columbia') || q.includes('towson') || q.includes('catonsville') || q.includes('severna park')) {
    return 'Baltimore';
  }
  // Texas cities
  if (lower.includes('frisco') || lower.includes('mckinney')) return 'Frisco';
  if (lower.includes('plano') || lower.includes('allen')) return 'Plano';
  return 'Plano';
}

function extractNeighborhood(address, query) {
  const lower = (address || '').toLowerCase();
  const q = (query || '').toLowerCase();
  if (lower.includes('columbia') || lower.includes('ellicott city') || q.includes('columbia')) return 'Columbia';
  if (lower.includes('towson') || lower.includes('lutherville') || lower.includes('timonium') || q.includes('towson')) return 'Towson';
  if (lower.includes('catonsville') || q.includes('catonsville')) return 'Catonsville';
  if (lower.includes('severna park') || q.includes('severna park')) return 'Severna Park';
  return '';
}

async function scrapeGoogleMaps(context, query, category) {
  const results = [];
  const page = await context.newPage();

  try {
    // Force English with hl=en
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

          // Match both English "reviews" and any numeric pattern
          const reviewMatch = ratingLabel.match(/(\d[\d,]*)\s*review/i) || ratingLabel.match(/([\d,]+)/g);
          let reviewCount = null;
          if (reviewMatch) {
            // Take the second number if present (first is rating), otherwise first
            const nums = ratingLabel.match(/[\d,]+/g);
            if (nums && nums.length >= 2) {
              reviewCount = parseInt(nums[1].replace(/,/g, ''));
            }
          }

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
        // Force English on detail page too
        const detailUrl = biz.href.includes('?') ? biz.href + '&hl=en' : biz.href + '?hl=en';
        await detailPage.goto(detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(3000);

        // --- BASIC INFO ---
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

          // Business type/category shown under name
          const typeEl = document.querySelector('button[jsaction*="category"]');
          const bizType = typeEl ? typeEl.textContent.trim() : '';

          return { phone, website, address, description, photo, bizType };
        });

        // --- HOURS: click to expand ---
        const hoursBtn = await detailPage.$('button[data-item-id="oh"], div[aria-label*="hour" i], button[aria-label*="hour" i]');
        if (hoursBtn) {
          try { await hoursBtn.click(); await sleep(1500); } catch (e) {}
        }

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
          if (rows.length) return rows.join('\n');
          const els = document.querySelectorAll('[aria-label]');
          for (const el of els) {
            const label = el.getAttribute('aria-label') || '';
            if (label.includes('Monday') && label.includes('Tuesday')) return label;
          }
          return '';
        }).catch(() => '');

        // --- ABOUT TAB: services, accessibility, highlights ---
        const aboutTab = await detailPage.$('button[aria-label="About"]');
        if (aboutTab) {
          try { await aboutTab.click(); await sleep(2000); } catch (e) {}
        }

        const aboutData = await detailPage.evaluate(() => {
          const services = [];
          const accessibility = [];
          const highlights = [];

          // All attribute sections
          const sections = document.querySelectorAll('div[role="region"]');
          sections.forEach(section => {
            const heading = section.querySelector('h2, h3, [role="heading"]');
            const headingText = heading ? heading.textContent.trim().toLowerCase() : '';

            const items = section.querySelectorAll('li span, div[class*="attr"] span');
            items.forEach(el => {
              const text = el.textContent.trim();
              if (!text || text.length < 3 || text.length > 80 || text.startsWith('No ')) return;

              if (headingText.includes('accessib')) {
                accessibility.push(text);
              } else if (headingText.includes('highlight') || headingText.includes('amenit') || headingText.includes('offering')) {
                highlights.push(text);
              } else {
                services.push(text);
              }
            });
          });

          // Also grab general attributes that aren't in sections
          const allAttrs = document.querySelectorAll('div[aria-label] ul li, div[class*="attr"] span');
          allAttrs.forEach(el => {
            const t = el.textContent.trim();
            if (t && t.length > 2 && t.length < 60 && !services.includes(t) && !t.startsWith('No ')) {
              services.push(t);
            }
          });

          return {
            services: [...new Set(services)].slice(0, 20).join(', '),
            accessibility: [...new Set(accessibility)].slice(0, 10).join(', '),
            highlights: [...new Set(highlights)].slice(0, 10).join(', '),
          };
        }).catch(() => ({ services: '', accessibility: '', highlights: '' }));

        // --- REVIEWS TAB: top review snippets ---
        const overviewTab = await detailPage.$('button[aria-label="Overview"]');
        if (overviewTab) {
          try { await overviewTab.click(); await sleep(1000); } catch (e) {}
        }

        const reviewsTab = await detailPage.$('button[aria-label="Reviews"]');
        if (reviewsTab) {
          try { await reviewsTab.click(); await sleep(2500); } catch (e) {}
        }

        const reviews = await detailPage.evaluate(() => {
          const snippets = [];
          const reviewEls = document.querySelectorAll('span.wiI7pd, div.MyEned span, div[data-review-id] span.wiI7pd');
          reviewEls.forEach(el => {
            const text = el.textContent.trim();
            if (text.length > 30 && text.length < 500) snippets.push(text);
          });
          return snippets.slice(0, 3).join('\n---\n');
        }).catch(() => '');

        // Build rich description
        let description = basicInfo.description || '';
        if (aboutData.highlights && !description.includes(aboutData.highlights)) {
          description = description ? description + '\n\n' + aboutData.highlights : aboutData.highlights;
        }
        if (aboutData.accessibility) {
          description = description ? description + '\n\nAccessibility: ' + aboutData.accessibility : 'Accessibility: ' + aboutData.accessibility;
        }
        if (basicInfo.bizType && !description.includes(basicInfo.bizType)) {
          description = basicInfo.bizType + (description ? '. ' + description : '');
        }

        const city = extractCity(basicInfo.address || biz.address, query);
        const neighborhood = extractNeighborhood(basicInfo.address || biz.address, query);

        results.push({
          name: biz.name,
          slug: slugify(biz.name),
          category,
          city,
          neighborhood,
          address: basicInfo.address || biz.address,
          phone: basicInfo.phone,
          website: basicInfo.website,
          description: description.substring(0, 1000),
          image_url: basicInfo.photo || biz.imageUrl,
          rating: biz.rating,
          review_count: biz.reviewCount,
          price_range: biz.priceRange,
          services: aboutData.services,
          hours,
          reviews,
          source: 'Google Maps'
        });

        console.log(`    + ${biz.name} (${biz.rating || 'N/A'}) [${aboutData.services ? 'services' : ''}${hours ? ' hours' : ''}${reviews ? ' reviews' : ''}]`);
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
  console.log('=== Kids Directory: Google Maps Scraper (EN) ===\n');
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
