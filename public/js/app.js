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

async function loadData() {
  try {
    const res = await fetch('/businesses.json');
    const data = await res.json();
    allBusinesses = data.businesses || [];
  } catch (e) {
    allBusinesses = [];
  }
  try {
    const res = await fetch('/news.json');
    if (res.ok) {
      const data = await res.json();
      allNews = (data.news || []).filter(n => n.title && n.title.length > 15 && n.url);
    }
  } catch (e) {
    allNews = [];
  }
  route();
}

function route() {
  const path = window.location.pathname;
  const app = document.getElementById('app');

  if (path === '/' || path === '') { renderHome(app); return; }

  const citySlugs = CITIES.map(c => c.slug).join('|');
  const cityMatch = path.match(new RegExp(`^\\/(${citySlugs})\\/?$`));
  if (cityMatch) {
    currentCity = cityMatch[1];
    currentCategory = null;
    renderCityPage(app, currentCity);
    return;
  }

  const catMatch = path.match(new RegExp(`^\\/(${citySlugs}|all)\\/([a-z0-9-]+)\\/?$`));
  if (catMatch) {
    currentCity = catMatch[1];
    currentCategory = catMatch[2];
    renderCategoryPage(app, currentCity, currentCategory);
    return;
  }

  if (path === '/saved') { renderSavedPage(app); return; }
  if (path === '/faq') { renderFaqPage(app); return; }
  if (path === '/privacy') { renderPrivacyPage(app); return; }
  if (path === '/terms') { renderTermsPage(app); return; }
  if (path === '/about') { renderAboutPage(app); return; }

  renderHome(app);
}

function getSavedCount() {
  try { return JSON.parse(localStorage.getItem('kc_saved') || '[]').length; } catch(e) { return 0; }
}

