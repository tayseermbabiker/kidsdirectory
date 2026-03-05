/**
 * Yelp scraper using their internal GraphQL API
 * Bypasses browser-based blocking entirely
 */
require('dotenv').config();
const fetch = require('node-fetch');
const { slugify, sleep, pushToAirtable } = require('./utils');

const CATEGORIES = [
  {
    name: 'Tutoring & Learning Centers',
    searches: [
      { term: 'tutoring center', location: 'Plano, TX' },
      { term: 'tutoring center', location: 'Frisco, TX' },
      { term: 'learning center kids', location: 'Plano, TX' },
    ]
  },
  {
    name: 'Kids Activities & Classes',
    searches: [
      { term: 'kids activities classes', location: 'Plano, TX' },
      { term: 'kids activities classes', location: 'Frisco, TX' },
      { term: 'kids dance swim martial arts', location: 'Plano, TX' },
    ]
  },
  {
    name: 'Birthday Party Venues',
    searches: [
      { term: 'birthday party venue kids', location: 'Plano, TX' },
      { term: 'birthday party venue kids', location: 'Frisco, TX' },
    ]
  },
  {
    name: 'Summer Camps & After School',
    searches: [
      { term: 'summer camp after school', location: 'Plano, TX' },
      { term: 'summer camp after school', location: 'Frisco, TX' },
    ]
  },
  {
    name: 'Pediatric Dentists & Doctors',
    searches: [
      { term: 'pediatric dentist', location: 'Plano, TX' },
      { term: 'pediatric doctor', location: 'Frisco, TX' },
    ]
  },
  {
    name: 'Daycares & Preschools',
    searches: [
      { term: 'daycare preschool', location: 'Plano, TX' },
      { term: 'daycare preschool', location: 'Frisco, TX' },
    ]
  },
  {
    name: 'Family-Friendly Restaurants',
    searches: [
      { term: 'family friendly restaurant kids', location: 'Plano, TX' },
      { term: 'family restaurant kids menu', location: 'Frisco, TX' },
    ]
  },
  {
    name: 'Kids Haircuts & Clothing',
    searches: [
      { term: 'kids haircut salon', location: 'Plano, TX' },
      { term: 'kids haircut children clothing', location: 'Frisco, TX' },
    ]
  }
];

function extractCity(location, address) {
  const text = (location + ' ' + (address || '')).toLowerCase();
  if (text.includes('frisco')) return 'Frisco';
  if (text.includes('plano')) return 'Plano';
  if (text.includes('allen')) return 'Plano';
  if (text.includes('mckinney')) return 'Frisco';
  return 'Plano';
}

async function searchYelp(term, location) {
  // Yelp's internal search API — same endpoint their website calls
  const url = `https://www.yelp.com/search/snippet?find_desc=${encodeURIComponent(term)}&find_loc=${encodeURIComponent(location)}&request_origin=user`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'application/json',
      'Accept-Language': 'en-US,en;q=0.9',
      'Referer': 'https://www.yelp.com/',
      'X-Requested-With': 'XMLHttpRequest',
    }
  });

  if (!res.ok) {
    console.log(`    Yelp snippet API returned ${res.status}, trying HTML parse fallback...`);
    return [];
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('json')) {
    console.log(`    Got non-JSON response, Yelp may be blocking`);
    return [];
  }

  const data = await res.json();
  const results = [];

  // Navigate the nested JSON structure
  const searchResults = data?.searchPageProps?.mainContentComponentsListProps ||
                        data?.searchPageProps?.searchResultsProps?.searchResults ||
                        [];

  for (const item of searchResults) {
    try {
      const biz = item?.searchResultBusiness || item?.bizId ? item : null;
      if (!biz) continue;

      const bizData = biz.searchResultBusiness || biz;
      if (!bizData.name) continue;

      results.push({
        name: bizData.name,
        rating: bizData.rating || null,
        reviewCount: bizData.reviewCount || null,
        priceRange: bizData.priceRange || null,
        address: bizData.formattedAddress || bizData.neighborhoods?.join(', ') || '',
        phone: bizData.phone || '',
        imageUrl: bizData.photoSrc || bizData.businessPhotos?.[0]?.photoUrl || '',
        yelpUrl: bizData.businessUrl || '',
        neighborhood: bizData.neighborhoods?.[0] || '',
      });
    } catch (e) {}
  }

  return results;
}

