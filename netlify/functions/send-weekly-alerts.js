const fetch = require('node-fetch');
const { Resend } = require('resend');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTS_SECRET = process.env.ALERTS_SECRET;
const SITE_URL = process.env.URL || 'https://kiddoscompass.com';

// Newsletter priority: New Openings, Events, Sports first (Education already on site)
const CAT_WEIGHT = {
  'New Openings': 6,
  'Events': 5,
  'Sports & Activities': 5,
  'Health & Safety': 3,
  'Education': 2,
  'Local Impact': 1,
  'Community': 1
};

exports.handler = async (event) => {
  // Auth check
  const key = event.queryStringParameters?.key;
  if (key !== ALERTS_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    // 1. Fetch active subscribers
    const subscribers = await fetchSubscribers();
    if (subscribers.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No active subscribers' }) };
    }

    // 2. Fetch recent news (last 7 days)
    const news = await fetchRecentNews();
    if (news.length === 0) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No recent news to send' }) };
    }

    // 3. Build date range for subject
    const monday = getNextMonday();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    // 4. Build personalized emails per subscriber (filtered by their cities)
    const resend = new Resend(RESEND_API_KEY);
    const emails = subscribers.map(sub => {
      // Filter news relevant to subscriber's cities
      const cityNews = filterNewsByCities(news, sub.cities);
      const topNews = prioritizeNews(cityNews.length >= 3 ? cityNews : news, 7);
      const cityLabel = sub.cities.join(' & ');
      const subject = `This Week in ${cityLabel} — ${fmt(monday)} to ${fmt(sunday)}`;
      return {
        from: 'KiddosCompass <weekly@kiddoscompass.com>',
        to: sub.email,
        subject,
        html: buildEmailHtml(sub, topNews, monday, sunday)
      };
    });

    // Resend batch supports up to 100 emails per call
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);
      const result = await resend.batch.send(batch);
      console.log(`Batch ${Math.floor(i / 100) + 1}: sent ${batch.length} emails`, result);
    }

    // 6. Update last_alerted_at
    const today = new Date().toISOString().split('T')[0];
    for (let i = 0; i < subscribers.length; i += 10) {
      const batch = subscribers.slice(i, i + 10);
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Subscribers`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: batch.map(s => ({
            id: s.id,
            fields: { last_alerted_at: today }
          }))
        })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Sent ${emails.length} emails with ${news.length} news items available`
      })
    };
  } catch (err) {
    console.error('Alert error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

async function fetchSubscribers() {
  const records = [];
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.set('filterByFormula', '{is_active}=TRUE()');
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Subscribers?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of (data.records || [])) {
      records.push({
        id: r.id,
        email: r.fields.email,
        first_name: r.fields.first_name || '',
        cities: (r.fields.cities || 'Plano\nFrisco').split('\n').map(s => s.trim()).filter(Boolean),
        unsubscribe_token: r.fields.unsubscribe_token || ''
      });
    }
    offset = data.offset || null;
  } while (offset);
  return records;
}

async function fetchRecentNews() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = cutoff.toISOString().split('T')[0];

  const records = [];
  let offset = null;
  do {
    const params = new URLSearchParams({ pageSize: '100' });
    params.set('filterByFormula', `IS_AFTER({published_at}, '${cutoffStr}')`);
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/News?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of (data.records || [])) {
      records.push(r.fields);
    }
    offset = data.offset || null;
  } while (offset);
  return records;
}

function filterNewsByCities(news, cities) {
  if (!cities || cities.length === 0) return news;
  const cityLower = cities.map(c => c.toLowerCase());
  return news.filter(n => {
    // Match against the city field first, then fallback to title/snippet
    const newsCity = (n.city || '').toLowerCase();
    if (cityLower.some(c => newsCity.includes(c) || c.includes(newsCity))) return true;
    const text = ((n.title || '') + ' ' + (n.snippet || '')).toLowerCase();
    return cityLower.some(c => text.includes(c));
  });
}

