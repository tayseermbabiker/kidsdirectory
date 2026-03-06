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

// --- COMPARISON STATS ---
function getComparisonStats(biz, peers) {
  const stats = [];
  if (!biz.rating || peers.length < 5) return stats;

  // Rating percentile
  const rated = peers.filter(b => b.rating);
  const belowRating = rated.filter(b => b.rating < biz.rating).length;
  const ratingPct = Math.round((belowRating / rated.length) * 100);
  if (ratingPct >= 60) stats.push(`Rated higher than ${ratingPct}% of ${biz.category.toLowerCase()} in ${biz.city}`);

  // Review count percentile
  if (biz.review_count) {
    const withReviews = peers.filter(b => b.review_count);
    const belowReviews = withReviews.filter(b => b.review_count < biz.review_count).length;
    const reviewPct = Math.round((belowReviews / withReviews.length) * 100);
    if (reviewPct >= 60) stats.push(`More reviewed than ${reviewPct}% of similar listings`);
  }

  // Hours comparison — check if open evenings or weekends
  if (biz.hours) {
    const hasEvening = biz.hours.match(/(7|8|9)\s*PM/i);
    const hasSaturday = biz.hours.includes('Saturday') && !biz.hours.match(/Saturday.*Closed/i);
    if (hasEvening) stats.push('Offers evening hours');
    if (hasSaturday) stats.push('Open on Saturdays');
  }

  return stats.slice(0, 3);
}

// --- PARSE SERVICES INTO STRUCTURED DATA ---
function parseServices(services) {
  if (!services) return { age: '', tags: [], hasTrial: false };
  const items = services.split(',').map(s => s.trim()).filter(Boolean);

  const ageTag = items.find(s => /ages?\s*\d/i.test(s)) || '';
  const trialTag = items.find(s => /free|trial|assessment/i.test(s)) || '';
  const otherTags = items.filter(s => s !== ageTag && s !== trialTag);

  return {
    age: ageTag,
    tags: otherTags,
    hasTrial: !!trialTag,
    trialLabel: trialTag
  };
}

