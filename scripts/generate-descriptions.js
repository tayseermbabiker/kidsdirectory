require('dotenv').config();
const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = 'Businesses';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchAllBusinesses() {
  const all = [];
  let offset = null;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    params.set('fields[]', 'name');
    params.append('fields[]', 'category');
    params.append('fields[]', 'city');
    params.append('fields[]', 'rating');
    params.append('fields[]', 'review_count');
    params.append('fields[]', 'description');
    params.append('fields[]', 'services');
    if (offset) params.set('offset', offset);

    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const rec of data.records || []) {
      all.push({ id: rec.id, ...rec.fields });
    }
    offset = data.offset || null;
  } while (offset);

  return all;
}

// --- TEMPLATE ENGINE ---

function generateDescription(biz) {
  const name = biz.name || 'This business';
  const city = biz.city || 'Plano';
  const cat = biz.category || '';
  const rating = biz.rating;
  const reviews = biz.review_count || 0;
  const services = biz.services ? biz.services.split(',').map(s => s.trim()).filter(Boolean) : [];

  // Rating phrase
  let ratingPhrase = '';
  if (rating >= 4.5 && reviews >= 20) ratingPhrase = `Highly rated by local families with ${rating} stars across ${reviews} reviews`;
  else if (rating >= 4.5 && reviews >= 5) ratingPhrase = `Rated ${rating} stars by ${reviews} reviewers`;
  else if (rating >= 4.0 && reviews >= 10) ratingPhrase = `Well-reviewed by the community with a ${rating}-star rating`;
  else if (rating) ratingPhrase = `Rated ${rating} stars on Google`;

  // Services phrase
  let servicesPhrase = '';
  if (services.length >= 3) {
    servicesPhrase = `Services include ${services.slice(0, 3).join(', ')}, and more`;
  } else if (services.length > 0) {
    servicesPhrase = `Services include ${services.join(' and ')}`;
  }

  // Category-specific templates
  const templates = {
    'Tutoring & Learning Centers': [
      `${name} is a tutoring and learning center serving students in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They offer structured academic programs for children of various ages and skill levels.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Programs typically cover core subjects like math, reading, and writing with personalized learning plans.'
    ],
    'Kids Activities & Classes': [
      `${name} offers kids activities and classes in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They provide structured programs designed to help children build skills and confidence.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Classes are typically organized by age group and skill level, with options for beginners and experienced students.'
    ],
    'Birthday Party Venues': [
      `${name} is a birthday party venue located in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They host kids birthday parties with packages that handle the setup and entertainment.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Party packages generally include activity time, a party room, and options for food and decorations.'
    ],
    'Summer Camps & After School': [
      `${name} provides summer camp and after-school programs in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They offer structured care and enrichment for school-age children.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Programs typically include a mix of academic support, physical activities, and creative enrichment.'
    ],
    'Pediatric Dentists & Doctors': [
      `${name} is a pediatric healthcare provider in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They specialize in children's health with a kid-friendly office environment.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Their practice is designed to make visits comfortable for young patients, from infants through adolescents.'
    ],
    'Daycares & Preschools': [
      `${name} is a daycare and early childhood education center in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They provide daily care and learning programs for young children.`,
      servicesPhrase ? `${servicesPhrase}.` : 'Programs typically include age-appropriate activities, structured routines, and early learning curricula.'
    ],
    'Family-Friendly Restaurants': [
      `${name} is a family-friendly restaurant in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They welcome families with a relaxed dining atmosphere.`,
      servicesPhrase ? `${servicesPhrase}.` : 'The restaurant offers a menu with options for both kids and adults in a comfortable setting.'
    ],
    'Kids Haircuts & Clothing': [
      `${name} is a kids haircut and clothing shop in ${city}, TX.`,
      ratingPhrase ? `${ratingPhrase}.` : `They specialize in services and products for children.`,
      servicesPhrase ? `${servicesPhrase}.` : 'They cater to young clients with a fun, stress-free experience designed for kids of all ages.'
    ]
  };

  const parts = templates[cat] || [
    `${name} is located in ${city}, TX.`,
    ratingPhrase ? `${ratingPhrase}.` : 'They serve local families in the Plano and Frisco area.',
    servicesPhrase ? `${servicesPhrase}.` : ''
  ];

  return parts.filter(Boolean).join(' ');
}

// Update in Airtable (batch of 10)
async function updateBatch(records) {
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ records })
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable update error: ${err}`);
  }
}

async function main() {
  console.log('Fetching businesses from Airtable...');
  const businesses = await fetchAllBusinesses();
  console.log(`Total businesses: ${businesses.length}`);

  const needDesc = businesses.filter(b => !b.description || b.description.trim().length < 20);
  console.log(`Need descriptions: ${needDesc.length}`);

  if (!needDesc.length) {
    console.log('All businesses already have descriptions.');
    return;
  }

  // Generate all descriptions
  const updates = needDesc.map(biz => ({
    id: biz.id,
    fields: { description: generateDescription(biz) }
  }));

  // Push in batches of 10
  let pushed = 0;
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    await updateBatch(batch);
    pushed += batch.length;
    console.log(`Updated ${pushed}/${updates.length}`);
    if (i + 10 < updates.length) await sleep(250);
  }

  console.log(`\nDone! ${pushed} descriptions generated and saved.`);
  console.log('Run "npm run export" to update businesses.json.');
}

main().catch(console.error);
