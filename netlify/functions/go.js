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
      .slice(0, 5);

    // Rating
    const ratingHtml = f.rating ? `
      <div class="rating-bar">
        <span class="rating-num">${f.rating}</span>
        <span class="rating-stars">${'*'.repeat(Math.round(f.rating)).replace(/\*/g, '<svg width="16" height="16" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>')}</span>
        ${f.review_count ? `<span class="rating-count">(${f.review_count} reviews)</span>` : ''}
      </div>` : '';

    // Services
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
          <h2>Hours</h2>
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
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:#2E2E2E; background:#FAF9F7; line-height:1.6; }
    .nav { background:#fff; border-bottom:1px solid #E4E4E7; padding:0 24px; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; height:64px; }
    .logo { font-family:'Poppins',sans-serif; font-size:1.4rem; font-weight:600; color:#3BA7A0; text-decoration:none; letter-spacing:-0.5px; }

    .hero-img { width:100%; max-height:400px; object-fit:cover; }

    .wrap { max-width:800px; margin:0 auto; padding:40px 24px; }
    .back { display:inline-block; margin-bottom:24px; font-size:0.85rem; color:#6A6A6A; text-decoration:none; }
    .back:hover { color:#2E2E2E; }
    .cat { font-size:0.7rem; font-weight:600; letter-spacing:2px; text-transform:uppercase; color:#3BA7A0; margin-bottom:8px; }
    h1 { font-family:'Poppins',sans-serif; font-size:2rem; font-weight:600; color:#2E2E2E; margin-bottom:8px; }
    .loc { font-size:0.9rem; color:#6A6A6A; margin-bottom:16px; }

    .rating-bar { display:flex; align-items:center; gap:8px; margin-bottom:24px; }
    .rating-num { font-size:1.5rem; font-weight:500; color:#2E2E2E; }
    .rating-stars { display:flex; gap:2px; }
    .rating-count { font-size:0.8rem; color:#6A6A6A; }

    .meta-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:32px; padding:24px; background:#fff; border-radius:8px; border:1px solid #E4E4E7; font-size:0.85rem; color:#555; }
    .meta-item { display:flex; align-items:flex-start; gap:8px; }
    .meta-icon { width:18px; height:18px; flex-shrink:0; opacity:0.5; margin-top:2px; }
    .meta-item a { color:#3BA7A0; text-decoration:none; }
    .meta-item a:hover { text-decoration:underline; }

    .desc { font-size:0.95rem; color:#555; line-height:1.8; margin-bottom:32px; }

    .section { margin-bottom:40px; }
    .section h2 { font-family:'Poppins',sans-serif; font-size:1.3rem; font-weight:600; color:#2E2E2E; margin-bottom:16px; padding-bottom:8px; border-bottom:1px solid #E4E4E7; }

    .tags { display:flex; flex-wrap:wrap; gap:8px; }
    .tag { display:inline-block; padding:6px 14px; background:#F1F1F3; border:1px solid #E4E4E7; border-radius:20px; font-size:0.8rem; color:#555; }

    .hours-grid { display:flex; flex-direction:column; gap:4px; }
    .hours-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #F0F0F0; font-size:0.85rem; }
    .hours-day { font-weight:500; color:#2E2E2E; }
    .hours-time { color:#6A6A6A; }

    .reviews { display:flex; flex-direction:column; gap:16px; }
    .review { padding:20px; background:#fff; border-radius:8px; border:1px solid #E4E4E7; border-left:3px solid #3BA7A0; }
    .review p { font-size:0.9rem; color:#555; line-height:1.7; font-style:italic; }

    .cta-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:40px; }
    .cta { display:inline-block; padding:14px 32px; background:#3BA7A0; color:#fff; text-decoration:none; font-size:0.85rem; font-weight:500; border-radius:6px; transition:background 0.2s; }
    .cta:hover { background:#2E8A84; }
    .cta-outline { display:inline-block; padding:14px 32px; background:transparent; color:#2E2E2E; text-decoration:none; font-size:0.85rem; font-weight:500; border-radius:6px; border:1px solid #CCC; transition:all 0.2s; }
    .cta-outline:hover { border-color:#3BA7A0; color:#3BA7A0; }

    .related { margin-top:48px; }
    .related-card { display:flex; align-items:center; gap:16px; padding:16px 0; border-bottom:1px solid #E4E4E7; text-decoration:none; color:#2E2E2E; transition:background 0.1s; }
    .related-card:hover { background:#F5F5F5; margin:0 -8px; padding:16px 8px; border-radius:4px; }
    .related-img { width:56px; height:56px; border-radius:8px; object-fit:cover; flex-shrink:0; }
    .related-placeholder { background:#F1F1F3; display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; font-size:1.2rem; color:#6A6A6A; width:56px; height:56px; border-radius:8px; }
    .related-name { font-family:'Poppins',sans-serif; font-size:1rem; color:#2E2E2E; }
    .related-meta { font-size:0.8rem; color:#6A6A6A; margin-top:2px; }

    .footer { margin-top:80px; padding:24px; border-top:1px solid #E4E4E7; text-align:center; font-size:0.75rem; color:#6A6A6A; background:#fff; }

    @media (max-width:600px) {
      h1 { font-size:1.5rem; }
      .meta-grid { grid-template-columns:1fr; }
      .cta-row { flex-direction:column; }
      .cta, .cta-outline { text-align:center; }
    }
  </style>
</head>
<body>
  <nav class="nav"><div class="nav-inner"><a href="/" class="logo">KidCompass</a></div></nav>

  ${f.image_url ? `<img class="hero-img" src="${escHtml(f.image_url)}" alt="${escHtml(f.name)}">` : ''}

  <div class="wrap">
    <a href="/" class="back">Back to directory</a>
    <div class="cat">${escHtml(f.category || '')}</div>
    <h1>${escHtml(f.name)}</h1>
    <p class="loc">${escHtml(f.city || 'Plano')}, TX${f.price_range ? ' — ' + escHtml(f.price_range) : ''}</p>

    ${ratingHtml}

    <div class="meta-grid">
      ${f.address ? `<div class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg><span>${escHtml(f.address)}</span></div>` : ''}
      ${f.phone ? `<div class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg><span>${escHtml(f.phone)}</span></div>` : ''}
      ${f.website ? `<div class="meta-item"><svg class="meta-icon" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2 0 .68.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.66-.16-1.32-.16-2 0-.68.07-1.35.16-2h4.68c.09.65.16 1.32.16 2 0 .68-.07 1.34-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2 0-.68-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg><a href="${escHtml(f.website)}" target="_blank" rel="noopener">Visit Website</a></div>` : ''}
    </div>

    ${f.description ? `<div class="desc">${f.description.replace(/\n/g, '<br>')}</div>` : ''}

    <div class="cta-row">
      ${f.website ? `<a class="cta" href="${escHtml(f.website)}" target="_blank" rel="noopener">Visit Website</a>` : ''}
      ${f.phone ? `<a class="cta-outline" href="tel:${escHtml(f.phone)}">Call Now</a>` : ''}
    </div>

    ${servicesHtml}
    ${hoursHtml}
    ${reviewsHtml}
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
