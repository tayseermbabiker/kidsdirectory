let allBusinesses = [];
let allNews = [];
let currentCity = null;
let currentCategory = null;
let searchQuery = '';

// Unsplash hero image — happy diverse kids playing
const HERO_IMG = 'https://images.unsplash.com/photo-1587654780293-f32e19c5e93a?w=1400&q=80&auto=format';

// Category card colors
const CAT_COLORS = ['teal', 'coral', 'golden', 'purple', 'sky', 'teal', 'coral', 'golden'];
const CAT_SVGS = {
  'Tutoring & Learning Centers': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`,
  'Kids Activities & Classes': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v7"/><path d="m8.5 16 3.5-2 3.5 2"/><path d="M5 20h14"/><path d="m7 9 5 3 5-3"/></svg>`,
  'Birthday Party Venues': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2c0 2-2 4-2 4h4s-2-2-2-4z"/><path d="M6 8h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V10a2 2 0 0 1 2-2z"/><line x1="12" y1="8" x2="12" y2="22"/><line x1="4" y1="15" x2="20" y2="15"/></svg>`,
  'Summer Camps & After School': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  'Pediatric Dentists & Doctors': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
  'Daycares & Preschools': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  'Family-Friendly Restaurants': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>`,
  'Kids Haircuts & Clothing': `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`
};

const CAT_FALLBACK_IMGS = {
  'Tutoring & Learning Centers':  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=600&q=75&auto=format&fit=crop',
  'Kids Activities & Classes':    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=600&q=75&auto=format&fit=crop',
  'Birthday Party Venues':        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&q=75&auto=format&fit=crop',
  'Summer Camps & After School':  'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=600&q=75&auto=format&fit=crop',
  'Pediatric Dentists & Doctors': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=600&q=75&auto=format&fit=crop',
  'Daycares & Preschools':        'https://images.unsplash.com/photo-1587691592099-24045742c181?w=600&q=75&auto=format&fit=crop',
  'Family-Friendly Restaurants':  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=75&auto=format&fit=crop',
  'Kids Haircuts & Clothing':     'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=600&q=75&auto=format&fit=crop',
};

const CAT_HERO_IMGS = {
  'Tutoring & Learning Centers':  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1400&q=70&auto=format&fit=crop',
  'Kids Activities & Classes':    'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=70&auto=format&fit=crop',
  'Birthday Party Venues':        'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1400&q=70&auto=format&fit=crop',
  'Summer Camps & After School':  'https://images.unsplash.com/photo-1526976668912-1a811878dd37?w=1400&q=70&auto=format&fit=crop',
  'Pediatric Dentists & Doctors': 'https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=1400&q=70&auto=format&fit=crop',
  'Daycares & Preschools':        'https://images.unsplash.com/photo-1587691592099-24045742c181?w=1400&q=70&auto=format&fit=crop',
  'Family-Friendly Restaurants':  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=70&auto=format&fit=crop',
  'Kids Haircuts & Clothing':     'https://images.unsplash.com/photo-1622290291468-a28f7a7dc6a8?w=1400&q=70&auto=format&fit=crop',
};

async function loadData() {
  try {
    const [bizRes, newsRes] = await Promise.all([
      fetch('/businesses.json'),
      fetch('/news.json')
    ]);
    const bizData = await bizRes.json();
    allBusinesses = bizData.businesses || [];
    try {
      const newsData = await newsRes.json();
      allNews = (newsData.news || []).filter(n => n.title.length > 15 && n.url);
    } catch(e) { allNews = []; }
  } catch (e) {
    allBusinesses = [];
    allNews = [];
  }
  route();
}

function route() {
  const path = window.location.pathname;
  const app = document.getElementById('app');

  if (path === '/' || path === '') { renderHome(app); return; }

  const cityMatch = path.match(/^\/(plano|frisco)\/?$/);
  if (cityMatch) {
    currentCity = cityMatch[1];
    currentCategory = null;
    renderCityPage(app, currentCity);
    return;
  }

  const catMatch = path.match(/^\/(plano|frisco|all)\/([a-z0-9-]+)\/?$/);
  if (catMatch) {
    currentCity = catMatch[1];
    currentCategory = catMatch[2];
    renderCategoryPage(app, currentCity, currentCategory);
    return;
  }

  if (path === '/saved') { renderSavedPage(app); return; }

  renderHome(app);
}

function getSavedCount() {
  try { return JSON.parse(localStorage.getItem('kc_saved') || '[]').length; } catch(e) { return 0; }
}

function renderHome(app) {
  const featured = allBusinesses
    .filter(b => b.rating >= 4.5 && b.image_url)
    .sort((a, b) => (b.review_count || 0) - (a.review_count || 0))
    .slice(0, 6);

  const totalCount = allBusinesses.length;
  const catCount = CATEGORIES.length;
  const savedCount = getSavedCount();

  app.innerHTML = `
    <div class="hero">
      <div class="hero-bg" style="background-image:url('${HERO_IMG}')"></div>
      <div class="hero-content">
        <h1>Discover the best places for your <em>little ones</em></h1>
        <p>Trusted by parents in Plano & Frisco, TX</p>
        <div class="search-box">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
          </svg>
          <input type="text" id="search-input" placeholder="Search tutoring, swim lessons, party venues..." autocomplete="off">
        </div>
      </div>
    </div>

    <div class="stats-bar">
      <div class="stat"><div class="stat-num">${totalCount}+</div><div class="stat-label">Verified Listings</div></div>
      <div class="stat"><div class="stat-num">${catCount}</div><div class="stat-label">Categories</div></div>
      <div class="stat"><div class="stat-num">2</div><div class="stat-label">Cities</div></div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Browse by Category</h2>
      </div>
      <div class="cat-grid">
        ${CATEGORIES.map((c, i) => {
          const count = allBusinesses.filter(b => b.category === c.name).length;
          const color = CAT_COLORS[i % CAT_COLORS.length];
          const icon = CAT_SVGS[c.name] || '';
          return `
          <a href="/all/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${icon}</div>
            <div class="cat-card-text">
              <h3>${c.name}</h3>
              <p>${count} listings in Plano & Frisco</p>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>

    ${allNews.length ? `
    <div class="section">
      <div class="section-header">
        <h2>Local Parent News</h2>
      </div>
      <div class="news-carousel" id="news-carousel">
        <button class="news-carousel-btn news-carousel-btn--left" id="news-prev" aria-label="Previous">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div class="news-carousel-track" id="news-track">
          ${allNews.slice(0, 12).map(n => {
            const catIcon = getNewsCatIcon(n.category);
            const date = n.published_at ? formatNewsDate(n.published_at) : '';
            return `
          <a href="${escHtml(n.url)}" target="_blank" rel="noopener" class="news-card">
            <div class="news-card-cat"><span class="news-cat-dot" data-cat="${escHtml(n.category)}"></span>${escHtml(n.category)}</div>
            <h3 class="news-card-title">${escHtml(n.title)}</h3>
            ${n.snippet ? `<p class="news-card-snippet">${escHtml(n.snippet.substring(0, 100))}${n.snippet.length > 100 ? '...' : ''}</p>` : ''}
            <div class="news-card-meta">
              <span class="news-card-source">${escHtml(n.source)}</span>
              ${date ? `<span class="news-card-date">${date}</span>` : ''}
            </div>
          </a>`;
          }).join('')}
        </div>
        <button class="news-carousel-btn news-carousel-btn--right" id="news-next" aria-label="Next">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>
        </button>
      </div>
    </div>` : ''}

    ${featured.length ? `
    <div class="section">
      <div class="section-header">
        <h2>Top Rated by Parents</h2>
      </div>
      <div class="biz-grid">
        ${featured.map(renderBizCard).join('')}
      </div>
    </div>` : ''}

    <div class="section">
      <div class="subscribe-section">
        <h2>Join Plano & Frisco Parents</h2>
        <p>Get our weekly picks — hidden gems, new openings, and things to do with kids this weekend.</p>
        <form class="subscribe-form" id="subscribe-form">
          <input type="email" name="email" placeholder="Your email address" required>
          <button type="submit">Count Me In</button>
        </form>
        <p id="subscribe-msg" style="margin-top:12px;display:none;"></p>
      </div>
    </div>
  `;

  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      if (searchQuery.length >= 2) {
        const results = allBusinesses.filter(b =>
          b.name.toLowerCase().includes(searchQuery) ||
          b.category.toLowerCase().includes(searchQuery) ||
          (b.description || '').toLowerCase().includes(searchQuery)
        ).slice(0, 12);
        renderSearchResults(results);
      }
    });
  }

  const form = document.getElementById('subscribe-form');
  if (form) form.addEventListener('submit', handleSubscribe);

  initNewsCarousel();
}

