const CATEGORIES = [
  { name: 'Tutoring & Learning Centers', slug: 'tutoring-learning-centers', icon: 'book-open' },
  { name: 'Kids Activities & Classes', slug: 'kids-activities-classes', icon: 'activity' },
  { name: 'Birthday Party Venues', slug: 'birthday-party-venues', icon: 'gift' },
  { name: 'Summer Camps & After School', slug: 'summer-camps-after-school', icon: 'sun' },
  { name: 'Pediatric Dentists & Doctors', slug: 'pediatric-dentists-doctors', icon: 'heart' },
  { name: 'Daycares & Preschools', slug: 'daycares-preschools', icon: 'home' },
  { name: 'Family-Friendly Restaurants', slug: 'family-friendly-restaurants', icon: 'utensils' },
  { name: 'Kids Haircuts & Clothing', slug: 'kids-haircuts-clothing', icon: 'scissors' }
];

const CITIES = [
  { name: 'Plano', slug: 'plano', state: 'TX' },
  { name: 'Frisco', slug: 'frisco', state: 'TX' },
  { name: 'Baltimore', slug: 'baltimore', state: 'MD', neighborhoods: ['Howard County', 'Baltimore County', 'Anne Arundel County', 'Harford County'] }
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function categoryFromSlug(slug) {
  return CATEGORIES.find(c => c.slug === slug);
}

function cityFromSlug(slug) {
  return CITIES.find(c => c.slug === slug);
}

function renderStars(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.3 ? 1 : 0;
  const empty = 5 - full - half;
  return '<span class="stars">' +
    '<svg width="14" height="14" viewBox="0 0 24 24" fill="#E8B872"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>'.repeat(full) +
    (half ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="#E8B872" opacity="0.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>' : '') +
    '</span>';
}

function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
