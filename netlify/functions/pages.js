const fetch = require('node-fetch');

const SITE_URL = process.env.URL || 'https://kiddoscompass.com';

let cachedBusinesses = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadBusinesses() {
  if (cachedBusinesses && (Date.now() - cacheTime < CACHE_TTL)) return cachedBusinesses;
  const res = await fetch(`${SITE_URL}/businesses.json`);
  if (!res.ok) return [];
  const data = await res.json();
  cachedBusinesses = data.businesses || [];
  cacheTime = Date.now();
  return cachedBusinesses;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// --- Constants (mirrored from utils.js) ---
const CATEGORIES = [
  { name: 'Tutoring & Learning Centers', slug: 'tutoring-learning-centers' },
  { name: 'Kids Activities & Classes', slug: 'kids-activities-classes' },
  { name: 'Birthday Party Venues', slug: 'birthday-party-venues' },
  { name: 'Summer Camps & After School', slug: 'summer-camps-after-school' },
  { name: 'Pediatric Dentists & Doctors', slug: 'pediatric-dentists-doctors' },
  { name: 'Daycares & Preschools', slug: 'daycares-preschools' },
  { name: 'Family-Friendly Restaurants', slug: 'family-friendly-restaurants' },
  { name: 'Kids Haircuts & Clothing', slug: 'kids-haircuts-clothing' }
];

const CITIES = [
  { name: 'Plano', slug: 'plano', state: 'TX' },
  { name: 'Frisco', slug: 'frisco', state: 'TX' },
  { name: 'Baltimore', slug: 'baltimore', state: 'MD', neighborhoods: ['Howard County', 'Baltimore County', 'Anne Arundel County', 'Harford County'] }
];

const CAT_FALLBACK_IMGS = {
  'Tutoring & Learning Centers':  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75&auto=format&fit=crop',
  'Kids Activities & Classes':    'https://images.unsplash.com/photo-1549057736-889b732754a2?w=600&q=75&auto=format&fit=crop',
  'Birthday Party Venues':        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=75&auto=format&fit=crop',
  'Summer Camps & After School':  'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=600&q=75&auto=format&fit=crop',
  'Pediatric Dentists & Doctors': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=75&auto=format&fit=crop',
  'Daycares & Preschools':        'https://images.unsplash.com/photo-1539795845756-4fadad2905ec?w=600&q=75&auto=format&fit=crop',
  'Family-Friendly Restaurants':  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=75&auto=format&fit=crop',
  'Kids Haircuts & Clothing':     'https://images.unsplash.com/photo-1761931403759-c18a3647e82e?w=600&q=75&auto=format&fit=crop',
};

const CAT_HERO_IMGS = {
  'Tutoring & Learning Centers':  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1400&q=70&auto=format&fit=crop',
  'Kids Activities & Classes':    'https://images.unsplash.com/photo-1549057736-889b732754a2?w=1400&q=70&auto=format&fit=crop',
  'Birthday Party Venues':        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1400&q=70&auto=format&fit=crop',
  'Summer Camps & After School':  'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=1400&q=70&auto=format&fit=crop',
  'Pediatric Dentists & Doctors': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1400&q=70&auto=format&fit=crop',
  'Daycares & Preschools':        'https://images.unsplash.com/photo-1539795845756-4fadad2905ec?w=1400&q=70&auto=format&fit=crop',
  'Family-Friendly Restaurants':  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=70&auto=format&fit=crop',
  'Kids Haircuts & Clothing':     'https://images.unsplash.com/photo-1761931403759-c18a3647e82e?w=1400&q=70&auto=format&fit=crop',
};

const SEO_DESCRIPTIONS = {
  'Tutoring & Learning Centers': (loc) => `Find the best tutoring and learning centers in ${loc}. Compare top-rated academic programs, test prep, and local private tutors — ratings, reviews, and hours trusted by local parents.`,
  'Kids Activities & Classes': (loc) => `Explore fun kids' classes and activities in ${loc}. From sports and dance to art and coding, find the perfect hobby for your child with ratings and reviews.`,
  'Birthday Party Venues': (loc) => `Plan the perfect celebration with our guide to birthday party venues in ${loc}. Browse packages, themes, and top-rated local spots with parent reviews.`,
  'Summer Camps & After School': (loc) => `Discover top summer camps and after-school programs in ${loc}. Find STEM, sports, and arts programs with ratings and hours.`,
  'Pediatric Dentists & Doctors': (loc) => `Find trusted pediatric dentists and doctors in ${loc}. Browse top-rated healthcare providers specialized in caring for your kids.`,
  'Daycares & Preschools': (loc) => `Browse the best daycares and preschools in ${loc}. Compare local early childhood education options, Montessori, and more with parent reviews.`,
  'Family-Friendly Restaurants': (loc) => `Discover the best family-friendly restaurants in ${loc}. Find spots with kids' menus, play areas, and parent-reviewed dining experiences.`,
  'Kids Haircuts & Clothing': (loc) => `Find the best kids' haircuts and clothing stores in ${loc}. Explore trendy boutiques, salons for kids, and local shops with ratings.`
};

const SEO_PARAGRAPHS = {
  'Tutoring & Learning Centers': "Empower your child's academic journey by connecting with the premier tutoring and learning centers across Plano, Frisco, and Baltimore. Our comprehensive directory features everything from STEM-focused programs to specialized reading assistance and college prep. Whether you need a local private tutor or a structured learning environment, we provide the resources to help your student excel.",
  'Kids Activities & Classes': "Discover a world of enrichment with our curated list of kids' activities and classes in Plano, Frisco, and Baltimore. We help parents find the best local options for sports, arts, and educational hobbies that keep children active and engaged. From weekend workshops to seasonal leagues, finding your child's next passion has never been easier.",
  'Birthday Party Venues': "Make your child's next celebration unforgettable by exploring the best birthday party venues in Plano, Frisco, and Baltimore. Our directory showcases a variety of locations, ranging from high-energy adventure parks to creative art studios and private event spaces. Compare pricing, amenities, and reviews to find a venue that fits your budget and your child's birthday wish list.",
  'Summer Camps & After School': "Planning for school breaks or daily childcare is simple with our comprehensive list of summer camps and after-school programs. Serving Plano, Frisco, and Baltimore, we connect you with safe, enriching environments where your children can grow outside the classroom. Whether you need a full-day summer experience or reliable daily care, find the highest-rated local programs right here.",
  'Pediatric Dentists & Doctors': "Ensure your child receives the best care possible with our directory of pediatric dentists and doctors in Plano, Frisco, and Baltimore. We prioritize healthcare providers who specialize in making medical and dental visits a positive experience for children of all ages. From routine check-ups and vaccinations to specialized dental care, find the most recommended local experts for your family.",
  'Daycares & Preschools': "Finding the right early childhood education is a major milestone, and we are here to help you navigate daycares and preschools in Plano, Frisco, and Baltimore. Our listings include various educational philosophies, from Montessori and Reggio Emilia to traditional play-based and faith-based programs. Explore top-rated facilities that offer a safe, nurturing, and educational environment.",
  'Family-Friendly Restaurants': "Dining out with the whole family should be stress-free and delicious. Our guide to family-friendly restaurants in Plano, Frisco, and Baltimore highlights eateries that offer more than just a kids' menu. From restaurants with fenced-in patios and playgrounds to spots with interactive table entertainment, find the perfect place for your next family meal.",
  'Kids Haircuts & Clothing': "Keep your little ones looking their best with our directory of kids' haircuts and clothing in Plano, Frisco, and Baltimore. We feature specialized salons that know how to handle wiggly clients and local boutiques that carry everything from everyday playwear to special occasion outfits. Whether it's time for a back-to-school trim or a new wardrobe, find the top-rated local shops right here."
};

const FAQ_DATA = {
  'Tutoring & Learning Centers': [
    { q: 'What are the best tutoring centers for kids in Plano TX?', a: 'Top-rated tutoring centers in Plano include Kumon, Mathnasium, Sylvan Learning, and C2 Education. Browse our full list with ratings, reviews, and hours to find the best fit for your child.' },
    { q: 'Kumon vs Mathnasium — which is better for my child?', a: 'Kumon focuses on self-paced worksheets building foundational math and reading skills. Mathnasium uses customized learning plans with in-center instruction. Kumon is better for building discipline; Mathnasium is better for kids who need more hands-on help.' },
    { q: 'How much does tutoring cost in Plano and Frisco?', a: 'Rates typically range from $40 to $80 per hour depending on the subject complexity and whether it is a private tutor or a learning center. Monthly center programs like Kumon run $150-$300/month.' },
    { q: 'What age should kids start tutoring?', a: 'Most learning centers accept kids as young as 3-4 for early reading and math programs. The best time to start depends on your child — if they are struggling or need enrichment, earlier is better.' }
  ],
  'Kids Activities & Classes': [
    { q: 'What are the best swim lessons for toddlers in Plano TX?', a: 'Popular swim schools in Plano include Emler Swim School, Goldfish Swim School, and SafeSplash. Most accept kids from 4 months old. Look for small class sizes and warm water pools.' },
    { q: 'What age should kids start martial arts?', a: 'Most martial arts studios offer classes for kids as young as 3-4 years old. Starting early helps with discipline, coordination, and confidence. Many studios offer a free trial class.' },
    { q: 'Are there kids coding or robotics classes near Frisco TX?', a: 'Yes! Frisco has several STEM-focused programs including Code Ninjas, Snapology, and various robotics clubs. These are great for kids interested in technology and engineering.' }
  ],
  'Birthday Party Venues': [
    { q: 'What are the best birthday party places for kids in Plano TX?', a: 'Popular party venues in Plano include trampoline parks, bowling alleys, pottery studios, and indoor play centers. Many offer all-inclusive party packages starting around $200-$400.' },
    { q: 'How much does a kids birthday party venue cost?', a: 'Party packages typically range from $200-$500 depending on the venue, number of kids, and add-ons. Trampoline parks and play centers are usually the most affordable options.' }
  ],
  'Summer Camps & After School': [
    { q: 'What are the best summer camps in Howard County MD?', a: 'Howard County offers excellent summer camps through Recreation & Parks, the YMCA, and private providers. Options include STEM camps, sports camps, art camps, and nature camps in Columbia and Ellicott City.' },
    { q: 'How much does summer camp cost in Plano TX?', a: 'Summer camp costs in Plano vary: city-run camps start around $150-$250/week, while specialty camps (STEM, sports, arts) can run $300-$500/week. Many offer early bird discounts.' }
  ],
  'Pediatric Dentists & Doctors': [
    { q: 'When should my child first see a dentist?', a: 'The American Academy of Pediatric Dentistry recommends a first dental visit by age 1 or within 6 months of the first tooth. Early visits help prevent cavities and build comfort with dental care.' },
    { q: 'Pediatric dentist vs family dentist — which is better for kids?', a: 'Pediatric dentists complete 2-3 extra years of training specifically for children. Their offices are kid-friendly with smaller equipment. For anxious kids or those under 5, a pediatric dentist is usually the better choice.' }
  ],
  'Daycares & Preschools': [
    { q: 'How do I choose the right daycare for my toddler?', a: 'Key factors: staff-to-child ratio (ideally 1:3 for infants, 1:4 for toddlers), licensing and accreditation, cleanliness, curriculum approach, location, and hours. Always visit in person and trust your instincts.' },
    { q: 'Montessori vs traditional preschool — what is the difference?', a: 'Montessori emphasizes self-directed learning, mixed-age classrooms, and hands-on materials. Traditional preschool is more teacher-led with structured activities and same-age groups. Neither is universally better — it depends on your child.' }
  ],
  'Family-Friendly Restaurants': [
    { q: 'What are the best kid-friendly restaurants in Plano TX?', a: 'Plano has many family-friendly options ranging from casual chains to local favorites. Look for restaurants with kids menus, high chairs, outdoor seating, and play areas.' },
    { q: 'Are there restaurants with play areas for kids near me?', a: 'Some restaurants in our listings feature indoor or outdoor play areas. Filter by your city and check individual listings for amenities and parent tips.' }
  ],
  'Kids Haircuts & Clothing': [
    { q: 'Where should I take my toddler for their first haircut?', a: 'Kids hair salons are designed for first haircuts — they have fun chairs, cartoons, and patient stylists. They are much better than regular barbershops for nervous toddlers. Check our listings for kids salons near you.' },
    { q: 'Kids salon vs regular barbershop — which is better?', a: 'Kids salons specialize in children with entertainment, kid-sized chairs, and experience with wiggly toddlers. Regular barbershops are fine for older kids (6+) who can sit still. For first haircuts, always go kids salon.' }
  ]
};

const CAT_COLORS = ['teal', 'coral', 'golden', 'purple', 'sky', 'teal', 'coral', 'golden'];

const CAT_SVGS = {
  'Tutoring & Learning Centers': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
  'Kids Activities & Classes': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v7"/><path d="m8.5 16 3.5-2 3.5 2"/><path d="M5 20h14"/><path d="m7 9 5 3 5-3"/></svg>',
  'Birthday Party Venues': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 2-2 4-2 4h4s-2-2-2-4z"/><path d="M6 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><line x1="12" y1="8" x2="12" y2="22"/><line x1="4" y1="15" x2="20" y2="15"/></svg>',
  'Summer Camps & After School': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
  'Pediatric Dentists & Doctors': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
  'Daycares & Preschools': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
  'Family-Friendly Restaurants': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>',
  'Kids Haircuts & Clothing': '<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>'
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function categoryFromSlug(slug) {
  return CATEGORIES.find(c => c.slug === slug);
}

function cityFromSlug(slug) {
  return CITIES.find(c => c.slug === slug);
}

function getState(city) {
  const c = CITIES.find(ct => ct.name.toLowerCase() === (city || '').toLowerCase() || ct.slug === (city || '').toLowerCase());
  return c ? c.state : 'TX';
}

function renderStars(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.3 ? 1 : 0;
  return '<span class="stars">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(full) +
    (half ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#E8B872" opacity="0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' : '') +
    '</span>';
}

function getSeoTitle(catName, cityName, city) {
  const stateAbbr = city ? city.state : '';
  const loc = cityName === 'All Cities' ? 'Plano, Frisco & Baltimore' : `${cityName}${stateAbbr ? ', ' + stateAbbr : ''}`;
  const map = {
    'Tutoring & Learning Centers': `Best Tutoring Centers for Kids in ${loc}`,
    'Kids Activities & Classes': `Kids Activities & Classes in ${loc}`,
    'Birthday Party Venues': `Best Birthday Party Venues for Kids in ${loc}`,
    'Summer Camps & After School': `Summer Camps & After School Programs in ${loc}`,
    'Pediatric Dentists & Doctors': `Best Pediatric Dentists & Doctors in ${loc}`,
    'Daycares & Preschools': `Best Daycares & Preschools in ${loc}`,
    'Family-Friendly Restaurants': `Family-Friendly Restaurants in ${loc}`,
    'Kids Haircuts & Clothing': `Kids Haircuts & Clothing Stores in ${loc}`
  };
  return map[catName] || `${catName} in ${loc}`;
}

// --- Render a single business card HTML ---
function renderBizCard(biz) {
  const isMapImg = biz.image_url && biz.image_url.includes('maps.google.com');
  const imgSrc = (!biz.image_url || isMapImg) ? (CAT_FALLBACK_IMGS[biz.category] || '') : biz.image_url;
  let desc = '';
  if (biz.description && biz.description.length > 25) {
    const d = biz.description.trim();
    if (!/\d{3,}/.test(d) && d.toLowerCase() !== biz.name.toLowerCase() && d.split(' ').length >= 4) {
      desc = d.substring(0, 90) + (d.length > 90 ? '...' : '');
    }
  }
  const ratingBadge = biz.rating >= 4.8 ? '<span class="biz-badge biz-badge--top">Top Rated</span>' : '';
  const favBadge = biz.vote_count >= 3 ? '<span class="biz-badge biz-badge--fav">Parent Favorite</span>' : '';
  const cityObj = CITIES.find(c => c.slug === slugify(biz.city));
  const stateAbbr = cityObj ? cityObj.state : getState(biz.city);

  return `
    <a href="/go/${biz.id}" class="biz-card">
      <div class="biz-card-img-wrap">
        <img class="biz-card-img" src="${escHtml(imgSrc)}" alt="${escHtml(biz.name)}" loading="lazy" onerror="this.onerror=null;this.src='${escHtml(CAT_FALLBACK_IMGS[biz.category] || '')}'">
        ${favBadge || ratingBadge}
        <div class="biz-card-cat-pill">${escHtml(biz.category)}</div>
      </div>
      <div class="biz-card-body">
        <div class="biz-card-name">${escHtml(biz.name)}</div>
        ${desc ? `<p class="biz-card-desc">${escHtml(desc)}</p>` : ''}
        <div class="biz-card-meta">
          ${biz.rating ? `<div class="biz-card-rating">${renderStars(biz.rating)}<span class="biz-rating-num">${biz.rating}</span>${biz.review_count ? `<span class="biz-review-ct">(${biz.review_count.toLocaleString()})</span>` : ''}</div>` : ''}
          <span class="biz-card-city">${escHtml(biz.city)}, ${stateAbbr}</span>
          ${biz.vote_count ? `<span class="biz-card-votes">${biz.vote_count} rec.</span>` : ''}
        </div>
      </div>
    </a>`;
}

// --- Shared HTML shell ---
function htmlShell({ title, metaDesc, canonical, ogImage, bodyContent, jsonLdScripts }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-PNP99V5QVF"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-PNP99V5QVF');
  </script>
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(metaDesc.substring(0, 160))}">
  <link rel="canonical" href="${canonical}">
  <meta name="google-site-verification" content="IbUt71eLwWLF19TF9Av1E2ptVsgvC2PjmO0pDt6u32Q" />
  <meta name="p:domain_verify" content="43b6c00437cdfe63d2f2ab5466adc0bd"/>
  <meta property="og:title" content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(metaDesc.substring(0, 200))}">
  <meta property="og:url" content="${canonical}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="KiddosCompass">
  ${ogImage ? `<meta property="og:image" content="${escHtml(ogImage)}">` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/css/styles.css">
  ${(jsonLdScripts || []).map(s => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n  ')}
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="logo">
        <span class="logo-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><polygon points="12,2 14.5,9 12,7 9.5,9"/><line x1="12" y1="2" x2="12" y2="7"/></svg></span>
        KiddosCompass
      </a>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Menu"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
      <div class="nav-links" id="nav-links">
        <a href="/plano">Plano</a>
        <a href="/frisco">Frisco</a>
        <a href="/baltimore">Baltimore</a>
        <a href="/faq">FAQ</a>
        <a href="/saved" class="nav-saved"><svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="0"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>Saved</a>
        <a href="/#subscribe" class="nav-signup">Sign Up</a>
      </div>
    </div>
  </nav>

  <div id="app">
    ${bodyContent}
  </div>

  <footer class="footer">
    <div class="footer-inner">
      <div class="footer-links">
        <a href="/">Home</a>
        <a href="/plano">Plano</a>
        <a href="/frisco">Frisco</a>
        <a href="/baltimore">Baltimore</a>
        <a href="/faq">FAQ</a>
        <a href="/saved">Saved Places</a>
      </div>
      <div class="footer-legal">
        <a href="/privacy">Privacy Policy</a>
        <a href="/terms">Terms of Service</a>
        <a href="/about">About</a>
      </div>
      <p>KiddosCompass &mdash; Plano &amp; Frisco, TX | Columbia &amp; Towson, MD</p>
    </div>
  </footer>

  <script src="/js/utils.js"></script>
  <script src="/js/app.js"></script>
</body>
</html>`;
}

// --- CATEGORY PAGE ---
function renderCategoryPageHTML(businesses, citySlug, catSlug) {
  const cat = categoryFromSlug(catSlug);
  if (!cat) return null;
  const catName = cat.name;
  const isAllCities = citySlug === 'all';
  const city = isAllCities ? null : cityFromSlug(citySlug);
  const cityName = isAllCities ? 'All Cities' : (city ? city.name : citySlug);
  const breadcrumbCity = isAllCities ? 'All Cities' : cityName;
  const stateAbbr = city ? city.state : '';
  const loc = isAllCities ? 'Plano, Frisco & Baltimore' : `${cityName}${stateAbbr ? ', ' + stateAbbr : ''}`;

  // Filter and sort businesses
  let filtered = businesses.filter(b => b.category === catName);
  if (!isAllCities) {
    filtered = filtered.filter(b => b.city.toLowerCase() === citySlug || slugify(b.city) === citySlug);
  }
  filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const seoTitle = getSeoTitle(catName, cityName, city);
  const title = `${seoTitle} | KiddosCompass`;
  const metaDesc = SEO_DESCRIPTIONS[catName] ? SEO_DESCRIPTIONS[catName](loc) : `Find the best ${catName.toLowerCase()} in ${loc} with ratings, reviews, and hours.`;
  const canonical = `${SITE_URL}/${citySlug}/${catSlug}`;
  const heroImg = CAT_HERO_IMGS[catName] || '';

  // JSON-LD: ItemList
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": seoTitle,
    "description": metaDesc,
    "url": canonical,
    "numberOfItems": filtered.length,
    "itemListElement": filtered.slice(0, 30).map((biz, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": biz.name,
      "url": `${SITE_URL}/go/${biz.id}`
    }))
  };

  // JSON-LD: FAQPage
  const faqs = FAQ_DATA[catName];
  const jsonLdScripts = [itemListJsonLd];
  if (faqs && faqs.length) {
    jsonLdScripts.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": faqs.map(f => ({
        "@type": "Question",
        "name": f.q,
        "acceptedAnswer": { "@type": "Answer", "text": f.a }
      }))
    });
  }

  // Build listing cards HTML
  const cardsHtml = filtered.length
    ? filtered.map(renderBizCard).join('')
    : '<div class="empty-state"><h3>No listings found</h3><p>Try a different city or category.</p></div>';

  // FAQ section HTML
  const faqHtml = faqs && faqs.length ? `
    <div class="section" style="padding-top:0;">
      <h2 style="font-family:'Poppins',sans-serif;font-size:1.15rem;font-weight:600;margin-bottom:14px;padding-bottom:6px;border-bottom:1px solid #E4E4E7;">Frequently Asked Questions</h2>
      ${faqs.map(f => `
      <details style="margin-bottom:12px;padding:12px 16px;background:#fff;border:1px solid #E4E4E7;border-radius:8px;">
        <summary style="font-weight:500;font-size:0.9rem;cursor:pointer;color:#2E2E2E;">${escHtml(f.q)}</summary>
        <p style="margin-top:8px;font-size:0.85rem;color:#6A6A6A;line-height:1.7;">${escHtml(f.a)}</p>
      </details>`).join('')}
    </div>` : '';

  const bodyContent = `
    ${heroImg ? `
    <div class="cat-hero">
      <div class="cat-hero-bg" style="background-image:url('${heroImg}')"></div>
      <div class="cat-hero-content">
        <div class="breadcrumb breadcrumb--light"><a href="/">Home</a><span>/</span><a href="/${citySlug}">${breadcrumbCity}</a><span>/</span>${escHtml(catName)}</div>
        <h1>${escHtml(seoTitle)}</h1>
        <p>${filtered.length} listings in ${escHtml(cityName)}</p>
      </div>
    </div>` : `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / <a href="/${citySlug}">${breadcrumbCity}</a> / ${escHtml(catName)}</div>
        <h1>${escHtml(seoTitle)}</h1>
        <p>${filtered.length} listings in ${escHtml(cityName)}</p>
      </div>
    </div>`}
    <div class="section">
      <div class="biz-grid">
        ${cardsHtml}
      </div>
    </div>
    ${SEO_PARAGRAPHS[catName] ? `
    <div class="section" style="padding-top:0;">
      <p style="font-size:0.85rem;color:#6A6A6A;line-height:1.7;max-width:680px;">${SEO_PARAGRAPHS[catName]}</p>
    </div>` : ''}
    ${faqHtml}`;

  return htmlShell({ title, metaDesc, canonical, ogImage: heroImg, bodyContent, jsonLdScripts });
}

// --- CITY LANDING PAGE ---
function renderCityPageHTML(businesses, citySlug) {
  const city = cityFromSlug(citySlug);
  if (!city) return null;
  const cityName = city.name;
  const stateAbbr = city.state;
  const neighborhoods = city.neighborhoods || null;

  const cityBiz = businesses.filter(b =>
    b.city.toLowerCase() === citySlug || slugify(b.city) === citySlug
  );

  const title = `Best Kids Services in ${cityName}, ${stateAbbr} — Tutoring, Activities, Camps & More | KiddosCompass`;
  const metaDesc = `Find the best kids services in ${cityName}, ${stateAbbr}. Browse ${cityBiz.length}+ listings for tutoring, activities, birthday parties, summer camps, daycares, dentists, restaurants, and more — trusted by local parents.`;
  const canonical = `${SITE_URL}/${citySlug}`;

  // JSON-LD
  const jsonLdScripts = [{
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `Kids Services in ${cityName}, ${stateAbbr}`,
    "description": metaDesc,
    "url": canonical,
    "about": {
      "@type": "City",
      "name": cityName,
      "containedInPlace": { "@type": "State", "name": stateAbbr }
    }
  }];

  let sectionsHtml;
  if (neighborhoods) {
    const areaCount = neighborhoods.filter(n => cityBiz.some(b => b.neighborhood === n)).length || neighborhoods.length;
    sectionsHtml = `
      <div class="page-header">
        <div class="page-header-inner">
          <div class="breadcrumb"><a href="/">Home</a> / ${escHtml(cityName)}</div>
          <h1>Kids Services in ${escHtml(cityName)}, ${stateAbbr}</h1>
          <p>${cityBiz.length} listings across ${areaCount} areas</p>
        </div>
      </div>
      ${neighborhoods.map(hood => {
        const hoodBiz = cityBiz.filter(b => b.neighborhood === hood);
        return `
      <div class="section">
        <div class="section-header">
          <h2>${escHtml(hood)}</h2>
          <span class="section-count">${hoodBiz.length} listings</span>
        </div>
        <div class="cat-grid">
          ${CATEGORIES.map((c, i) => {
            const count = hoodBiz.filter(b => b.category === c.name).length;
            const color = CAT_COLORS[i % CAT_COLORS.length];
            const icon = CAT_SVGS[c.name] || '';
            return `
          <a href="/${citySlug}/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${icon}</div>
            <div class="cat-card-text">
              <h3>${escHtml(c.name)}</h3>
              <p>${count} listings</p>
            </div>
          </a>`;
          }).join('')}
        </div>
      </div>`;
      }).join('')}`;
  } else {
    sectionsHtml = `
      <div class="page-header">
        <div class="page-header-inner">
          <div class="breadcrumb"><a href="/">Home</a> / ${escHtml(cityName)}</div>
          <h1>Kids Services in ${escHtml(cityName)}, ${stateAbbr}</h1>
          <p>${cityBiz.length} listings across all categories</p>
        </div>
      </div>
      <div class="section">
        <div class="cat-grid">
          ${CATEGORIES.map((c, i) => {
            const count = cityBiz.filter(b => b.category === c.name).length;
            const color = CAT_COLORS[i % CAT_COLORS.length];
            const icon = CAT_SVGS[c.name] || '';
            return `
          <a href="/${citySlug}/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${icon}</div>
            <div class="cat-card-text">
              <h3>${escHtml(c.name)}</h3>
              <p>${count} listings</p>
            </div>
          </a>`;
          }).join('')}
        </div>
      </div>`;
  }

  return htmlShell({ title, metaDesc, canonical, bodyContent: sectionsHtml, jsonLdScripts });
}

// --- HANDLER ---
exports.handler = async (event) => {
  const path = event.path.replace(/\/$/, '') || '/';

  // Match /:city or /:city/:category
  const validCities = CITIES.map(c => c.slug).join('|');
  const match = path.match(new RegExp(`^\\/(${validCities}|all)(?:\\/([a-z0-9-]+))?$`));

  if (!match) {
    return { statusCode: 404, body: 'Not found' };
  }

  const citySlug = match[1];
  const catSlug = match[2];

  try {
    const businesses = await loadBusinesses();

    let html;
    if (catSlug) {
      html = renderCategoryPageHTML(businesses, citySlug, catSlug);
    } else {
      if (citySlug === 'all') {
        return { statusCode: 302, headers: { Location: '/' } };
      }
      html = renderCityPageHTML(businesses, citySlug);
    }

    if (!html) {
      return { statusCode: 404, body: 'Page not found' };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=86400'
      },
      body: html
    };
  } catch (err) {
    console.error('pages.js error:', err);
    return { statusCode: 500, body: 'Internal server error' };
  }
};
