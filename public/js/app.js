let allBusinesses = [];
let currentCity = null;
let currentCategory = null;
let searchQuery = '';

// Unsplash hero image — happy diverse kids playing
const HERO_IMG = 'https://images.unsplash.com/photo-1587654780293-f32e19c5e93a?w=1400&q=80&auto=format';

// Category card colors
const CAT_COLORS = ['teal', 'coral', 'golden', 'purple', 'sky', 'teal', 'coral', 'golden'];
const CAT_EMOJIS = {
  'Tutoring & Learning Centers': '&#x1F4DA;',
  'Kids Activities & Classes': '&#x1F3A8;',
  'Birthday Party Venues': '&#x1F382;',
  'Summer Camps & After School': '&#x2600;&#xFE0F;',
  'Pediatric Dentists & Doctors': '&#x1F9D1;&#x200D;&#x2695;&#xFE0F;',
  'Daycares & Preschools': '&#x1F3E0;',
  'Family-Friendly Restaurants': '&#x1F37D;&#xFE0F;',
  'Kids Haircuts & Clothing': '&#x2702;&#xFE0F;'
};

async function loadData() {
  try {
    const res = await fetch('/businesses.json');
    const data = await res.json();
    allBusinesses = data.businesses || [];
  } catch (e) {
    allBusinesses = [];
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

  const catMatch = path.match(/^\/(plano|frisco)\/([a-z0-9-]+)\/?$/);
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
          const emoji = CAT_EMOJIS[c.name] || '&#x2B50;';
          return `
          <a href="/plano/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${emoji}</div>
            <h3>${c.name}</h3>
            <p>${count} listings in Plano & Frisco</p>
          </a>`;
        }).join('')}
      </div>
    </div>

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
          const emoji = CAT_EMOJIS[c.name] || '&#x2B50;';
          return `
          <a href="/${citySlug}/${c.slug}" class="cat-card" data-color="${color}">
            <div class="cat-card-icon">${emoji}</div>
            <h3>${c.name}</h3>
            <p>${count} listings</p>
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
  const city = cityFromSlug(citySlug);
  const cat = categoryFromSlug(catSlug);
  const cityName = city ? city.name : citySlug;
  const catName = cat ? cat.name : catSlug;

  let businesses = allBusinesses.filter(b => b.category === catName);

  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / <a href="/${citySlug}">${cityName}</a> / ${catName}</div>
        <h1>${catName}</h1>
        <p>${businesses.length} listings in Plano & Frisco</p>
      </div>
    </div>
    <div class="section">
      <div class="filters-bar">
        <select class="filter-select" id="filter-city">
          <option value="all">All Cities</option>
          ${CITIES.map(c => `<option value="${c.slug}"${c.slug === citySlug ? ' selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-sort">
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
      <div class="biz-grid" id="results-grid">
        ${businesses.length ? businesses.map(renderBizCard).join('') :
          '<div class="empty-state"><h3>No listings yet</h3><p>Check back soon!</p></div>'}
      </div>
    </div>
  `;

  const filterCity = document.getElementById('filter-city');
  const filterSort = document.getElementById('filter-sort');

  function applyFilters() {
    let filtered = businesses;
    const cityVal = filterCity.value;
    if (cityVal !== 'all') {
      filtered = filtered.filter(b => b.city.toLowerCase() === cityVal);
    }
    const sortVal = filterSort.value;
    if (sortVal === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortVal === 'reviews') filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    if (sortVal === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

    document.getElementById('results-grid').innerHTML = filtered.length ?
      filtered.map(renderBizCard).join('') :
      '<div class="empty-state"><h3>No listings found</h3><p>Try a different filter.</p></div>';
  }

  filterCity.addEventListener('change', applyFilters);
  filterSort.addEventListener('change', applyFilters);
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
  return `
    <a href="/go/${biz.id}" class="biz-card">
      ${biz.image_url ?
        `<img class="biz-card-img" src="${escHtml(biz.image_url)}" alt="${escHtml(biz.name)}" loading="lazy">` :
        `<div class="biz-card-placeholder">${getCategoryEmoji(biz.category)}</div>`}
      <div class="biz-card-body">
        <div class="biz-card-cat">${escHtml(biz.category)}</div>
        <div class="biz-card-name">${escHtml(biz.name)}</div>
        ${biz.rating ? `
          <div class="biz-card-rating">
            ${renderStars(biz.rating)}
            <span>${biz.rating}</span>
            ${biz.review_count ? `<span>(${biz.review_count})</span>` : ''}
          </div>` : ''}
        <div class="biz-card-location">${escHtml(biz.city)}${biz.address ? ', TX' : ''}${biz.price_range ? ' — ' + escHtml(biz.price_range) : ''}</div>
        <span class="biz-card-cta">View Details</span>
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