function renderHome(app) {
  const totalCount = allBusinesses.length;
  const catCount = CATEGORIES.length;
  const savedCount = getSavedCount();

  app.innerHTML = `
    <div class="hero">
      <div class="hero-bg" style="background-image:url('${HERO_IMG}')"></div>
      <div class="hero-content">
        <h1>Discover the best places for your <em>little ones</em></h1>
        <p>Trusted by parents in Plano, Frisco, and Baltimore</p>
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
      <div class="stat"><div class="stat-num">${CITIES.length}</div><div class="stat-label">Cities</div></div>
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
              <p>${count} listings</p>
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
      <div class="news-slider-wrapper">
        <div class="news-slider-track" id="news-track">
          ${[...prioritizeNews(allNews, 10), ...prioritizeNews(allNews, 10)].map(n => {
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
      </div>
    </div>` : ''}

    <div class="section">
      <div class="subscribe-section">
        <h2>Join Local Parents Who Get the Weekly Scoop</h2>
        <p>School updates, registration deadlines, new openings, and things to do with kids this weekend.</p>
        <form class="subscribe-form" id="subscribe-form">
          <input type="email" name="email" placeholder="Your email address" required>
          <div class="subscribe-cities">
            ${CITIES.map(c => `<label class="city-check"><input type="checkbox" name="city" value="${c.name}" checked> ${c.name}</label>`).join('\n            ')}
          </div>
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
  const stateAbbr = city ? city.state : 'TX';
  const businesses = allBusinesses.filter(b => b.city.toLowerCase() === citySlug || slugify(b.city) === citySlug);
  const neighborhoods = city && city.neighborhoods ? city.neighborhoods : null;
  document.title = `Best Kids Services in ${cityName}, ${stateAbbr} — Tutoring, Activities, Camps & More | KiddosCompass`;

  if (neighborhoods) {
    // Grouped layout for cities with neighborhoods (Baltimore)
    const areaCount = neighborhoods.filter(n => businesses.some(b => b.neighborhood === n)).length || neighborhoods.length;
    app.innerHTML = `
      <div class="page-header">
        <div class="page-header-inner">
          <div class="breadcrumb"><a href="/">Home</a> / ${cityName}</div>
          <h1>Kids Services in ${cityName}, ${stateAbbr}</h1>
          <p>${businesses.length} listings across ${areaCount} areas</p>
        </div>
      </div>
      ${neighborhoods.map(hood => {
        const hoodBiz = businesses.filter(b => b.neighborhood === hood);
        return `
      <div class="section">
        <div class="section-header">
          <h2>${hood}</h2>
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
              <h3>${c.name}</h3>
              <p>${count} listings</p>
            </div>
          </a>`;
          }).join('')}
        </div>
      </div>`;
      }).join('')}
    `;
  } else {
    // Simple layout for single cities (Plano, Frisco)
    app.innerHTML = `
      <div class="page-header">
        <div class="page-header-inner">
          <div class="breadcrumb"><a href="/">Home</a> / ${cityName}</div>
          <h1>Kids Services in ${cityName}, ${stateAbbr}</h1>
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
    `;
  }
}

function renderCategoryPage(app, citySlug, catSlug) {
  const cat = categoryFromSlug(catSlug);
  const catName = cat ? cat.name : catSlug;
  const isAllCities = citySlug === 'all';
  const city = isAllCities ? null : cityFromSlug(citySlug);
  const cityName = isAllCities ? 'All Cities' : (city ? city.name : citySlug);
  const breadcrumbCity = isAllCities ? 'All Cities' : cityName;

  const allInCategory = allBusinesses.filter(b => b.category === catName);
  const initialCity = isAllCities ? 'all' : citySlug;

  const heroImg = CAT_HERO_IMGS[catName] || '';
  const seoTitle = getSeoTitle(catName, cityName, city);
  document.title = `${seoTitle} | KiddosCompass`;

  app.innerHTML = `
    ${heroImg ? `
    <div class="cat-hero">
      <div class="cat-hero-bg" style="background-image:url('${heroImg}')"></div>
      <div class="cat-hero-content">
        <div class="breadcrumb breadcrumb--light"><a href="/">Home</a><span>/</span>${breadcrumbCity}<span>/</span>${catName}</div>
        <h1>${seoTitle}</h1>
        <p id="results-count">${allInCategory.length} listings in ${cityName}</p>
      </div>
    </div>` : `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / ${breadcrumbCity} / ${catName}</div>
        <h1>${seoTitle}</h1>
        <p id="results-count">${allInCategory.length} listings in ${cityName}</p>
      </div>
    </div>`}
    <div class="section">
      <div class="filters-bar">
        <select class="filter-select" id="filter-city">
          <option value="all"${isAllCities ? ' selected' : ''}>All Cities</option>
          ${CITIES.map(c => `<option value="${c.slug}"${c.slug === citySlug ? ' selected' : ''}>${c.name}</option>`).join('')}
        </select>
        <select class="filter-select" id="filter-hood" style="display:none;">
          <option value="all">All Areas</option>
        </select>
        <select class="filter-select" id="filter-sort">
          <option value="rating">Highest Rated</option>
          <option value="reviews">Most Reviews</option>
          <option value="recommended">Most Recommended</option>
          <option value="name">Name A-Z</option>
        </select>
      </div>
      <div class="biz-grid" id="results-grid"></div>
    </div>
  `;

  const filterCity = document.getElementById('filter-city');
  const filterHood = document.getElementById('filter-hood');
  const filterSort = document.getElementById('filter-sort');

  function updateHoodFilter() {
    const cityVal = filterCity.value;
    const selectedCity = cityFromSlug(cityVal);
    if (selectedCity && selectedCity.neighborhoods) {
      filterHood.innerHTML = '<option value="all">All Areas</option>' +
        selectedCity.neighborhoods.map(n => `<option value="${n}">${n}</option>`).join('');
      filterHood.style.display = '';
    } else {
      filterHood.style.display = 'none';
      filterHood.value = 'all';
    }
  }

  function applyFilters() {
    let filtered = allInCategory;
    const cityVal = filterCity.value;
    if (cityVal !== 'all') {
      filtered = filtered.filter(b => b.city.toLowerCase() === cityVal);
    }
    const hoodVal = filterHood.value;
    if (hoodVal !== 'all') {
      filtered = filtered.filter(b => b.neighborhood === hoodVal);
    }
    const sortVal = filterSort.value;
    filtered = [...filtered];
    if (sortVal === 'rating') filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    if (sortVal === 'reviews') filtered.sort((a, b) => (b.review_count || 0) - (a.review_count || 0));
    if (sortVal === 'recommended') filtered.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0));
    if (sortVal === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));

    const label = hoodVal !== 'all' ? hoodVal : (cityVal === 'all' ? 'All Cities' : (cityFromSlug(cityVal) || {}).name || cityVal);
    const countEl = document.getElementById('results-count');
    if (countEl) countEl.textContent = `${filtered.length} listings in ${label}`;

    document.getElementById('results-grid').innerHTML = filtered.length ?
      filtered.map(renderBizCard).join('') :
      '<div class="empty-state"><h3>No listings found</h3><p>Try a different filter.</p></div>';
  }

  filterCity.addEventListener('change', () => { updateHoodFilter(); applyFilters(); });
  filterHood.addEventListener('change', applyFilters);
  filterSort.addEventListener('change', applyFilters);
  updateHoodFilter();
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
  const favBadge = biz.vote_count >= 3 ? '<span class="biz-badge biz-badge--fav">Parent Favorite</span>' : '';
  return `
    <a href="/go/${biz.id}" class="biz-card">
      <div class="biz-card-img-wrap">
        <img class="biz-card-img" src="${escHtml(imgSrc)}" alt="${escHtml(biz.name)}" loading="lazy">
        ${favBadge || ratingBadge}
        <div class="biz-card-cat-pill">${escHtml(biz.category)}</div>
      </div>
      <div class="biz-card-body">
        <div class="biz-card-name">${escHtml(biz.name)}</div>
        ${desc ? `<p class="biz-card-desc">${escHtml(desc)}</p>` : ''}
        <div class="biz-card-meta">
          ${biz.rating ? `<div class="biz-card-rating">${renderStars(biz.rating)}<span class="biz-rating-num">${biz.rating}</span>${biz.review_count ? `<span class="biz-review-ct">(${biz.review_count.toLocaleString()})</span>` : ''}</div>` : ''}
          <span class="biz-card-city">${escHtml(biz.city)}, ${(cityFromSlug(slugify(biz.city)) || {}).state || 'TX'}</span>
          ${biz.vote_count ? `<span class="biz-card-votes">${biz.vote_count} rec.</span>` : ''}
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
  const cities = [...form.querySelectorAll('input[name="city"]:checked')].map(c => c.value);
  const msg = document.getElementById('subscribe-msg');

  if (cities.length === 0) {
    msg.style.display = 'block';
    msg.style.color = '#F47C6A';
    msg.textContent = 'Please select at least one city.';
    return;
  }

  try {
    const res = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, cities })
    });
    const data = await res.json();
    msg.style.display = 'block';
    msg.style.color = '#3BA7A0';
    msg.textContent = data.message || "You're in! We'll send you the best picks weekly.";
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