// --- TRIM REVIEWS: complete sentences, max 2 sentences each ---
function cleanReviews(raw) {
  if (!raw) return [];
  return raw.split('---').map(s => s.trim()).filter(Boolean)
    .map(s => {
      // Strip trailing ellipsis
      let cleaned = s.replace(/\s*[…]+\s*$/, '').replace(/\s*\.{3,}\s*$/, '');
      // Find sentence boundaries
      const sentences = cleaned.match(/[^.!?]*[.!?]+/g);
      if (sentences && sentences.length > 2) {
        return sentences.slice(0, 2).join('').trim();
      }
      // If truncated, cut at last complete sentence
      const lastPeriod = cleaned.lastIndexOf('.');
      const lastExcl = cleaned.lastIndexOf('!');
      const cutoff = Math.max(lastPeriod, lastExcl);
      if (cutoff > 20 && cutoff < cleaned.length - 1) return cleaned.substring(0, cutoff + 1);
      return cleaned;
    }).filter(s => s.length > 30);
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

    // --- PARSED DATA ---
    const svc = parseServices(f.services);
    const reviews = cleanReviews(f.reviews);
    const compStats = getComparisonStats(f, categoryBiz);

    // --- RATING ---
    const ratingHtml = f.rating ? `
      <div class="rating-bar">
        <span class="rating-num">${f.rating}</span>
        <span class="rating-stars">${'*'.repeat(Math.round(f.rating)).replace(/\*/g, '<svg width="18" height="18" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>')}</span>
        ${f.review_count ? `<span class="rating-count">(${f.review_count} reviews)</span>` : ''}
      </div>` : '';

    // --- KIDCOMPASS TAKE ---
    const takeHtml = f.take ? `
      <div class="take-block">
        <div class="take-label"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3BA7A0" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>KidCompass Take</div>
        <p>${escHtml(f.take)}</p>
      </div>` : '';

    // --- PRICE ---
    const priceHtml = f.price_note ? `
      <div class="price-signal">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6A6A6A" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
        <span>${escHtml(f.price_note)}</span>
      </div>` : '';

    // --- FREE TRIAL BANNER ---
    const trialHtml = svc.hasTrial ? `
      <div class="trial-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1a7a3a" stroke-width="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
        <span>${escHtml(svc.trialLabel)} available — ask when you call</span>
      </div>` : '';

    // --- AT A GLANCE ---
    let glanceHtml = '';
    if (svc.age || svc.tags.length || f.price_note) {
      glanceHtml = `
        <div class="section glance-section">
          <h2>At a Glance</h2>
          <div class="glance-items">
            ${svc.age ? `<div class="glance-age"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3BA7A0" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>${escHtml(svc.age)}</div>` : ''}
            ${priceHtml}
          </div>
          ${svc.tags.length ? `<div class="tags">${svc.tags.map(s => `<span class="tag">${escHtml(s)}</span>`).join('')}</div>` : ''}
        </div>`;
    }

    // --- COMPARISON STATS ---
    const compHtml = compStats.length ? `
      <div class="comp-stats">
        ${compStats.map(s => `<div class="comp-stat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3BA7A0" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>${escHtml(s)}</div>`).join('')}
      </div>` : '';

    // --- REVIEWS ---
    const reviewsHtml = reviews.length ? `
      <div class="section">
        <h2>What Parents Say</h2>
        <div class="reviews">${reviews.map(s => `
          <blockquote class="review">
            <p>"${escHtml(s)}"</p>
          </blockquote>`).join('')}
        </div>
      </div>` : '';

    // --- HOURS ---
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

    // --- WHAT TO EXPECT ---
    const expectHtml = f.what_to_expect ? `
      <div class="section expect-section">
        <h2>What to Expect</h2>
        <p>${f.what_to_expect.replace(/\n/g, '<br>')}</p>
      </div>` : '';

    // --- IS THIS RIGHT FOR YOUR CHILD? ---
    const fitItems = f.good_fit ? f.good_fit.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const fitHtml = fitItems.length ? `
      <div class="section fit-section">
        <h2>Is This a Good Fit?</h2>
        <p class="fit-intro">This place might be right for you if:</p>
        <ul class="fit-list">
          ${fitItems.map(item => `<li>${escHtml(item)}</li>`).join('')}
        </ul>
      </div>` : '';

    // --- MAP ---
    const mapQuery = encodeURIComponent(f.address ? `${f.name}, ${f.address}` : `${f.name}, ${f.city || 'Plano'}, TX`);
    const mapHtml = `
      <div class="map-wrap">
        <iframe
          width="100%" height="220" style="border:0; border-radius:8px;"
          loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=${mapQuery}">
        </iframe>
      </div>`;

    // --- RELATED (enriched with tags) ---
    const relatedHtml = related.length > 0 ? `
      <div class="section related">
        <h2>Compare Other ${escHtml(f.category)}</h2>
        ${related.map(r => {
          const rSvc = parseServices(r.services);
          return `
          <a href="/go/${r.id}" class="related-card">
            ${r.image_url ? `<img src="${escHtml(r.image_url)}" alt="${escHtml(r.name)}" class="related-img">` : `<div class="related-img related-placeholder">${(r.name || '?')[0]}</div>`}
            <div class="related-info">
              <div class="related-name">${escHtml(r.name)}</div>
              <div class="related-meta">${escHtml(r.city)}${r.rating ? ` · ${r.rating} stars` : ''}${r.review_count ? ` · ${r.review_count} reviews` : ''}</div>
              ${rSvc.age || rSvc.tags.length ? `<div class="related-tags">${rSvc.age ? `<span class="rtag rtag-age">${escHtml(rSvc.age)}</span>` : ''}${rSvc.tags.slice(0, 2).map(t => `<span class="rtag">${escHtml(t)}</span>`).join('')}</div>` : ''}
            </div>
          </a>`;
        }).join('')}
      </div>` : '';

    // --- JSON-LD ---
    const jsonLd = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      "name": f.name,
      "description": f.take || f.description || '',
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

    // --- SEO META ---
    const metaDesc = f.take || f.description || `${f.name} — ${f.category} in ${f.city}, TX. Reviews, hours, and details on KidCompass.`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(f.name)} — ${escHtml(f.category)} in ${escHtml(f.city)}, TX | KidCompass</title>
  <meta name="description" content="${escHtml(metaDesc.substring(0, 160))}">
  <link rel="canonical" href="${SITE_URL}/go/${id}">
  <meta property="og:title" content="${escHtml(f.name)} — ${escHtml(f.category)} in ${escHtml(f.city)} | KidCompass">
  <meta property="og:description" content="${escHtml(metaDesc.substring(0, 200))}">
  ${f.image_url ? `<meta property="og:image" content="${escHtml(f.image_url)}">` : ''}
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet">
  <script type="application/ld+json">${jsonLd}</script>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Inter',sans-serif; color:#2E2E2E; background:#FAF9F7; line-height:1.6; }

    .nav { background:#fff; border-bottom:1px solid #E4E4E7; padding:0 24px; position:sticky; top:0; z-index:100; }
    .nav-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-between; height:56px; }
    .logo { font-family:'Poppins',sans-serif; font-size:1.3rem; font-weight:600; color:#3BA7A0; text-decoration:none; letter-spacing:-0.5px; }
    .nav-actions { display:flex; align-items:center; gap:14px; }
    .nav-link { font-size:0.82rem; color:#6A6A6A; text-decoration:none; }
    .nav-link:hover { color:#3BA7A0; }
    .save-btn { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:6px; font-size:0.78rem; font-weight:500; cursor:pointer; border:1px solid #DDD; background:#fff; color:#555; transition:all 0.2s; }
    .save-btn:hover { border-color:#F47C6A; color:#F47C6A; }
    .save-btn.saved { background:#FFF5F4; border-color:#F47C6A; color:#F47C6A; }
    .save-btn svg { width:13px; height:13px; }

    .hero-section { position:relative; background:#1a1a1a; }
    .hero-img { width:100%; max-height:360px; object-fit:cover; display:block; }
    .hero-placeholder { width:100%; height:200px; background:linear-gradient(135deg, #3BA7A0 0%, #2d8a84 60%, #1a6b66 100%); display:flex; align-items:center; justify-content:center; }
    .hero-placeholder-text { font-family:'Poppins',sans-serif; font-size:2rem; font-weight:700; color:rgba(255,255,255,0.12); letter-spacing:6px; text-transform:uppercase; }
    .hero-overlay { position:absolute; bottom:0; left:0; right:0; height:100px; background:linear-gradient(transparent, rgba(0,0,0,0.35)); }

    .wrap { max-width:760px; margin:0 auto; padding:32px 24px 48px; }

    .breadcrumb { display:flex; align-items:center; gap:6px; margin-bottom:20px; font-size:0.78rem; flex-wrap:wrap; }
    .breadcrumb a { color:#6A6A6A; text-decoration:none; }
    .breadcrumb a:hover { color:#3BA7A0; }
    .breadcrumb span { color:#CCC; }

    .cat-badge { display:inline-block; padding:3px 10px; background:rgba(59,167,160,0.1); color:#3BA7A0; font-size:0.68rem; font-weight:600; letter-spacing:1.5px; text-transform:uppercase; border-radius:4px; margin-bottom:10px; }
    h1 { font-family:'Poppins',sans-serif; font-size:1.8rem; font-weight:700; color:#2E2E2E; margin-bottom:4px; line-height:1.25; }
    .subtitle { font-size:0.9rem; color:#6A6A6A; margin-bottom:14px; }

    .rating-bar { display:flex; align-items:center; gap:8px; margin-bottom:16px; }
    .rating-num { font-size:1.5rem; font-weight:600; color:#2E2E2E; }
    .rating-stars { display:flex; gap:2px; align-items:center; }
    .rating-count { font-size:0.82rem; color:#6A6A6A; }

    .quick-actions { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:24px; }
    .quick-btn { display:inline-flex; align-items:center; gap:6px; padding:9px 18px; border-radius:8px; font-size:0.82rem; font-weight:500; text-decoration:none; transition:all 0.2s; cursor:pointer; }
    .quick-btn-primary { background:#3BA7A0; color:#fff; border:none; }
    .quick-btn-primary:hover { background:#2E8A84; }
    .quick-btn-outline { background:#fff; color:#2E2E2E; border:1px solid #DDD; }
    .quick-btn-outline:hover { border-color:#3BA7A0; color:#3BA7A0; }
    .quick-btn svg { width:15px; height:15px; }

    .trial-banner { display:flex; align-items:center; gap:8px; padding:12px 18px; background:#ECFDF5; border:1px solid #A7F3D0; border-radius:10px; margin-bottom:24px; font-size:0.85rem; font-weight:500; color:#1a7a3a; }

    .take-block { padding:18px 22px; background:#F0FFFE; border:1px solid #B2DFDB; border-left:4px solid #3BA7A0; border-radius:8px; margin-bottom:24px; }
    .take-label { font-family:'Poppins',sans-serif; font-size:0.72rem; font-weight:600; color:#3BA7A0; letter-spacing:1px; text-transform:uppercase; margin-bottom:6px; display:flex; align-items:center; gap:6px; }
    .take-block p { font-size:0.9rem; color:#333; line-height:1.7; }

    .comp-stats { display:flex; flex-direction:column; gap:6px; margin-bottom:24px; }
    .comp-stat { display:flex; align-items:center; gap:8px; font-size:0.82rem; color:#555; }

    .section { margin-bottom:36px; }
    .section h2 { font-family:'Poppins',sans-serif; font-size:1.15rem; font-weight:600; color:#2E2E2E; margin-bottom:14px; padding-bottom:6px; border-bottom:1px solid #E4E4E7; }

    .glance-section { background:#F9FFFE; border:1px solid #D0EDEB; border-radius:12px; padding:20px; }
    .glance-section h2 { border-bottom:none; padding-bottom:0; margin-bottom:12px; }
    .glance-items { display:flex; flex-wrap:wrap; align-items:center; gap:12px; margin-bottom:12px; }
    .glance-age { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#fff; border:2px solid #3BA7A0; border-radius:20px; font-size:0.85rem; font-weight:600; color:#2d8a84; }
    .price-signal { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; background:#fff; border:1px solid #E4E4E7; border-radius:20px; font-size:0.85rem; color:#555; }
    .tags { display:flex; flex-wrap:wrap; gap:6px; }
    .tag { display:inline-block; padding:5px 12px; background:#fff; border:1px solid #E4E4E7; border-radius:16px; font-size:0.78rem; color:#555; }

    .expect-section p { font-size:0.88rem; color:#444; line-height:1.8; }

    .fit-section { background:#FAFCFF; border:1px solid #D6E4F0; border-radius:12px; padding:20px; }
    .fit-section h2 { border-bottom:none; padding-bottom:0; margin-bottom:8px; }
    .fit-intro { font-size:0.82rem; color:#6A6A6A; margin-bottom:12px; }
    .fit-list { list-style:none; padding:0; }
    .fit-list li { position:relative; padding:8px 0 8px 28px; font-size:0.85rem; color:#333; border-bottom:1px solid #EEF2F7; }
    .fit-list li:last-child { border-bottom:none; }
    .fit-list li::before { content:''; position:absolute; left:0; top:11px; width:18px; height:18px; background:#E8F5E9; border-radius:50%; }
    .fit-list li::after { content:''; position:absolute; left:5px; top:15px; width:8px; height:5px; border-left:2px solid #4CAF50; border-bottom:2px solid #4CAF50; transform:rotate(-45deg); }

    .hours-grid { display:flex; flex-direction:column; background:#fff; border-radius:10px; border:1px solid #E4E4E7; overflow:hidden; }
    .hours-row { display:flex; justify-content:space-between; padding:9px 16px; font-size:0.82rem; border-bottom:1px solid #F5F5F5; }
    .hours-row:last-child { border-bottom:none; }
    .hours-day { font-weight:500; color:#2E2E2E; }
    .hours-time { color:#6A6A6A; }

    .reviews { display:flex; flex-direction:column; gap:14px; }
    .review { padding:18px 22px; background:#fff; border-radius:10px; border:1px solid #E4E4E7; border-left:3px solid #3BA7A0; }
    .review p { font-size:0.88rem; color:#555; line-height:1.7; font-style:italic; }

    .map-wrap { border-radius:10px; overflow:hidden; border:1px solid #E4E4E7; }

    .related { margin-top:40px; padding-top:28px; border-top:2px solid #E4E4E7; }
    .related-card { display:flex; align-items:center; gap:14px; padding:12px 0; border-bottom:1px solid #F0F0F0; text-decoration:none; color:#2E2E2E; transition:all 0.15s; }
    .related-card:last-child { border-bottom:none; }
    .related-card:hover { padding-left:6px; }
    .related-img { width:52px; height:52px; border-radius:8px; object-fit:cover; flex-shrink:0; }
    .related-placeholder { background:linear-gradient(135deg,#3BA7A0,#2d8a84); display:flex; align-items:center; justify-content:center; font-family:'Poppins',sans-serif; font-size:1rem; font-weight:600; color:rgba(255,255,255,0.6); width:52px; height:52px; border-radius:8px; }
    .related-name { font-family:'Poppins',sans-serif; font-size:0.88rem; font-weight:500; }
    .related-meta { font-size:0.75rem; color:#6A6A6A; margin-top:1px; }
    .related-tags { display:flex; flex-wrap:wrap; gap:4px; margin-top:4px; }
    .rtag { font-size:0.68rem; padding:2px 8px; background:#F5F5F5; border-radius:10px; color:#666; }
    .rtag-age { background:#E8F5F4; color:#2d8a84; font-weight:500; }

    .page-meta { display:flex; align-items:center; justify-content:center; gap:16px; padding:20px 24px; margin-top:40px; border-top:1px solid #E4E4E7; font-size:0.75rem; color:#999; flex-wrap:wrap; }
    .meta-link { color:#6A6A6A; text-decoration:none; border-bottom:1px dashed #CCC; }
    .meta-link:hover { color:#3BA7A0; border-color:#3BA7A0; }

    .footer { padding:20px; border-top:1px solid #E4E4E7; text-align:center; font-size:0.72rem; color:#6A6A6A; background:#fff; }

    @media (max-width:600px) {
      h1 { font-size:1.4rem; }
      .quick-actions { flex-direction:column; }
      .quick-btn { justify-content:center; }
      .hero-img { max-height:240px; }
      .hero-placeholder { height:160px; }
      .glance-items { flex-direction:column; align-items:flex-start; }
    }
  </style>
</head>
<body>
  <nav class="nav">
    <div class="nav-inner">
      <a href="/" class="logo">KidCompass</a>
      <div class="nav-actions">
        <a href="/" class="nav-link">Browse</a>
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
    <p class="subtitle">${escHtml(f.address || (f.city || 'Plano') + ', TX')}</p>

    ${ratingHtml}

    <div class="quick-actions">
      ${f.website ? `<a class="quick-btn quick-btn-primary" href="${escHtml(f.website)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>Website</a>` : ''}
      ${f.phone ? `<a class="quick-btn quick-btn-outline" href="tel:${escHtml(f.phone.replace(/[^+\d]/g, ''))}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>Call</a>` : ''}
      <a class="quick-btn quick-btn-outline" href="${mapsUrl(f.address, f.name, f.city)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>Directions</a>
    </div>

    ${trialHtml}
    ${takeHtml}
    ${compHtml}
    ${glanceHtml}
    ${expectHtml}
    ${fitHtml}
    ${reviewsHtml}
    ${hoursHtml}
    ${mapHtml}
    ${relatedHtml}
  </div>

  <div class="page-meta">
    ${f.scraped_at ? `<span>Last verified: ${new Date(f.scraped_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>` : ''}
    <a href="mailto:hello@kidcompass.com?subject=Edit suggestion for ${encodeURIComponent(f.name)}&body=Business: ${encodeURIComponent(f.name)}%0AWhat needs updating:%0A" class="meta-link">Suggest an edit</a>
    <button onclick="sharePage()" style="background:none;border:none;color:#6A6A6A;font-size:0.75rem;cursor:pointer;text-decoration:underline;padding:0;">Share this page</button>
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
          alert('Link copied to clipboard!');
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
