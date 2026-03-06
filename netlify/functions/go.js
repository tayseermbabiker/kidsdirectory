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
  const q = address || `${name}, ${city || 'Plano'}, TX`;
  return `https://www.google.com/maps/search/${encodeURIComponent(q)}`;
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

    const related = businesses
      .filter(b => b.category === f.category && b.id !== id)
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 5);

    // Rating
    const ratingHtml = f.rating ? `
      <div class="rating-bar">
        <span class="rating-num">${f.rating}</span>
        <span class="rating-stars">${'*'.repeat(Math.round(f.rating)).replace(/\*/g, '<svg width="18" height="18" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>')}</span>
        ${f.review_count ? `<span class="rating-count">(${f.review_count} reviews)</span>` : ''}
      </div>` : '';

    // Services as badges
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

    // Hours
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

    // Reviews
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

    // Map embed
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

    // Related
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

    // JSON-LD
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

    .nav { background:#fff; border-bottom:1px solid #E4E4E7; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:64px; }
    .logo { font-family:'Poppins',sans-serif; font-size:1.4rem; font-weight:600; color:#3BA7A0; text-decoration:none; letter-spacing:-0.5px; }
    .nav-link { font-size:0.85rem; color:#6A6A6A; text-decoration:none; }
    .nav-link:hover { color:#3BA7A0; }

    .hero-section { position:relative; background:#1a1a1a; }
    .hero-img { width:100%; max-height:400px; object-fit:cover; display:block; }
    .hero-placeholder { width:100%; height:260px; background:linear-gradient(135deg, #3BA7A0 0%, #2d8a84 60%, #1a6b66 100%); display:flex; align-items:center; justify-content:center; }
    .hero-placeholder-text { font-family:'Poppins',sans-serif; font-size:2.5rem; font-weight:700; color:rgba(255,255,255,0.2); letter-spacing:6px; text-transform:uppercase; }
    .hero-overlay { position:absolute; bottom:0; left:0; right:0; height:120px; background:linear-gradient(transparent, rgba(0,0,0,0.4)); }

    .wrap { max-width:800px; margin:0 auto; padding:40px 24px 60px; }

    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:24px; font-size:0.8rem; }
    .breadcrumb a { color:#6A6A6A; text-decoration:none; }
    .breadcrumb a:hover { color:#3BA7A0; }
    .breadcrumb span { color:#CCC; }

    .cat-badge { display:inline-block; padding:4px 12px; background:rgba(59,167,160,0.1); color:#3BA7A0; font-size:0.7rem; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; border-radius:4px; margin-bottom:12px; }
    h1 { font-family:'Poppins',sans-serif; font-size:2rem; font-weight:700; color:#2E2E2E; margin-bottom:4px; line-height:1.3; }
    .subtitle { font-size:0.95rem; color:#6A6A6A; margin-bottom:16px; }

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

    .info-cards { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; }
    .info-card { padding:16px; background:#fff; border-radius:10px; border:1px solid #E4E4E7; }
    .info-card-label { font-size:0.7rem; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:#999; margin-bottom:6px; }
    .info-card-value { font-size:0.9rem; color:#2E2E2E; word-break:break-word; }
    .info-card-value a { color:#3BA7A0; text-decoration:none; }
    .info-card-value a:hover { text-decoration:underline; }

    .about { margin-bottom:40px; }
    .about h2 { font-family:'Poppins',sans-serif; font-size:1.3rem; font-weight:600; color:#2E2E2E; margin-bottom:12px; }
    .about p { font-size:0.95rem; color:#555; line-height:1.8; }

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
    .review::before { content:'"'; position:absolute; top:8px; left:16px; font-size:2.5rem; color:rgba(59,167,160,0.15); font-family:Georgia,serif; line-height:1; }
    .review p { font-size:0.9rem; color:#555; line-height:1.7; font-style:italic; padding-left:20px; }

    .map-wrap { border-radius:10px; overflow:hidden; border:1px solid #E4E4E7; }

    .related { margin-top:48px; padding-top:32px; border-top:2px solid #E4E4E7; }
    .related-card { display:flex; align-items:center; gap:16px; padding:14px 0; border-bottom:1px solid #F0F0F0; text-decoration:none; color:#2E2E2E; transition:all 0.15s; }
    .related-card:last-child { border-bottom:none; }
    .related-card:hover { padding-left:8px; }
    .related-img { width:56px; height:56px; border-radius:10px; object-fit:cover; flex-shrink:0; }
    .related-placeholder { background:linear-gradient(135deg,#3BA7A0,#2d8a84); display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; font-size:1.1rem; font-weight:600; color:rgba(255,255,255,0.7); width:56px; height:56px; border-radius:10px; }
    .related-name { font-family:'Poppins',sans-serif; font-size:0.95rem; font-weight:500; color:#2E2E2E; }
    .related-meta { font-size:0.8rem; color:#6A6A6A; margin-top:2px; }

    .footer { margin-top:80px; padding:24px; border-top:1px solid #E4E4E7; text-align:center; font-size:0.75rem; color:#6A6A6A; background:#fff; }

    @media (max-width:600px) {
      h1 { font-size:1.5rem; }
      .info-cards { grid-template-columns:1fr; }
      .quick-actions { flex-direction:column; }
      .quick-btn { justify-content:center; }
      .hero-img { max-height:260px; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="logo">KidCompass</a>
      <a href="/" class="nav-link">Browse All</a>
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
    <p class="subtitle">${escHtml(f.city || 'Plano')}, TX${f.address ? ' — ' + escHtml(f.address) : ''}</p>

    ${ratingHtml}

    <div class="quick-actions">
      ${f.website ? `<a class="quick-btn quick-btn-primary" href="${escHtml(f.website)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Visit Website</a>` : ''}
      ${f.phone ? `<a class="quick-btn quick-btn-outline" href="tel:${escHtml(f.phone.replace(/[^+\d]/g, ''))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>${escHtml(f.phone)}</a>` : ''}
      <a class="quick-btn quick-btn-outline" href="${mapsUrl(f.address, f.name, f.city)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Get Directions</a>
    </div>

    <div class="info-cards">
      ${f.address ? `<div class="info-card"><div class="info-card-label">Address</div><div class="info-card-value"><a href="${mapsUrl(f.address, f.name, f.city)}" target="_blank" rel="noopener">${escHtml(f.address)}</a></div></div>` : ''}
      ${f.phone ? `<div class="info-card"><div class="info-card-label">Phone</div><div class="info-card-value"><a href="tel:${escHtml(f.phone.replace(/[^+\d]/g, ''))}">${escHtml(f.phone)}</a></div></div>` : ''}
      ${f.website ? `<div class="info-card"><div class="info-card-label">Website</div><div class="info-card-value"><a href="${escHtml(f.website)}" target="_blank" rel="noopener">${escHtml(f.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a></div></div>` : ''}
      ${f.price_range ? `<div class="info-card"><div class="info-card-label">Price Range</div><div class="info-card-value">${escHtml(f.price_range)}</div></div>` : ''}
      <div class="info-card"><div class="info-card-label">City</div><div class="info-card-value">${escHtml(f.city || 'Plano')}, TX</div></div>
      <div class="info-card"><div class="info-card-label">Source</div><div class="info-card-value">${escHtml(f.source || 'Google Maps')}</div></div>
    </div>

    ${f.description ? `<div class="about"><h2>About ${escHtml(f.name)}</h2><p>${f.description.replace(/\n/g, '<br>')}</p></div>` : ''}

    ${servicesHtml}
    ${hoursHtml}
    ${reviewsHtml}
    ${mapHtml}
    ${relatedHtml}
  </div>
  <div class="footer">KidCompass — Plano & Frisco, TX</div>
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