// Carousel shows Education, Health & Safety, Community only
// New Openings, Events, Sports & Activities go to the weekly newsletter
function prioritizeNews(news, max) {
  const CAROUSEL_CATS = ['Education', 'Health & Safety', 'Community'];
  const filtered = news.filter(n => CAROUSEL_CATS.includes(n.category));
  const now = new Date();
  const scored = filtered.map(n => {
    let recency = 0;
    if (n.published_at) {
      const days = Math.floor((now - new Date(n.published_at + 'T00:00:00')) / 86400000);
      recency = days <= 2 ? 3 : days <= 4 ? 2 : days <= 7 ? 1 : 0;
    }
    return { ...n, score: recency };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
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
  if (!track) return;

  track.addEventListener('mouseenter', () => {
    track.style.animationPlayState = 'paused';
  });
  track.addEventListener('mouseleave', () => {
    track.style.animationPlayState = 'running';
  });

  // Touch support
  track.addEventListener('touchstart', () => {
    track.style.animationPlayState = 'paused';
  });
  track.addEventListener('touchend', () => {
    track.style.animationPlayState = 'running';
  });

  // Respect reduced motion preference
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    track.style.animation = 'none';
    track.style.overflowX = 'auto';
  }
}

// SPA navigation
window.addEventListener('popstate', route);
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href]');
  if (!link) return;
  const href = link.getAttribute('href');
  if (!href || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('/go/')) return;
  // Sign Up button — go home then scroll to subscribe form
  if (href === '/#subscribe') {
    e.preventDefault();
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
      route();
    }
    setTimeout(() => {
      const form = document.getElementById('subscribe-form');
      if (form) form.scrollIntoView({ behavior: 'smooth' });
    }, 100);
    return;
  }
  e.preventDefault();
  window.history.pushState(null, '', href);
  route();
  window.scrollTo(0, 0);
});

// === SEO HELPERS ===

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

// === FAQ PAGE ===

