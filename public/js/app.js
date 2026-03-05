let allBusinesses = [];
let currentCity = null;
let currentCategory = null;
let searchQuery = '';

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

  // Home
  if (path === '/' || path === '') {
    renderHome(app);
    return;
  }

  // City page: /plano or /frisco
  const cityMatch = path.match(/^\/(plano|frisco)\/?$/);
  if (cityMatch) {
    currentCity = cityMatch[1];
    currentCategory = null;
    renderCityPage(app, currentCity);
    return;
  }

  // Category page: /plano/tutoring-learning-centers
  const catMatch = path.match(/^\/(plano|frisco)\/([a-z0-9-]+)\/?$/);
  if (catMatch) {
    currentCity = catMatch[1];
    currentCategory = catMatch[2];
    renderCategoryPage(app, currentCity, currentCategory);
    return;
  }

  // Fallback to home
  renderHome(app);
}

function renderHome(app) {
  const featured = allBusinesses.filter(b => b.rating >= 4.5).slice(0, 6);

  app.innerHTML = `
    <div class="hero">
      <h1>Find the Best for Your Kids</h1>
      <p>Smart choices for busy parents in Plano & Frisco, TX</p>
      <div class="search-box">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>
        </svg>
        <input type="text" id="search-input" placeholder="Search tutoring, camps, dentists..." autocomplete="off">
      </div>
      <div class="cat-shortcuts">
        ${CATEGORIES.map(c => `<a href="/plano/${c.slug}" class="cat-shortcut">${c.name}</a>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-header">
        <h2>Browse Categories</h2>
      </div>
      <div class="cat-grid">
        ${CATEGORIES.map(c => {
          const count = allBusinesses.filter(b => b.category === c.name).length;
          return `
          <a href="/plano/${c.slug}" class="cat-card">
            <div class="cat-card-icon">${getCategoryIcon(c.icon)}</div>
            <h3>${c.name}</h3>
            <p>${count} listings in Plano & Frisco</p>
          </a>`;
        }).join('')}
      </div>
    </div>

    ${featured.length ? `
    <div class="section">
      <div class="section-header">
        <h2>Top Rated</h2>
      </div>
      <div class="biz-grid">
        ${featured.map(renderBizCard).join('')}
      </div>
    </div>` : ''}

    <div class="section">
      <div class="subscribe-section">
        <h2>Get Weekly Updates</h2>
        <p>Kid-friendly picks delivered to your inbox every week.</p>
        <form class="subscribe-form" id="subscribe-form">
          <input type="email" name="email" placeholder="Your email" required>
          <button type="submit">Subscribe</button>
        </form>
        <p id="subscribe-msg" style="margin-top:12px;display:none;"></p>
      </div>
    </div>
  `;

  // Search handler
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

  // Subscribe handler
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
        ${CATEGORIES.map(c => {
          const count = businesses.filter(b => b.category === c.name).length;
          return `
          <a href="/${citySlug}/${c.slug}" class="cat-card">
            <div class="cat-card-icon">${getCategoryIcon(c.icon)}</div>
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

  // Filter by city if not showing both
  const cityFiltered = businesses.filter(b => b.city.toLowerCase() === citySlug);

  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / <a href="/${citySlug}">${cityName}</a> / ${catName}</div>
        <h1>${catName} in ${cityName}</h1>
        <p>${cityFiltered.length} listings found</p>
      </div>
    </div>
    <div class="section">
      <div class="filters-bar">
        <select class="filter-select" id="filter-city">
          <option value="${citySlug}">${cityName}</option>
          <option value="all">All Cities</option>
          ${CITIES.filter(c => c.slug !== citySlug).map(c => `<option value="${c.slug}">${c.name}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-sort">
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
      <div class="biz-grid" id="results-grid">
        ${cityFiltered.length ? cityFiltered.map(renderBizCard).join('') :
          '<div class="empty-state"><h3>No listings yet</h3><p>Check back soon!</p></div>'}
      </div>
    </div>
  `;

  // Filter handlers
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

function renderSearchResults(results) {
  const section = document.querySelector('.section:nth-child(2)');
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
  const catObj = CATEGORIES.find(c => c.name === biz.category);
  const catSlug = catObj ? catObj.slug : '';

  return `
    <a href="/go/${biz.id}" class="biz-card">
      ${biz.image_url ?
        `<img class="biz-card-img" src="${escHtml(biz.image_url)}" alt="${escHtml(biz.name)}" loading="lazy">` :
        `<div class="biz-card-placeholder">${(biz.name || '?')[0]}</div>`}
      <div class="biz-card-body">
        <div class="biz-card-cat">${escHtml(biz.category)}</div>
        <div class="biz-card-name">${escHtml(biz.name)}</div>
        ${biz.rating ? `
          <div class="biz-card-rating">
            ${renderStars(biz.rating)}
            <span>${biz.rating}</span>
            ${biz.review_count ? `<span>(${biz.review_count})</span>` : ''}
          </div>` : ''}
        <div class="biz-card-location">${escHtml(biz.city)}${biz.price_range ? ' — ' + escHtml(biz.price_range) : ''}</div>
        <span class="biz-card-cta">View Details</span>
      </div>
    </a>
  `;
}

function getCategoryIcon(icon) {
  const icons = {
    'book-open': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
    'activity': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    'gift': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
    'sun': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>',
    'heart': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>',
    'home': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    'utensils': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><line x1="7" y1="2" x2="7" y2="22"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>',
    'scissors': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>'
  };
  return icons[icon] || icons['activity'];
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
    msg.textContent = data.message || 'Subscribed!';
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
