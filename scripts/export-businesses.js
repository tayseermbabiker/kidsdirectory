require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Businesses';
const SITE_URL = 'https://kidsdirectory.netlify.app';

// Upgrade Google Maps image URLs to higher resolution
function upgradeGoogleImage(url) {
  if (!url || !url.includes('googleusercontent.com')) return url;
  // Replace size params like =w408-h306-k-no or =w80-h92-p-k-no with =w800-h600-k-no
  return url.replace(/=[ws]\d+-h\d+[^&\s]*/, '=w800-h600-k-no');
}

async function exportBusinesses() {
  console.log('Exporting businesses from Airtable...');
  const records = [];
  let offset = null;

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    if (offset) params.set('offset', offset);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  const businesses = records.map(r => ({
    id: r.id,
    name: r.fields.name || '',
    slug: r.fields.slug || '',
    category: r.fields.category || '',
    city: r.fields.city || 'Plano',
    neighborhood: r.fields.neighborhood || '',
    address: r.fields.address || '',
    phone: r.fields.phone || '',
    website: r.fields.website || '',
    description: r.fields.description || '',
    image_url: upgradeGoogleImage(r.fields.image_url || ''),
    rating: r.fields.rating || null,
    review_count: r.fields.review_count || null,
    price_range: r.fields.price_range || '',
    featured: r.fields.featured || false,
    services: r.fields.services || '',
    hours: r.fields.hours || '',
    reviews: r.fields.reviews || '',
    source: r.fields.source || '',
    take: r.fields.take || '',
    price_note: r.fields.price_note || '',
    what_to_expect: r.fields.what_to_expect || '',
    good_fit: r.fields.good_fit || '',
    how_it_compares: r.fields.how_it_compares || '',
    business_type: r.fields.business_type || 'local',
    vote_count: r.fields.vote_count || 0,
    scraped_at: r.fields.scraped_at || ''
  }));

  const output = {
    success: true,
    businesses,
    count: businesses.length,
    exported_at: new Date().toISOString()
  };

  const publicDir = path.join(__dirname, '..', 'public');

  fs.writeFileSync(path.join(publicDir, 'businesses.json'), JSON.stringify(output));
  console.log(`Exported ${businesses.length} businesses to public/businesses.json`);

  // Generate sitemap.xml
  const today = new Date().toISOString().split('T')[0];
  const categories = [
    'tutoring-learning-centers',
    'kids-activities-classes',
    'birthday-party-venues',
    'summer-camps-after-school',
    'pediatric-dentists-doctors',
    'daycares-preschools',
    'family-friendly-restaurants',
    'kids-haircuts-clothing'
  ];

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
${['plano', 'frisco', 'baltimore'].map(city => categories.map(cat => `  <url>
    <loc>${SITE_URL}/${city}/${cat}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`).join('\n')).join('\n')}
${businesses.map(b => `  <url>
    <loc>${SITE_URL}/go/${b.id}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), sitemap);
  console.log(`Generated sitemap.xml with ${1 + categories.length * 3 + businesses.length} URLs`);
}

exportBusinesses().catch(console.error);