const FAQ_DATA = {
  'Tutoring & Learning Centers': [
    { q: 'What are the best tutoring centers for kids in Plano TX?', a: 'Top-rated tutoring centers in Plano include Kumon, Mathnasium, Sylvan Learning, and C2 Education. Browse our full list with ratings, reviews, and hours to find the best fit for your child.' },
    { q: 'Kumon vs Mathnasium — which is better for my child?', a: 'Kumon focuses on self-paced worksheets building foundational math and reading skills. Mathnasium uses customized learning plans with in-center instruction. Kumon is better for building discipline; Mathnasium is better for kids who need more hands-on help.' },
    { q: 'How much does tutoring cost in Columbia MD?', a: 'Tutoring costs in Howard County typically range from $150-$300/month for centers like Kumon, or $40-$80/hour for private tutors. Check individual listings for current pricing.' },
    { q: 'What age should kids start tutoring?', a: 'Most learning centers accept kids as young as 3-4 for early reading and math programs. The best time to start depends on your child — if they are struggling or need enrichment, earlier is better.' },
    { q: 'Are there tutoring centers in Towson MD for elementary kids?', a: 'Yes! Towson and Baltimore County have several highly-rated tutoring centers including Kumon, Huntington Learning Center, and local options. See our Baltimore County listings for full details.' }
  ],
  'Kids Activities & Classes': [
    { q: 'What are the best swim lessons for toddlers in Plano TX?', a: 'Popular swim schools in Plano include Emler Swim School, Goldfish Swim School, and SafeSplash. Most accept kids from 4 months old. Look for small class sizes and warm water pools.' },
    { q: 'What age should kids start martial arts?', a: 'Most martial arts studios offer classes for kids as young as 3-4 years old. Starting early helps with discipline, coordination, and confidence. Many studios offer a free trial class.' },
    { q: 'Where can my kids take dance classes in Annapolis MD?', a: 'Anne Arundel County has several dance studios offering ballet, jazz, hip-hop, and tap for kids. Check our Anne Arundel County listings for studios with ratings and parent reviews.' },
    { q: 'What indoor activities are there for kids in Howard County MD?', a: 'Howard County offers indoor playgrounds, trampoline parks (Sky Zone Columbia), gymnastics centers, art studios, and swimming. Great for rainy days or hot summers.' },
    { q: 'Are there kids coding or robotics classes near Frisco TX?', a: 'Yes! Frisco has several STEM-focused programs including Code Ninjas, Snapology, and various robotics clubs. These are great for kids interested in technology and engineering.' }
  ],
  'Birthday Party Venues': [
    { q: 'What are the best birthday party places for kids in Plano TX?', a: 'Popular party venues in Plano include trampoline parks, bowling alleys, pottery studios, and indoor play centers. Many offer all-inclusive party packages starting around $200-$400.' },
    { q: 'How much does a kids birthday party venue cost?', a: 'Party packages typically range from $200-$500 depending on the venue, number of kids, and add-ons. Trampoline parks and play centers are usually the most affordable options.' },
    { q: 'Trampoline park vs bowling for a kids party — which is better?', a: 'Trampoline parks are better for high-energy kids ages 5-12 who want to jump and play. Bowling is better for mixed-age groups and a more relaxed party. Both usually include a party room.' },
    { q: 'Where can I host a toddler birthday party in Baltimore MD?', a: 'Great toddler party options in the Baltimore area include indoor play spaces, kids gyms (My Gym, The Little Gym), and pottery painting studios. These are safer for little ones than trampoline parks.' }
  ],
  'Summer Camps & After School': [
    { q: 'What are the best summer camps in Howard County MD?', a: 'Howard County offers excellent summer camps through Recreation & Parks, the YMCA, and private providers. Options include STEM camps, sports camps, art camps, and nature camps in Columbia and Ellicott City.' },
    { q: 'How much does summer camp cost in Plano TX?', a: 'Summer camp costs in Plano vary: city-run camps start around $150-$250/week, while specialty camps (STEM, sports, arts) can run $300-$500/week. Many offer early bird discounts.' },
    { q: 'What age do kids start summer camp?', a: 'Most day camps accept kids starting at age 5-6 (entering kindergarten). Some programs for younger kids (3-4) exist but are usually shorter days. Overnight camps typically start at age 7-8.' },
    { q: 'Are there after-school programs in Severna Park MD?', a: 'Yes! Anne Arundel County has SACC (School-Age Child Care) programs, YMCA after-school care, and various enrichment programs. Check our listings for options with ratings and reviews.' }
  ],
  'Pediatric Dentists & Doctors': [
    { q: 'When should my child first see a dentist?', a: 'The American Academy of Pediatric Dentistry recommends a first dental visit by age 1 or within 6 months of the first tooth. Early visits help prevent cavities and build comfort with dental care.' },
    { q: 'Pediatric dentist vs family dentist — which is better for kids?', a: 'Pediatric dentists complete 2-3 extra years of training specifically for children. Their offices are kid-friendly with smaller equipment. For anxious kids or those under 5, a pediatric dentist is usually the better choice.' },
    { q: 'What are the best pediatric dentists in Plano TX?', a: 'Plano has several top-rated pediatric dentists. Look for board-certified specialists with high Google ratings and parent reviews. Check our full list with ratings and contact info.' },
    { q: 'How do I choose a pediatrician in Baltimore MD?', a: 'Look for board-certified pediatricians with convenient hours, a location near your home, and good parent reviews. Many offer meet-and-greet visits before you commit.' }
  ],
  'Daycares & Preschools': [
    { q: 'How do I choose the right daycare for my toddler?', a: 'Key factors: staff-to-child ratio (ideally 1:3 for infants, 1:4 for toddlers), licensing and accreditation, cleanliness, curriculum approach, location, and hours. Always visit in person and trust your instincts.' },
    { q: 'Montessori vs traditional preschool — what is the difference?', a: 'Montessori emphasizes self-directed learning, mixed-age classrooms, and hands-on materials. Traditional preschool is more teacher-led with structured activities and same-age groups. Neither is universally better — it depends on your child.' },
    { q: 'How much does daycare cost per week in Plano TX?', a: 'Full-time daycare in Plano typically costs $200-$350/week for toddlers and $175-$300/week for preschool-age kids. Costs vary by center quality and program type.' },
    { q: 'What are the best preschools in Columbia MD?', a: 'Howard County has excellent preschool options including Montessori schools, Goddard School, Primrose School, and local programs. See our listings for ratings, reviews, and enrollment info.' },
    { q: 'Are there affordable daycares in Baltimore County MD?', a: 'Baltimore County offers a range of daycare options from home-based providers to larger centers. Maryland also offers child care subsidies for qualifying families through the Child Care Scholarship program.' }
  ],
  'Family-Friendly Restaurants': [
    { q: 'What are the best kid-friendly restaurants in Plano TX?', a: 'Plano has many family-friendly options ranging from casual chains to local favorites. Look for restaurants with kids menus, high chairs, outdoor seating, and play areas.' },
    { q: 'Where can I find family brunch spots in Towson MD?', a: 'Towson and Baltimore County have several great brunch spots including Miss Shirley\'s Cafe, Cunningham\'s, and local diners. Check our listings for hours and parent reviews.' },
    { q: 'Are there restaurants with play areas for kids near me?', a: 'Some restaurants in our listings feature indoor or outdoor play areas. Filter by your city and check individual listings for amenities and parent tips.' }
  ],
  'Kids Haircuts & Clothing': [
    { q: 'Where should I take my toddler for their first haircut?', a: 'Kids hair salons are designed for first haircuts — they have fun chairs, cartoons, and patient stylists. They are much better than regular barbershops for nervous toddlers. Check our listings for kids salons near you.' },
    { q: 'Kids salon vs regular barbershop — which is better?', a: 'Kids salons specialize in children with entertainment, kid-sized chairs, and experience with wiggly toddlers. Regular barbershops are fine for older kids (6+) who can sit still. For first haircuts, always go kids salon.' },
    { q: 'Where can I buy children\'s clothing in Frisco TX?', a: 'Frisco has both chain stores and local boutiques for kids clothing. Check our listings for specialty children\'s clothing stores with parent ratings.' }
  ]
};