function prioritizeNews(news, max) {
  // Deduplicate by title (normalized)
  const seen = new Set();
  const unique = news.filter(n => {
    const key = (n.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const scored = unique.map(n => {
    const catScore = CAT_WEIGHT[n.category] || 1;
    let recency = 0;
    if (n.published_at) {
      const days = Math.floor((Date.now() - new Date(n.published_at + 'T00:00:00')) / 86400000);
      recency = days <= 2 ? 3 : days <= 4 ? 2 : days <= 7 ? 1 : 0;
    }
    return { ...n, score: catScore * 2 + recency };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, max);
}

// Clean scraped titles: remove " - Source | News" suffixes
function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[\-–|]\s*(Community Impact|Sports Illustrated|MaxPreps|ntdaily|thebanner).*$/i, '')
    .replace(/\s*[\-–|]\s*News\s*$/i, '')
    .replace(/\s*\|\s*News\s*$/i, '')
    .trim();
}

function getNextMonday() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  const monday = new Date(now);
  monday.setDate(monday.getDate() + diff);
  return monday;
}

function buildEmailHtml(subscriber, news, monday, sunday) {
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const name = subscriber.first_name || 'there';
  const cityLabel = subscriber.cities.join(', ');

  const big3 = news.slice(0, 3);
  const quickHits = news.slice(3);

  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

  const catColors = {
    'New Openings': '#E87040',
    'Events': '#7C5CFC',
    'Sports & Activities': '#2B8FD4',
    'Health & Safety': '#D44B4B',
    'Education': '#3BA7A0',
    'Community': '#6A6A6A',
    'Local Impact': '#C4841D'
  };

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">

    <div style="text-align:center;padding:20px 0 20px;">
      <div style="font-size:1.4rem;font-weight:700;color:#3BA7A0;letter-spacing:-0.5px;">KiddosCompass</div>
      <div style="font-size:0.78rem;color:#999;margin-top:4px;">${fmt(monday)} - ${fmt(sunday)}</div>
    </div>

    <div style="background:#3BA7A0;border-radius:10px;padding:20px 24px;margin-bottom:20px;color:#fff;">
      <p style="font-size:1rem;font-weight:600;margin:0;">Hey ${escHtml(name)}!</p>
      <p style="font-size:0.85rem;margin:6px 0 0;opacity:0.9;">Here's what's happening this week for families in ${escHtml(cityLabel)}.</p>
    </div>

    ${big3.map((n, i) => {
      const catColor = catColors[n.category] || '#3BA7A0';
      const title = cleanTitle(n.title);
      const city = n.city || '';
      return `
    <div style="background:#fff;border:1px solid #E4E4E7;border-radius:10px;padding:16px 18px;margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span style="font-size:0.65rem;font-weight:700;color:${catColor};text-transform:uppercase;letter-spacing:0.8px;">${escHtml(n.category || '')}</span>
        ${city ? `<span style="font-size:0.65rem;color:#999;font-weight:500;">${escHtml(city)}</span>` : ''}
      </div>
      <a href="${escHtml(n.url || '#')}" style="font-size:0.9rem;font-weight:600;color:#2E2E2E;text-decoration:none;line-height:1.45;display:block;">${escHtml(title)}</a>
      <div style="margin-top:6px;font-size:0.72rem;color:#B0B0B0;">${escHtml(n.source || '')}</div>
    </div>`;
    }).join('')}

    ${quickHits.length ? `
    <div style="margin-top:16px;margin-bottom:16px;">
      <div style="font-size:0.8rem;font-weight:700;color:#2E2E2E;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:12px;">Also This Week</div>
      ${quickHits.map(n => {
        const catColor = catColors[n.category] || '#3BA7A0';
        const title = cleanTitle(n.title);
        const city = n.city || '';
        return `
      <div style="padding:10px 0;border-bottom:1px solid #F0F0F0;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-size:0.6rem;font-weight:700;color:${catColor};text-transform:uppercase;letter-spacing:0.5px;">${escHtml(n.category || '')}</span>
          ${city ? `<span style="font-size:0.6rem;color:#B0B0B0;">${escHtml(city)}</span>` : ''}
        </div>
        <a href="${escHtml(n.url || '#')}" style="font-size:0.82rem;color:#2E2E2E;text-decoration:none;font-weight:500;line-height:1.4;">${escHtml(title)}</a>
      </div>`;
      }).join('')}
    </div>` : ''}

    <div style="text-align:center;padding:20px 0;">
      <a href="${SITE_URL}" style="display:inline-block;padding:12px 32px;background:#3BA7A0;color:#fff;font-size:0.85rem;font-weight:600;border-radius:8px;text-decoration:none;">Browse All Listings</a>
    </div>

    <div style="border-top:1px solid #E4E4E7;padding:16px 0;text-align:center;font-size:0.7rem;color:#B0B0B0;">
      <p style="margin:0;">KiddosCompass — ${escHtml(cityLabel)}</p>
      <p style="margin:8px 0 0;"><a href="${unsubscribeUrl}" style="color:#B0B0B0;text-decoration:underline;">Unsubscribe</a></p>
    </div>

  </div>
</body>
</html>`;
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