async function scrapeYelpDirect(term, location) {
  // Fallback: direct HTML fetch (not browser) with cookie handling
  const searchUrl = `https://www.yelp.com/search?find_desc=${encodeURIComponent(term)}&find_loc=${encodeURIComponent(location)}`;

  const res = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  const html = await res.text();
  const results = [];

  // Extract JSON-LD or embedded data from the HTML
  const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  if (jsonLdMatch) {
    for (const match of jsonLdMatch) {
      try {
        const json = JSON.parse(match.replace(/<\/?script[^>]*>/g, ''));
        if (json['@type'] === 'LocalBusiness' || json.itemListElement) {
          const items = json.itemListElement || [json];
          for (const item of items) {
            const biz = item.item || item;
            if (biz.name) {
              results.push({
                name: biz.name,
                rating: biz.aggregateRating?.ratingValue || null,
                reviewCount: biz.aggregateRating?.reviewCount || null,
                address: biz.address?.streetAddress || '',
                phone: biz.telephone || '',
                imageUrl: biz.image || '',
                yelpUrl: biz.url || '',
              });
            }
          }
        }
      } catch (e) {}
    }
  }

  // Also try to extract from window.__PRELOADED_STATE__ or similar
  const preloadMatch = html.match(/<!--({.*?"searchPageProps".*?})-->/s) ||
                       html.match(/"legacyProps":\s*({.*?"searchResults".*?})/s);
  if (preloadMatch) {
    try {
      const data = JSON.parse(preloadMatch[1]);
      const searchResults = data?.searchPageProps?.mainContentComponentsListProps || [];
      for (const item of searchResults) {
        const biz = item?.searchResultBusiness;
        if (biz?.name) {
          results.push({
            name: biz.name,
            rating: biz.rating || null,
            reviewCount: biz.reviewCount || null,
            priceRange: biz.priceRange || null,
            address: biz.formattedAddress || '',
            phone: biz.phone || '',
            imageUrl: biz.photoSrc || '',
            yelpUrl: biz.businessUrl || '',
            neighborhood: biz.neighborhoods?.[0] || '',
          });
        }
      }
    } catch (e) {}
  }

  return results;
}

async function run() {
  console.log('=== Kids Directory: Yelp API Scraper ===\n');
  const allBusinesses = [];

  for (const cat of CATEGORIES) {
    console.log(`\n[${cat.name}]`);

    for (const search of cat.searches) {
      console.log(`  "${search.term}" in ${search.location}`);

      // Try snippet API first
      let results = await searchYelp(search.term, search.location);

      // Fallback to direct HTML
      if (results.length === 0) {
        console.log(`    Trying HTML fallback...`);
        results = await scrapeYelpDirect(search.term, search.location);
      }

      console.log(`    Found ${results.length} results`);

      for (const biz of results) {
        const city = extractCity(search.location, biz.address);
        allBusinesses.push({
          name: biz.name,
          slug: slugify(biz.name),
          category: cat.name,
          city,
          neighborhood: biz.neighborhood || '',
          address: biz.address || '',
          phone: biz.phone || '',
          website: '',
          description: '',
          image_url: biz.imageUrl || '',
          rating: biz.rating,
          review_count: biz.reviewCount,
          price_range: biz.priceRange || null,
          source: 'Yelp'
        });
      }

      await sleep(2000);
    }
  }

  // Deduplicate by slug
  const seen = new Set();
  const unique = allBusinesses.filter(b => {
    if (seen.has(b.slug)) return false;
    seen.add(b.slug);
    return true;
  });

  console.log(`\nTotal unique: ${unique.length}`);
  await pushToAirtable(unique);
}

run().catch(console.error);