function renderFaqPage(app) {
  document.title = 'FAQ — Common Questions About Kids Services | KiddosCompass';

  const faqSchema = [];
  Object.values(FAQ_DATA).forEach(faqs => {
    faqs.forEach(f => {
      faqSchema.push({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } });
    });
  });

  // Inject FAQ JSON-LD schema
  let schemaEl = document.getElementById('faq-schema');
  if (!schemaEl) {
    schemaEl = document.createElement('script');
    schemaEl.id = 'faq-schema';
    schemaEl.type = 'application/ld+json';
    document.head.appendChild(schemaEl);
  }
  schemaEl.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqSchema
  });

  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / FAQ</div>
        <h1>Frequently Asked Questions</h1>
        <p>Answers to common questions parents ask about kids services in Plano, Frisco, and Baltimore.</p>
      </div>
    </div>
    <div class="section faq-section">
      ${Object.entries(FAQ_DATA).map(([category, faqs]) => `
      <div class="faq-category">
        <h2>${category}</h2>
        ${faqs.map(f => `
        <details class="faq-item">
          <summary class="faq-question">${escHtml(f.q)}</summary>
          <div class="faq-answer"><p>${escHtml(f.a)}</p></div>
        </details>`).join('')}
      </div>`).join('')}
    </div>
  `;
}

// === LEGAL PAGES ===

function renderLegalPage(app, title, content) {
  app.innerHTML = `
    <div class="page-header">
      <div class="page-header-inner">
        <div class="breadcrumb"><a href="/">Home</a> / ${title}</div>
        <h1>${title}</h1>
      </div>
    </div>
    <div class="section" style="max-width:760px;margin:0 auto;padding:32px 24px;">
      <div class="legal-content">${content}</div>
    </div>`;
}

function renderPrivacyPage(app) {
  renderLegalPage(app, 'Privacy Policy', `
    <p><strong>Last updated:</strong> March 2026</p>
    <p>KiddosCompass operates kiddoscompass.com. This page explains how we collect, use, and protect your information.</p>

    <h2>Information We Collect</h2>
    <p><strong>Email address</strong> — only if you subscribe to our newsletter. We do not collect names, payment info, or any data from children.</p>
    <p><strong>Usage data</strong> — we track which business pages are viewed (click counts) to improve our listings. No personal information is tied to these counts.</p>

    <h2>How We Use Your Information</h2>
    <ul>
      <li>We send a weekly newsletter with curated local news and recommendations (if you subscribe)</li>
      <li>We improve our directory listings based on aggregate usage</li>
    </ul>

    <h2>What We Don't Do</h2>
    <ul>
      <li>We do not sell or share your email with third parties</li>
      <li>We do not use advertising trackers or cookies</li>
      <li>We do not collect data from children under 13</li>
    </ul>

    <h2>Third-Party Services</h2>
    <p>We use <strong>Airtable</strong> to store subscriber emails, <strong>Netlify</strong> for hosting, and <strong>Google Maps</strong> for embedded maps on business pages. Each has their own privacy policy.</p>

    <h2>Unsubscribe</h2>
    <p>Every email includes an unsubscribe link. You can also email us to request removal of your data.</p>

    <h2>Contact</h2>
    <p>Questions? Email us at <a href="mailto:hello@kiddoscompass.com">hello@kiddoscompass.com</a></p>
  `);
}

function renderTermsPage(app) {
  renderLegalPage(app, 'Terms of Service', `
    <p><strong>Last updated:</strong> March 2026</p>
    <p>By using KiddosCompass, you agree to these terms.</p>

    <h2>What KiddosCompass Is</h2>
    <p>KiddosCompass is a free directory of kids services. We curate listings from public sources (Google Maps, Yelp) and add editorial content to help parents make informed decisions.</p>

    <h2>No Endorsement</h2>
    <p>Listings on KiddosCompass are for informational purposes only. We do not endorse, guarantee, or verify any business listed. Always do your own research, visit in person, and verify credentials before enrolling your child.</p>

    <h2>Accuracy</h2>
    <p>We strive to keep information accurate and up-to-date, but business hours, pricing, and services can change. If you notice incorrect information, please <a href="mailto:hello@kiddoscompass.com">let us know</a>.</p>

    <h2>News Content</h2>
    <p>Our news section curates headlines and links from public sources. We link back to the original source for full articles. All content remains the property of its respective publishers.</p>

    <h2>User Conduct</h2>
    <p>Do not use automated tools to scrape this site or submit false information through our forms.</p>

    <h2>Limitation of Liability</h2>
    <p>KiddosCompass is provided "as is" without warranties. We are not liable for any decisions made based on information found on this site.</p>

    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:hello@kiddoscompass.com">hello@kiddoscompass.com</a></p>
  `);
}

function renderAboutPage(app) {
  renderLegalPage(app, 'About KiddosCompass', `
    <h2>For Parents, By Parents</h2>
    <p>KiddosCompass helps parents find the best services for their kids — from tutoring centers and swim classes to birthday party venues and pediatricians.</p>

    <h2>What Makes Us Different</h2>
    <ul>
      <li><strong>Curated, not cluttered</strong> — we focus on 8 categories that matter most to families</li>
      <li><strong>Editorial content</strong> — our "KiddosCompass Take" tells you what to actually expect, not just what the business says about itself</li>
      <li><strong>Local news</strong> — we surface school updates, registration deadlines, new openings, and events from local sources</li>
      <li><strong>Free forever</strong> — no ads, no promoted listings, no paywall</li>
    </ul>

    <h2>Our Cities</h2>
    <p>We currently cover <strong>Plano</strong> and <strong>Frisco</strong> in Texas, plus the <strong>Baltimore</strong> metro area in Maryland (Columbia, Towson, Catonsville, Severna Park).</p>

    <h2>Get in Touch</h2>
    <p>Have a suggestion, correction, or just want to say hi? Email us at <a href="mailto:hello@kiddoscompass.com">hello@kiddoscompass.com</a></p>
  `);
}

// === GLOBAL SEARCH ===

function initGlobalSearch() {
  const btn = document.getElementById('nav-search-btn');
  const overlay = document.getElementById('search-overlay');
  const input = document.getElementById('global-search-input');
  const closeBtn = document.getElementById('search-overlay-close');
  const resultsEl = document.getElementById('search-overlay-results');

  if (!btn || !overlay) return;

  function open() {
    overlay.classList.add('active');
    setTimeout(() => input.focus(), 100);
  }

  function close() {
    overlay.classList.remove('active');
    input.value = '';
    resultsEl.innerHTML = '';
  }

  btn.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); open(); }
  });

  input.addEventListener('input', () => {
    const q = input.value.trim().toLowerCase();
    if (q.length < 2) { resultsEl.innerHTML = ''; return; }

    // Search businesses
    const bizResults = allBusinesses.filter(b =>
      b.name.toLowerCase().includes(q) ||
      b.category.toLowerCase().includes(q) ||
      (b.description || '').toLowerCase().includes(q) ||
      (b.neighborhood || '').toLowerCase().includes(q)
    ).slice(0, 6);

    // Search FAQ
    const faqResults = [];
    if (typeof FAQ_DATA !== 'undefined') {
      Object.entries(FAQ_DATA).forEach(([cat, faqs]) => {
        faqs.forEach(f => {
          if (f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) {
            faqResults.push({ category: cat, ...f });
          }
        });
      });
    }
    const faqSlice = faqResults.slice(0, 4);

    if (bizResults.length === 0 && faqSlice.length === 0) {
      resultsEl.innerHTML = '<div class="search-empty">No results found</div>';
      return;
    }

    let html = '';

    if (bizResults.length) {
      html += '<div class="search-result-group"><div class="search-result-group-title">Businesses</div></div>';
      html += bizResults.map(b => `
        <a href="/go/${b.id}" class="search-result-item">
          <div class="search-result-icon biz-icon">${getCategoryEmoji(b.category)}</div>
          <div class="search-result-text">
            <div class="search-result-name">${escHtml(b.name)}</div>
            <div class="search-result-meta">${escHtml(b.category)} &middot; ${escHtml(b.city)}${b.rating ? ' &middot; ' + b.rating + ' stars' : ''}</div>
          </div>
        </a>`).join('');
    }

    if (faqSlice.length) {
      html += '<div class="search-result-group"><div class="search-result-group-title">FAQ</div></div>';
      html += faqSlice.map(f => `
        <a href="/faq" class="search-result-item" onclick="setTimeout(()=>{document.querySelectorAll('.faq-question').forEach(el=>{if(el.textContent.includes('${f.q.substring(0,30).replace(/'/g,"\\'")}'))el.closest('details').open=true})},200)">
          <div class="search-result-icon faq-icon">?</div>
          <div class="search-result-text">
            <div class="search-result-name">${escHtml(f.q)}</div>
            <div class="search-result-meta">${escHtml(f.category)}</div>
          </div>
        </a>`).join('');
    }

    resultsEl.innerHTML = html;
  });
}

// Init
loadData();
initGlobalSearch();
