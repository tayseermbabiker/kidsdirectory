const fetch = require('node-fetch');

const SITE_URL = process.env.URL || 'https://kidcompass.netlify.app';

let cachedBusinesses = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

async function loadBusinesses() {
  if (cachedBusinesses && (Date.now() - cacheTime < CACHE_TTL)) {
    return cachedBusinesses;
  }
  const res = await fetch(`${SITE_URL}/businesses.json`);
  if (!res.ok) return null;
  const data = await res.json();
  cachedBusinesses = data.businesses || [];
  cacheTime = Date.now();
  return cachedBusinesses;
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function mapsUrl(address, name, city) {
  const q = cleanAddress(address) || `${name}, ${city || 'Plano'}, TX`;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
}

function cleanAddress(raw) {
  if (!raw) return '';
  // Extract just the street address part — strip rating, phone, status, business name junk
  // Look for pattern like "1234 Street Name" up to a reasonable end
  const match = raw.match(/(\d+\s+[\w\s]+(?:st|ave|blvd|rd|dr|ln|way|pl|pkwy|hwy|ct|cir|trl)[\w\s,#]*(?:suite|ste|bldg|unit|#)?\s*\d*)/i);
  if (match) return match[1].trim().replace(/,\s*$/, '');
  // If no pattern, check if it's short enough to be a real address
  if (raw.length < 80 && !raw.match(/\d\.\d|reviews?|closed|open/i)) return raw;
  return '';
}

function getCatSlug(category) {
  const map = {
    'Tutoring & Learning Centers': 'tutoring-learning-centers',
    'Kids Activities & Classes': 'kids-activities-classes',
    'Birthday Party Venues': 'birthday-party-venues',
    'Summer Camps & After School': 'summer-camps-after-school',
    'Pediatric Dentists & Doctors': 'pediatric-dentists-doctors',
    'Daycares & Preschools': 'daycares-preschools',
    'Family-Friendly Restaurants': 'family-friendly-restaurants',
    'Kids Haircuts & Clothing': 'kids-haircuts-clothing'
  };
  return map[category] || '';
}

// --- CONFIDENCE BADGE ---
function getConfidenceBadge(biz, allInCategory) {
  if (!biz.rating) return '';
  const rated = allInCategory.filter(b => b.rating);
  if (rated.length < 3) return '';
  const sorted = rated.sort((a, b) => {
    const scoreA = (a.rating || 0) * Math.log10((a.review_count || 1) + 1);
    const scoreB = (b.rating || 0) * Math.log10((b.review_count || 1) + 1);
    return scoreB - scoreA;
  });
  const rank = sorted.findIndex(b => b.id === biz.id);
  const pct = rank / sorted.length;

  if (pct <= 0.1 && biz.rating >= 4.5 && (biz.review_count || 0) >= 20) {
    return { label: 'Top Rated', desc: `Top 10% in ${biz.city} — based on ${biz.review_count} reviews`, color: '#D4A853', icon: 'trophy' };
  }
  if (pct <= 0.25 && biz.rating >= 4.3) {
    return { label: 'Community Favorite', desc: 'Highly rated by local families', color: '#3BA7A0', icon: 'heart' };
  }
  if (biz.rating >= 4.5 && (biz.review_count || 0) < 15 && (biz.review_count || 0) >= 3) {
    return { label: 'Hidden Gem', desc: 'High rating with growing reviews', color: '#F47C6A', icon: 'star' };
  }
  if (biz.rating >= 4.0 && (biz.review_count || 0) >= 50) {
    return { label: 'Well Established', desc: `${biz.review_count}+ reviews from local parents`, color: '#6A6A6A', icon: 'check' };
  }
  return '';
}

// --- HOURS NUDGE ---
function getHoursNudge(hours) {
  if (!hours) return '';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const now = new Date();
  const todayName = days[now.getDay()];
  const tomorrowName = days[(now.getDay() + 1) % 7];
  const satName = 'Saturday';

  const lines = hours.split('\n');
  let todayLine = '', satLine = '', eveningLines = [];

  for (const line of lines) {
    const lower = line.toLowerCase();
    if (lower.includes(todayName.toLowerCase())) todayLine = line;
    if (lower.includes('saturday')) satLine = line;
    if (lower.match(/(7|8|9)\s*pm/) || lower.match(/(19|20|21):/)) eveningLines.push(line);
  }

  const nudges = [];
  if (todayLine && !todayLine.toLowerCase().includes('closed')) {
    const time = todayLine.split(':').slice(1).join(':').trim();
    if (time) nudges.push(`Open today (${todayName}): ${time}`);
  }
  if (satLine && !satLine.toLowerCase().includes('closed')) {
    const time = satLine.split(':').slice(1).join(':').trim();
    if (time && todayName !== 'Saturday') nudges.push(`Open this Saturday: ${time}`);
  }
  if (eveningLines.length > 0) {
    nudges.push('Evening hours available');
  }
  return nudges.slice(0, 2);
}

// --- SEASONAL CONTENT ---
function getSeasonalBlock(category) {
  const month = new Date().getMonth(); // 0-11

  const seasonal = {
    'Tutoring & Learning Centers': {
      spring: 'Spring is a great time to start tutoring — many centers offer free assessments before summer. Ask about placement tests and trial sessions.',
      summer: 'Summer programs fill up fast. Many tutoring centers offer intensive summer sessions to prevent learning loss. Book early for the best schedules.',
      fall: 'Back-to-school is the busiest enrollment period. If your child is adjusting to a new grade level, now is the ideal time to start supplemental learning.',
      winter: 'Winter break is a great catch-up window. Many centers run short-term holiday programs to reinforce key skills before the spring semester.'
    },
    'Kids Activities & Classes': {
      spring: 'Spring session registration is typically open now. Many studios offer trial classes — a great low-commitment way to see if your child enjoys the activity.',
      summer: 'Summer intensives and camps are available at many activity centers. Great for kids who want to try something new or level up their skills.',
      fall: 'Fall semester classes are starting. Most studios offer flexible schedules for after-school activities. Ask about sibling discounts.',
      winter: 'Winter showcases and recitals are coming up. It\'s also a good time to try new activities during school breaks.'
    },
    'Birthday Party Venues': {
      spring: 'Spring and early summer are peak party season — book 4-6 weeks ahead to secure your preferred date and package.',
      summer: 'Summer party slots fill quickly. Ask about weekday availability for better pricing and more options.',
      fall: 'Fall is a great time for indoor birthday parties. Many venues offer special back-to-school party themes.',
      winter: 'Holiday-themed party packages are often available. Indoor venues are especially popular during colder months.'
    },
    'Summer Camps & After School': {
      spring: 'Summer camp registration is open. Early-bird pricing and popular sessions go fast — register now for the best selection.',
      summer: 'Camps are in full swing. Some still have spots for later sessions. Ask about weekly drop-in options.',
      fall: 'After-school programs are enrolling now. Look for programs that offer homework help, enrichment, and safe pickup from school.',
      winter: 'Winter break camps are a lifesaver for working parents. Many programs offer week-long themed sessions during the holidays.'
    },
    'Pediatric Dentists & Doctors': {
      spring: 'Spring is a good time to schedule annual check-ups and dental cleanings before the busy summer season.',
      summer: 'Get sports physicals and wellness checks done before fall activities begin. Many offices have extended summer hours.',
      fall: 'Flu season is approaching — schedule vaccinations early. Dental check-ups before the holidays help avoid emergency visits.',
      winter: 'Start the year with a wellness visit. Many pediatric offices have shorter wait times in January and February.'
    },
    'Daycares & Preschools': {
      spring: 'Fall enrollment for preschools typically opens in spring. Tour facilities now and ask about waitlists for popular programs.',
      summer: 'Summer programs at many daycares include special activities and field trips. Ask about flexible summer-only schedules.',
      fall: 'The school year has started — some centers still have openings. Ask about mid-year enrollment and transition support.',
      winter: 'Visiting daycares during winter gives you a realistic view of daily routines. Ask about holiday schedules and closures.'
    },
    'Family-Friendly Restaurants': {
      spring: 'Patio season is here. Many family restaurants have outdoor seating with space for kids to move around.',
      summer: 'Look for restaurants with kids-eat-free nights and summer specials. Early dinner (5-6pm) usually means shorter waits.',
      fall: 'Back-to-school dinner deals are common. Many family restaurants offer weeknight specials perfect for busy school nights.',
      winter: 'Holiday dining reservations fill up fast. Many family restaurants offer special holiday menus and group packages.'
    },
    'Kids Haircuts & Clothing': {
      spring: 'Spring wardrobe refresh time. Many kids\' clothing stores have seasonal sales and new arrivals for warmer weather.',
      summer: 'Back-to-school shopping starts in July. Get ahead of the rush for uniforms, shoes, and school-year basics.',
      fall: 'Fall styles are in. Many kids\' salons get busy before school photos — book haircuts a week ahead.',
      winter: 'Holiday outfits and winter gear are in stock. Many stores offer gift cards and holiday shopping events.'
    }
  };

  const catSeasons = seasonal[category];
  if (!catSeasons) return '';

  let season;
  if (month >= 2 && month <= 4) season = 'spring';
  else if (month >= 5 && month <= 7) season = 'summer';
  else if (month >= 8 && month <= 10) season = 'fall';
  else season = 'winter';

  return catSeasons[season] || '';
}

// --- CATEGORY EXPLAINER ---
function getCategoryExplainer(category) {
  const explainers = {
    'Tutoring & Learning Centers': {
      title: 'What Are Tutoring & Learning Centers?',
      text: 'Tutoring and learning centers provide supplemental education for children, typically covering math, reading, writing, and test preparation. Programs like Kumon, Mathnasium, and Sylvan use structured curricula that adapt to each child\'s level. Most centers offer a free initial assessment to determine where your child stands and create a personalized learning plan. Sessions usually run 1-2 times per week, and many centers serve students from pre-K through high school.',
      questions: ['What is the student-to-tutor ratio?', 'Do you offer a free placement assessment?', 'How do you track and report progress?', 'What subjects and grade levels do you cover?', 'Is there a homework component between sessions?']
    },
    'Kids Activities & Classes': {
      title: 'Finding the Right Activity for Your Child',
      text: 'Kids activity centers offer structured classes in dance, swimming, martial arts, gymnastics, music, art, and more. Most programs are organized by age group and skill level, with sessions running in 8-12 week semesters. Many studios offer trial classes so your child can explore different activities before committing. Group classes help build social skills, discipline, and confidence alongside physical development.',
      questions: ['Can we do a trial class before enrolling?', 'What age groups do you serve?', 'What should my child wear or bring?', 'How are classes grouped — by age or skill level?', 'Do you offer make-up classes for missed sessions?']
    },
    'Birthday Party Venues': {
      title: 'Planning a Kids\' Birthday Party',
      text: 'Birthday party venues handle the logistics so you can focus on the fun. Most offer all-inclusive packages that cover the activity, party room time, invitations, decorations, and food. Popular options include trampoline parks, indoor playgrounds, art studios, and arcade centers. Packages typically accommodate 8-20 kids and last 2-3 hours. Book at least 3-4 weeks in advance, especially for weekend slots.',
      questions: ['What\'s included in the party package?', 'How many kids can you accommodate?', 'Can we bring our own food or cake?', 'How far in advance should we book?', 'Is there a private party room?']
    },
    'Summer Camps & After School': {
      title: 'Choosing Summer Camps & After-School Programs',
      text: 'Summer camps and after-school programs provide structured care and enrichment for school-age children. Programs range from academic enrichment and STEM to sports, arts, and outdoor adventure. Day camps typically run 8am-5pm with extended care options. After-school programs usually include pickup from local schools, homework time, snacks, and organized activities. Many programs offer weekly themes and field trips.',
      questions: ['What is the daily schedule?', 'Do you provide transportation or school pickup?', 'What is your staff-to-child ratio?', 'Are meals and snacks included?', 'What happens on rainy days or bad weather?']
    },
    'Pediatric Dentists & Doctors': {
      title: 'Choosing a Pediatric Provider',
      text: 'Pediatric dentists and doctors specialize in children\'s health from infancy through adolescence. Their offices are designed to be kid-friendly, with staff trained to work with young patients. Pediatric dentists recommend first visits by age 1, while well-child checkups follow an age-based schedule. These specialists understand developmental milestones and can catch issues early. Most accept major insurance plans and offer flexible scheduling.',
      questions: ['Do you accept our insurance plan?', 'What is your approach to anxious or first-time patients?', 'What are your emergency/after-hours procedures?', 'How do you handle sedation or anesthesia if needed?', 'Can parents stay in the room during the visit?']
    },
    'Daycares & Preschools': {
      title: 'Finding the Right Daycare or Preschool',
      text: 'Daycares and preschools provide early childhood education and care for children typically aged 6 weeks to 5 years. Programs range from play-based to academic (like Montessori), and many are licensed and accredited by state and national organizations. Look for low student-to-teacher ratios, clean and safe facilities, structured daily routines, and open communication with parents. Tours are the best way to get a feel for the environment.',
      questions: ['What is your teacher-to-child ratio?', 'Are you licensed and accredited?', 'What does a typical daily schedule look like?', 'How do you handle discipline and conflict?', 'What is your sick child policy?']
    },
    'Family-Friendly Restaurants': {
      title: 'Dining Out with Kids in Plano & Frisco',
      text: 'Family-friendly restaurants welcome children with dedicated kids\' menus, high chairs, booster seats, and a relaxed atmosphere. The best family spots offer quick service (kids don\'t wait well), reasonable portions, and food options beyond chicken nuggets. Many local restaurants have outdoor patios, play areas, or coloring activities to keep kids entertained. Early dining (5-6pm) typically means shorter waits and a more relaxed experience.',
      questions: ['Do you have a dedicated kids\' menu?', 'Are high chairs and booster seats available?', 'Do you accommodate food allergies?', 'Is there outdoor seating or a play area?', 'Do you offer kids-eat-free nights?']
    },
    'Kids Haircuts & Clothing': {
      title: 'Kids\' Haircuts & Shopping Guide',
      text: 'Kids\' hair salons specialize in making haircuts fun and stress-free, especially for first-timers. Many feature themed chairs (cars, airplanes), TV screens, and patient stylists experienced with wiggly little ones. Children\'s clothing stores in the area range from budget-friendly to boutique, carrying everything from everyday basics to special occasion outfits. Many stores offer loyalty programs and seasonal sales.',
      questions: ['Do you have experience with first haircuts?', 'How do you handle children who are nervous?', 'Do you offer walk-ins or appointments only?', 'Do you carry specific sizes or age ranges?', 'Do you offer a loyalty or rewards program?']
    }
  };
  return explainers[category] || null;
}

exports.handler = async (event) => {
  let id = event.queryStringParameters?.id;
  if (!id) {
    const pathMatch = event.path.match(/\/go\/(\w+)/);
    if (pathMatch) id = pathMatch[1];
  }
  if (!id) {
    return { statusCode: 400, body: 'Missing id' };
  }

  try {
    const businesses = await loadBusinesses();
    if (!businesses) {
      return { statusCode: 500, body: 'Could not load businesses data' };
    }

    const biz = businesses.find(b => b.id === id);
    if (!biz) {
      return { statusCode: 404, body: 'Business not found' };
    }

    const f = biz;
    const categoryBiz = businesses.filter(b => b.category === f.category);

    const related = categoryBiz
      .filter(b => b.id !== id)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    // --- CONFIDENCE BADGE ---
    const badge = getConfidenceBadge(f, categoryBiz);
    const badgeHtml = badge ? `
      <div class="confidence-badge" style="border-left-color:${badge.color}">
        <div class="badge-label" style="color:${badge.color}">${escHtml(badge.label)}</div>
        <div class="badge-desc">${escHtml(badge.desc)}</div>
      </div>` : '';

    // --- HOURS NUDGE ---
    const nudges = getHoursNudge(f.hours);
    const nudgeHtml = nudges.length ? `
      <div class="nudges">
        ${nudges.map(n => `<div class="nudge"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3BA7A0" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escHtml(n)}</div>`).join('')}
      </div>` : '';

    // --- RATING ---
    const ratingHtml = f.rating ? `
      <div class="rating-bar">
        <span class="rating-num">${f.rating}</span>
        <span class="rating-stars">${'*'.repeat(Math.round(f.rating)).replace(/\*/g, '<svg width="18" height="18" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>')}</span>
        ${f.review_count ? `<span class="rating-count">(${f.review_count} reviews)</span>` : ''}
      </div>` : '';

    // --- SERVICES ---
    let servicesHtml = '';
    if (f.services) {
      const items = f.services.split(',').map(s => s.trim()).filter(Boolean);
      if (items.length) {
        servicesHtml = `
          <div class="section">
            <h2>Services & Amenities</h2>
            <div class="tags">${items.map(s => `<span class="tag">${escHtml(s)}</span>`).join('')}</div>
          </div>`;
      }
    }

    // --- HOURS ---
    let hoursHtml = '';
    if (f.hours) {
      hoursHtml = `
        <div class="section">
          <h2>Hours of Operation</h2>
          <div class="hours-grid">${f.hours.split('\n').map(line => {
            const parts = line.split(':');
            if (parts.length >= 2) {
              const day = escHtml(parts[0].trim());
              const time = escHtml(parts.slice(1).join(':').trim());
              return `<div class="hours-row"><span class="hours-day">${day}</span><span class="hours-time">${time}</span></div>`;
            }
            return `<div class="hours-row"><span>${escHtml(line)}</span></div>`;
          }).join('')}</div>
        </div>`;
    }

    // --- REVIEWS ---
    let reviewsHtml = '';
    if (f.reviews) {
      const snippets = f.reviews.split('---').map(s => s.trim()).filter(Boolean);
      if (snippets.length) {
        reviewsHtml = `
          <div class="section">
            <h2>What Parents Say</h2>
            <div class="reviews">${snippets.map(s => `
              <blockquote class="review">
                <p>"${escHtml(s)}"</p>
              </blockquote>`).join('')}
            </div>
          </div>`;
      }
    }

    // --- CATEGORY EXPLAINER + QUESTIONS ---
    const explainer = getCategoryExplainer(f.category);
    let explainerHtml = '';
    if (explainer) {
      explainerHtml = `
        <div class="section">
          <h2>Questions to Ask Before You Visit</h2>
          <ul class="questions-list">
            ${explainer.questions.map(q => `<li>${escHtml(q)}</li>`).join('')}
          </ul>
        </div>`;
    }

    // --- SEASONAL BLOCK ---
    const seasonalText = getSeasonalBlock(f.category);
    const seasonalHtml = seasonalText ? `
      <div class="seasonal-block">
        <div class="seasonal-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8B872" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg></div>
        <div class="seasonal-content">
          <div class="seasonal-label">Seasonal Tip</div>
          <p>${escHtml(seasonalText)}</p>
        </div>
      </div>` : '';

    // --- MAP ---
    const mapQuery = encodeURIComponent(f.address ? `${f.name}, ${f.address}` : `${f.name}, ${f.city || 'Plano'}, TX`);
    const mapHtml = `
      <div class="section">
        <h2>Location</h2>
        <div class="map-wrap">
          <iframe
            width="100%" height="300" style="border:0; border-radius:8px;"
            loading="lazy" referrerpolicy="no-referrer-when-downgrade"
            src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}">
          </iframe>
        </div>
      </div>`;

    // --- RELATED ---
    const relatedHtml = related.length > 0 ? `
      <div class="section related">
        <h2>Similar in ${escHtml(f.category)}</h2>
        ${related.map(r => `
          <a href="/go/${r.id}" class="related-card">
            ${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="${escHtml(r.name)}" class="related-img">` : `<div class="related-img related-placeholder">${(r.name || '?')[0]}</div>`}
            <div class="related-info">
              <div class="related-name">${escHtml(r.name)}</div>
              <div class="related-meta">${escHtml(r.city)}${r.rating ? ' — ' + r.rating + ' stars' : ''}</div>
            </div>
          </a>`).join('')}
      </div>` : '';

    // --- JSON-LD ---
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": f.name,
      "description": f.description || '',
      "address": {
        "@type": "PostalAddress",
        "streetAddress": f.address || '',
        "addressLocality": f.city || 'Plano',
        "addressRegion": "TX"
      },
      "telephone": f.phone || '',
      "url": f.website || '',
      "image": f.image_url || '',
      "aggregateRating": f.rating ? {
        "@type": "AggregateRating",
        "ratingValue": f.rating,
        "reviewCount": f.review_count || 1
      } : undefined
    });

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(f.name)} — ${escHtml(f.category)} in ${escHtml(f.city)}, TX | KidCompass</title>
  <meta name="description" content="${escHtml((f.description || `Discover ${f.name}, a top ${f.category} in ${f.city}, TX. View services, reviews, and hours on KidCompass.`).substring(0, 160))}">
  <link rel="canonical" href="${SITE_URL}/go/${id}">
  <meta property="og:title" content="${escHtml(f.name)} — ${escHtml(f.category)} in ${escHtml(f.city)} | KidCompass">
  <meta property="og:description" content="${escHtml((f.description || `${f.name} — ${f.category} in ${f.city}, TX`).substring(0, 200))}">
  ${f.image_url ? `<meta property="og:image" content="${escHtml(f.image_url)}">` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:#2E2E2E; background:#FAF9F7; line-height:1.6; }

    .nav { background:#fff; border-bottom:1px solid #E4E4E7; padding:0 24px; position:sticky; top:0; z-index:100; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .logo { font-family:'Poppins',sans-serif; font-size:1.4rem; font-weight:600; color:#3BA7A0; text-decoration:none; letter-spacing:-0.5px; }
    .nav-actions { display:flex; align-items:center; gap:16px; }
    .nav-link { font-size:0.85rem; color:#6A6A6A; text-decoration:none; }
    .nav-link:hover { color:#3BA7A0; }
    .save-btn { display:inline-flex; align-items:center; gap:5px; padding:6px 14px; border-radius:6px; font-size:0.8rem; font-weight:500; cursor:pointer; border:1px solid #DDD; background:#fff; color:#555; transition:all 0.2s; }
    .save-btn:hover { border-color:#F47C6A; color:#F47C6A; }
    .save-btn.saved { background:#FFF5F4; border-color:#F47C6A; color:#F47C6A; }
    .save-btn svg { width:14px; height:14px; }

    .hero-section { position:relative; background:#1a1a1a; }
    .hero-img { width:100%; max-height:400px; object-fit:cover; display:block; }
    .hero-placeholder { width:100%; height:260px; background:linear-gradient(135deg, #3BA7A0 0%, #2d8a84 60%, #1a6b66 100%); display:flex; align-items:center; justify-content:center; }
    .hero-placeholder-text { font-family:'Poppins',sans-serif; font-size:2.5rem; font-weight:700; color:rgba(255,255,255,0.15); letter-spacing:6px; text-transform:uppercase; }
    .hero-overlay { position:absolute; bottom:0; left:0; right:0; height:120px; background:linear-gradient(transparent, rgba(0,0,0,0.4)); }

    .wrap { max-width:800px; margin:0 auto; padding:40px 24px 60px; }

    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:24px; font-size:0.8rem; flex-wrap:wrap; }
    .breadcrumb a { color:#6A6A6A; text-decoration:none; }
    .breadcrumb a:hover { color:#3BA7A0; }
    .breadcrumb span { color:#CCC; }

    .cat-badge { display:inline-block; padding:4px 12px; background:rgba(59,167,160,0.1); color:#3BA7A0; font-size:0.7rem; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; border-radius:4px; margin-bottom:12px; }
    h1 { font-family:'Poppins',sans-serif; font-size:2rem; font-weight:700; color:#2E2E2E; margin-bottom:4px; line-height:1.3; }
    .subtitle { font-size:0.95rem; color:#6A6A6A; margin-bottom:16px; }

    .confidence-badge { display:flex; flex-direction:column; gap:2px; padding:12px 16px; background:#fff; border-radius:8px; border:1px solid #E4E4E7; border-left:4px solid; margin-bottom:20px; }
    .badge-label { font-family:'Poppins',sans-serif; font-size:0.85rem; font-weight:600; }
    .badge-desc { font-size:0.8rem; color:#6A6A6A; }

    .nudges { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:20px; }
    .nudge { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#F0FAF9; border:1px solid #D0EDEB; border-radius:20px; font-size:0.8rem; color:#2d8a84; font-weight:500; }

    .rating-bar { display:flex; align-items:center; gap:8px; margin-bottom:24px; }
    .rating-num { font-size:1.6rem; font-weight:600; color:#2E2E2E; }
    .rating-stars { display:flex; gap:2px; align-items:center; }
    .rating-count { font-size:0.85rem; color:#6A6A6A; }

    .quick-actions { display:flex; gap:10px; flex-wrap:wrap; margin-bottom:32px; }
    .quick-btn { display:inline-flex; align-items:center; gap:6px; padding:10px 20px; border-radius:8px; font-size:0.85rem; font-weight:500; text-decoration:none; transition:all 0.2s; }
    .quick-btn-primary { background:#3BA7A0; color:#fff; }
    .quick-btn-primary:hover { background:#2E8A84; }
    .quick-btn-outline { background:#fff; color:#2E2E2E; border:1px solid #DDD; }
    .quick-btn-outline:hover { border-color:#3BA7A0; color:#3BA7A0; }
    .quick-btn svg { width:16px; height:16px; }

    .about { margin-bottom:40px; }
    .about h2 { font-family:'Poppins',sans-serif; font-size:1.3rem; font-weight:600; color:#2E2E2E; margin-bottom:12px; }
    .about p { font-size:0.95rem; color:#555; line-height:1.8; }

    .seasonal-block { display:flex; gap:14px; padding:18px 20px; background:#FFFBF0; border:1px solid #F5E6C4; border-radius:10px; margin-bottom:32px; }
    .seasonal-icon { flex-shrink:0; margin-top:2px; }
    .seasonal-content { flex:1; }
    .seasonal-label { font-family:'Poppins',sans-serif; font-size:0.75rem; font-weight:600; color:#D4A853; letter-spacing:1px; text-transform:uppercase; margin-bottom:4px; }
    .seasonal-content p { font-size:0.85rem; color:#7A6A3A; line-height:1.6; }

    .section { margin-bottom:40px; }
    .section h2 { font-family:'Poppins',sans-serif; font-size:1.3rem; font-weight:600; color:#2E2E2E; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid #E4E4E7; }

    .tags { display:flex; flex-wrap:wrap; gap:8px; }
    .tag { display:inline-block; padding:6px 14px; background:#fff; border:1px solid #E4E4E7; border-radius:20px; font-size:0.8rem; color:#555; transition:all 0.15s; }
    .tag:hover { border-color:#3BA7A0; color:#3BA7A0; }

    .hours-grid { display:flex; flex-direction:column; gap:0; background:#fff; border-radius:10px; border:1px solid #E4E4E7; overflow:hidden; }
    .hours-row { display:flex; justify-content:space-between; padding:10px 16px; font-size:0.85rem; border-bottom:1px solid #F5F5F5; }
    .hours-row:last-child { border-bottom:none; }
    .hours-day { font-weight:500; color:#2E2E2E; }
    .hours-time { color:#6A6A6A; }

    .reviews { display:flex; flex-direction:column; gap:16px; }
    .review { padding:20px 24px; background:#fff; border-radius:10px; border:1px solid #E4E4E7; border-left:3px solid #3BA7A0; position:relative; }
    .review::before { content:open-quote; position:absolute; top:8px; left:16px; font-size:2.5rem; color:rgba(59,167,160,0.15); font-family:Georgia,serif; line-height:1; }
    .review p { font-size:0.9rem; color:#555; line-height:1.7; font-style:italic; padding-left:20px; }

    .questions-list { list-style:none; padding:0; }
    .questions-list li { position:relative; padding:10px 0 10px 28px; border-bottom:1px solid #F5F5F5; font-size:0.88rem; color:#444; }
    .questions-list li:last-child { border-bottom:none; }
    .questions-list li::before { content:'?'; position:absolute; left:0; top:10px; width:20px; height:20px; background:#3BA7A0; color:#fff; border-radius:50%; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; }

    .map-wrap { border-radius:10px; overflow:hidden; border:1px solid #E4E4E7; }

    .related { margin-top:48px; padding-top:32px; border-top:2px solid #E4E4E7; }
    .related-card { display:flex; align-items:center; gap:16px; padding:14px 0; border-bottom:1px solid #F0F0F0; text-decoration:none; color:#2E2E2E; transition:all 0.15s; }
    .related-card:last-child { border-bottom:none; }
    .related-card:hover { padding-left:8px; }
    .related-img { width:56px; height:56px; border-radius:10px; object-fit:cover; flex-shrink:0; }
    .related-placeholder { background:linear-gradient(135deg,#3BA7A0,#2d8a84); display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; font-size:1.1rem; font-weight:600; color:rgba(255,255,255,0.7); width:56px; height:56px; border-radius:10px; }
    .related-name { font-family:'Poppins',sans-serif; font-size:0.95rem; font-weight:500; color:#2E2E2E; }
    .related-meta { font-size:0.8rem; color:#6A6A6A; margin-top:2px; }

    .page-meta { display:flex; align-items:center; justify-content:center; gap:16px; padding:20px 24px; margin-top:48px; border-top:1px solid #E4E4E7; font-size:0.78rem; color:#999; }
    .meta-verified { display:inline-flex; align-items:center; gap:4px; }
    .meta-link { color:#6A6A6A; text-decoration:none; border-bottom:1px dashed #CCC; }
    .meta-link:hover { color:#3BA7A0; border-color:#3BA7A0; }

    .footer { margin-top:0; padding:24px; border-top:1px solid #E4E4E7; text-align:center; font-size:0.75rem; color:#6A6A6A; background:#fff; }

    @media (max-width:600px) {
      h1 { font-size:1.5rem; }
      .quick-actions { flex-direction:column; }
      .quick-btn { justify-content:center; }
      .hero-img { max-height:260px; }
      .hero-placeholder { height:180px; }
      .hero-placeholder-text { font-size:1.5rem; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="logo">KidCompass</a>
      <div class="nav-actions">
        <a href="/" class="nav-link">Browse All</a>
        <button class="save-btn" id="saveBtn" onclick="toggleSave()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>
          <span id="saveTxt">Save</span>
        </button>
      </div>
    </div>
  </nav>

  <div class="hero-section">
    ${f.image_url ? `<img class="hero-img" src="${escHtml(f.image_url)}" alt="${escHtml(f.name)}">` : `<div class="hero-placeholder"><span class="hero-placeholder-text">${escHtml(f.category || '')}</span></div>`}
    ${f.image_url ? '<div class="hero-overlay"></div>' : ''}
  </div>

  <div class="wrap">
    <div class="breadcrumb">
      <a href="/">Home</a><span>/</span>
      <a href="/${(f.city || 'plano').toLowerCase()}">${escHtml(f.city || 'Plano')}</a><span>/</span>
      <a href="/${(f.city || 'plano').toLowerCase()}/${escHtml(getCatSlug(f.category))}">${escHtml(f.category || '')}</a>
    </div>

    <div class="cat-badge">${escHtml(f.category || '')}</div>
    <h1>${escHtml(f.name)}</h1>
    <p class="subtitle">${escHtml(f.city || 'Plano')}, TX${cleanAddress(f.address) ? ' — ' + escHtml(cleanAddress(f.address)) : ''}</p>

    ${badgeHtml}
    ${nudgeHtml}
    ${ratingHtml}

    <div class="quick-actions">
      ${f.website ? `<a class="quick-btn quick-btn-primary" href="${escHtml(f.website)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Visit Website</a>` : ''}
      ${f.phone ? `<a class="quick-btn quick-btn-outline" href="tel:${escHtml(f.phone.replace(/[^+\d]/g, ''))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>${escHtml(f.phone)}</a>` : ''}
      <a class="quick-btn quick-btn-outline" href="${mapsUrl(f.address, f.name, f.city)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Get Directions</a>
      <button class="quick-btn quick-btn-outline" onclick="sharePage()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>Share</button>
    </div>


    ${seasonalHtml}

    ${f.description ? `<div class="about"><h2>About ${escHtml(f.name)}</h2><p>${f.description.replace(/\n/g, '<br>')}</p></div>` : ''}

    ${servicesHtml}
    ${hoursHtml}
    ${reviewsHtml}
    ${mapHtml}
    ${explainerHtml}
    ${relatedHtml}
  </div>

  <div class="page-meta">
    ${f.scraped_at ? `<span class="meta-verified">Last verified: ${new Date(f.scraped_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>` : ''}
    <a href="mailto:hello@kidcompass.com?subject=Edit suggestion for ${encodeURIComponent(f.name)}&body=Business: ${encodeURIComponent(f.name)}%0AWhat needs updating:%0A" class="meta-link">Suggest an edit</a>
  </div>

  <div class="footer">KidCompass — Plano & Frisco, TX</div>

  <script>
    const BIZ_ID = '${id}';
    function getSaved() { try { return JSON.parse(localStorage.getItem('kc_saved') || '[]'); } catch(e) { return []; } }
    function isSaved() { return getSaved().includes(BIZ_ID); }
    function toggleSave() {
      let saved = getSaved();
      if (saved.includes(BIZ_ID)) {
        saved = saved.filter(x => x !== BIZ_ID);
      } else {
        saved.push(BIZ_ID);
      }
      localStorage.setItem('kc_saved', JSON.stringify(saved));
      updateSaveBtn();
    }
    function updateSaveBtn() {
      const btn = document.getElementById('saveBtn');
      const txt = document.getElementById('saveTxt');
      if (isSaved()) { btn.classList.add('saved'); txt.textContent = 'Saved'; }
      else { btn.classList.remove('saved'); txt.textContent = 'Save'; }
    }
    function sharePage() {
      const data = { title: document.title, url: window.location.href };
      if (navigator.share) {
        navigator.share(data).catch(() => {});
      } else {
        navigator.clipboard.writeText(data.url).then(() => {
          const btn = document.querySelector('[onclick="sharePage()"]');
          const orig = btn.innerHTML;
          btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>Link Copied!';
          setTimeout(() => { btn.innerHTML = orig; }, 2000);
        });
      }
    }
    updateSaveBtn();
  </script>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    };
  } catch (err) {
    return { statusCode: 500, body: 'Server error: ' + err.message };
  }
};