function renderCityPage(app, citySlug) {
  const city = cityFromSlug(citySlug);
  const cityName = city ? city.name : citySlug;
  const businesses = allBusinesses.filter(b => b.city.toLowerCase() === citySlug);

  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / ${cityName}</div>
        <h1>Kids Services in ${cityName}, TX</h1>
        <p>${businesses.length} listings across all categories</p>
      </div>
    </div>
    <div class="section">
      <div class="cat-grid">
        ${CATEGORIES.map((c, i) => {
          const count = businesses.filter(b => b.category === c.name).length;
          const color = CAT_COLORS[i % CAT_COLORS.length];
          const icon = CAT_SVGS[c.name] || '';
          return `
          <a href="/${citySlug}/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${icon}</div>
            <div class="cat-card-text">
              <h3>${c.name}</h3>
              <p>${count} listings</p>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>
    <div class="section">
      <div class="section-header">
        <h2>All Listings in ${cityName}</h2>
      </div>
      <div class="biz-grid">
        ${businesses.length ? businesses.map(renderBizCard).join('') :
          '<div class="empty-state"><h3>No listings yet</h3><p>Check back soon!</p></div>'}
      </div>
    </div>
  `;
}

function renderCategoryPage(app, citySlug, catSlug) {
  const cat = categoryFromSlug(catSlug);
  const catName = cat ? cat.name : catSlug;
  const isAllCities = citySlug === 'all';
  const city = isAllCities ? null : cityFromSlug(citySlug);
  const cityName = isAllCities ? 'Plano & Frisco' : (city ? city.name : citySlug);
  const breadcrumbCity = isAllCities ? 'All Cities' : cityName;

  const allInCategory = allBusinesses.filter(b => b.category === catName);
  const initialCity = isAllCities ? 'all' : citySlug;

  const heroImg = CAT_HERO_IMGS[catName] || '';

  app.innerHTML = `
    ${heroImg ? `
    <div class="cat-hero">
      <div class="cat-hero-bg" style="background-image:url('${heroImg}')"></div>
      <div class="cat-hero-content">
        <div class="breadcrumb breadcrumb--light"><a href="/">Home</a><span>/</span>${breadcrumbCity}<span>/</span>${catName}</div>
        <h1>${catName}</h1>
        <p id="results-count">${allInCategory.length} listings in ${cityName}</p>
      </div>
    </div>` : `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / ${breadcrumbCity} / ${catName}</div>
        <h1>${catName}</h1>
        <p id="results-count">${allInCategory.length} listings in ${cityName}</p>
      </div>
    </div>`}
    <div class="section">
      <div class="filters-bar">
        <select class="filter-select" id="filter-city">
          <option value="all"${isAllCities ? ' selected' : ''}>All Cities</option>
          ${CITIES.map(c => `<option value="${c.slug}"${c.slug === citySlug ? ' selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-sort">
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
      <div class="biz-grid" id="results-grid"></div>
    </div>
  `;

  const filterCity = document.getElementById('filter-city');
  const filterSort = document.getElementById('filter-sort');

  function applyFilters() {
    let filtered = allInCategory;
    const cityVal = filterCity.value;
    if (cityVal !== 'all') {
      filtered = filtered.filter(b => b.city.toLowerCase() === cityVal);
    }
    const sortVal = filterSort.value;
    filtered = [...filtered];
    if (sortVal === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortVal === 'reviews') filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    if (sortVal === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `${filtered.length} listings in ${cityVal === 'all' ? 'Plano & Frisco' : (cityFromSlug(cityVal) || {}).name || cityVal}`;

    document.getElementById('results-grid').innerHTML = filtered.length ?
      filtered.map(renderBizCard).join('') :
      '<div class="empty-state"><h3>No listings found</h3><p>Try a different filter.</p></div>';
  }

  filterCity.addEventListener('change', applyFilters);
  filterSort.addEventListener('change', applyFilters);
  applyFilters();
}

function renderSavedPage(app) {
  let savedIds = [];
  try { savedIds = JSON.parse(localStorage.getItem('kc_saved') || '[]'); } catch(e) {}
  const saved = allBusinesses.filter(b => savedIds.includes(b.id));

  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / Saved</div>
        <h1>Your Saved Places</h1>
        <p>${saved.length} places saved</p>
      </div>
    </div>
    <div class="section">
      <div class="biz-grid">
        ${saved.length ? saved.map(renderBizCard).join('') :
          '<div class="empty-state"><h3>No saved places yet</h3><p>Browse listings and tap the bookmark icon to save places for later.</p></div>'}
      </div>
    </div>
  `;
}

function renderSearchResults(results) {
  const section = document.querySelector('.section:nth-child(3)');
  if (!section) return;
  section.innerHTML = `
    <div class="section-header">
      <h2>Search Results (${results.length})</h2>
      <a href="/" class="section-link" onclick="location.reload()">Clear</a>
    </div>
    <div class="biz-grid">
      ${results.length ? results.map(renderBizCard).join('') :
        '<div class="empty-state"><h3>No results</h3><p>Try a different search term.</p></div>'}
    </div>
  `;
}

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
  return `
    <a href="/go/${biz.id}" class="biz-card">
      <div class="biz-card-img-wrap">
        <img class="biz-card-img" src="${escHtml(imgSrc)}" alt="${escHtml(biz.name)}" loading="lazy">
        ${ratingBadge}
        <div class="biz-card-cat-pill">${escHtml(biz.category)}</div>
      </div>
      <div class="biz-card-body">
        <div class="biz-card-name">${escHtml(biz.name)}</div>
        ${desc ? `<p class="biz-card-desc">${escHtml(desc)}</p>` : ''}
        <div class="biz-card-meta">
          ${biz.rating ? `<div class="biz-card-rating">${renderStars(biz.rating)}<span class="biz-rating-num">${biz.rating}</span>${biz.review_count ? `<span class="biz-review-ct">(${biz.review_count.toLocaleString()})</span>` : ''}</div>` : ''}
          <span class="biz-card-city">${escHtml(biz.city)}, TX</span>
        </div>
      </div>
    </a>
  `;
}

function getCategoryEmoji(category) {
  const map = {
    'Tutoring & Learning Centers': 'ABC',
    'Kids Activities & Classes': 'PLAY',
    'Birthday Party Venues': 'YAY',
    'Summer Camps & After School': 'FUN',
    'Pediatric Dentists & Doctors': 'CARE',
    'Daycares & Preschools': 'KIDS',
    'Family-Friendly Restaurants': 'EAT',
    'Kids Haircuts & Clothing': 'STYLE'
  };
  return map[category] || 'GO';
}

async function handleSubscribe(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[name="email"]').value;
  const msg = document.getElementById('subscribe-msg');

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    const data = await res.json();
    msg.style.display = 'block';
    msg.style.color = '#3BA7A0';
    msg.textContent = data.message || "You're in! Welcome to the community.";
    form.reset();
  } catch (err) {
    msg.style.display = 'block';
    msg.style.color = '#F47C6A';
    msg.textContent = 'Something went wrong. Try again.';
  }
}

function getNewsCatIcon(cat) {
  const map = { 'Education': 'book', 'Sports & Activities': 'ball', 'New Openings': 'store', 'Health & Safety': 'heart', 'Traffic & Construction': 'road', 'Events': 'calendar', 'Community': 'people' };
  return map[cat] || 'news';
}

function formatNewsDate(dateStr) {
  try {
    const d = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const diff = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return diff + ' days ago';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch(e) { return ''; }
}

function initNewsCarousel() {
  const track = document.getElementById('news-track');
  const prev = document.getElementById('news-prev');
  const next = document.getElementById('news-next');
  if (!track || !prev || !next) return;

  let scrollPos = 0;
  const cardWidth = 300;
  const gap = 16;
  const step = cardWidth + gap;

  next.addEventListener('click', () => {
    const maxScroll = track.scrollWidth - track.clientWidth;
    scrollPos = Math.min(scrollPos + step * 2, maxScroll);
    track.scrollTo({ left: scrollPos, behavior: 'smooth' });
  });

  prev.addEventListener('click', () => {
    scrollPos = Math.max(scrollPos - step * 2, 0);
    track.scrollTo({ left: scrollPos, behavior: 'smooth' });
  });
}

// SPA navigation
window.addEventListener('popstate', route);
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('/go/')) return;
  e.preventDefault();
  window.history.pushState(null, '', href);
  route();
  window.scrollTo(0, 0);
});

// Init
loadData();
