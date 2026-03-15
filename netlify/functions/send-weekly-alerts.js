const fetch = require('node-fetch');
const { Resend } = require('resend');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const ALERTS_SECRET = process.env.ALERTS_SECRET;
const SITE_URL = process.env.URL || 'https://kiddoscompass.com';

// Exclusive = newsletter only, Website = also on carousel
const EXCLUSIVE_CATS = ['New Openings', 'Events', 'Sports & Activities'];
const WEBSITE_CATS = ['Education', 'Health & Safety', 'Community', 'Local Impact'];

const CITY_META = {
  'Plano': { label: 'Plano, TX', slug: 'plano' },
  'Frisco': { label: 'Frisco, TX', slug: 'frisco' },
  'Baltimore': { label: 'Baltimore, MD', slug: 'baltimore' }
};

const CAT_COLORS = {
  'New Openings': '#E87040',
  'Events': '#7C5CFC',
  'Sports & Activities': '#2B8FD4',
  'Health & Safety': '#D44B4B',
  'Education': '#3BA7A0',
  'Community': '#6A6A6A',
  'Local Impact': '#C4841D'
};

exports.handler = async (event) => {
  const key = event.queryStringParameters?.key;
  if (key !== ALERTS_SECRET) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const subscribers = await fetchSubscribers();
    if (!subscribers.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No active subscribers' }) };
    }

    const news = await fetchRecentNews();
    if (!news.length) {
      return { statusCode: 200, body: JSON.stringify({ message: 'No recent news to send' }) };
    }

    // Deduplicate
    const deduped = deduplicateNews(news);

    const monday = getNextMonday();
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    const resend = new Resend(RESEND_API_KEY);
    const emails = [];
    let skipped = 0;

    for (const sub of subscribers) {
      const subNews = filterNewsByCities(deduped, sub.cities);
      if (!subNews.length) { skipped++; continue; }

      const cityLabel = sub.cities.join(' & ');
      const subject = `This Week in ${cityLabel} — ${fmt(monday)} to ${fmt(sunday)}`;
      emails.push({
        from: 'KiddosCompass <weekly@kiddoscompass.com>',
        to: sub.email,
        subject,
        html: buildEmailHtml(sub, subNews, monday, sunday)
      });
    }

    if (!emails.length) {
      return { statusCode: 200, body: JSON.stringify({ message: `No emails to send (${skipped} skipped — no matching news)` }) };
    }

    // Send in batches of 100
    for (let i = 0; i < emails.length; i += 100) {
      const batch = emails.slice(i, i + 100);
      const result = await resend.batch.send(batch);
      console.log(`Batch ${Math.floor(i / 100) + 1}: sent ${batch.length} emails`, result);
    }

    // Update last_alerted_at
    const today = new Date().toISOString().split('T')[0];
    const sentSubs = subscribers.filter(s => emails.some(e => e.to === s.email));
    for (let i = 0; i < sentSubs.length; i += 10) {
      const batch = sentSubs.slice(i, i + 10);
      await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Subscribers`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: batch.map(s => ({ id: s.id, fields: { last_alerted_at: today } }))
        })
      });
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: `Sent ${emails.length} emails, ${skipped} skipped` })
    };
  } catch (err) {
    console.error('Alert error:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};

// ── Data fetchers ────────────────────────────────────────────

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
        cities: (r.fields.cities || 'Plano\nFrisco\nBaltimore').split('\n').map(s => s.trim()).filter(Boolean),
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

// ── Helpers ──────────────────────────────────────────────────

function deduplicateNews(news) {
  const seen = new Set();
  return news.filter(n => {
    const key = (n.title || '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 60);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function filterNewsByCities(news, cities) {
  if (!cities || !cities.length) return news;
  const cityLower = cities.map(c => c.toLowerCase());
  return news.filter(n => {
    const newsCity = (n.city || '').toLowerCase();
    if (cityLower.some(c => newsCity.includes(c) || c.includes(newsCity))) return true;
    const text = ((n.title || '') + ' ' + (n.snippet || '')).toLowerCase();
    return cityLower.some(c => text.includes(c));
  });
}

function cleanTitle(title) {
  if (!title) return '';
  return title
    .replace(/\s*[\-\u2013|]\s*(Community Impact|Sports Illustrated|MaxPreps|ntdaily|thebanner|Patch|CBS News|FOX).*$/i, '')
    .replace(/\s*[\-\u2013|]\s*News\s*$/i, '')
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

function groupByCityAndCategory(news, subscriberCities) {
  const result = {};
  const cityOrder = ['Plano', 'Frisco', 'Baltimore'];

  // Only include cities the subscriber is subscribed to
  const activeCities = cityOrder.filter(c =>
    subscriberCities.some(sc => sc.toLowerCase() === c.toLowerCase())
  );

  for (const city of activeCities) {
    const cityNews = news.filter(n => (n.city || '').toLowerCase() === city.toLowerCase());
    if (!cityNews.length) continue;

    const exclusive = {};
    const website = {};

    for (const n of cityNews) {
      const cat = n.category || 'Other';
      if (EXCLUSIVE_CATS.includes(cat)) {
        if (!exclusive[cat]) exclusive[cat] = [];
        exclusive[cat].push(n);
      } else if (WEBSITE_CATS.includes(cat)) {
        if (!website[cat]) website[cat] = [];
        website[cat].push(n);
      }
    }

    // Sort each group by recency
    const sortByRecency = (arr) => arr.sort((a, b) =>
      new Date(b.published_at || 0) - new Date(a.published_at || 0)
    );
    Object.values(exclusive).forEach(sortByRecency);
    Object.values(website).forEach(sortByRecency);

    if (Object.keys(exclusive).length || Object.keys(website).length) {
      result[city] = { exclusive, website };
    }
  }

  return result;
}

// ── Email builder ────────────────────────────────────────────

function buildEmailHtml(subscriber, news, monday, sunday) {
  const fmt = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const name = subscriber.first_name || 'there';
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${subscriber.unsubscribe_token}`;

  const grouped = groupByCityAndCategory(news, subscriber.cities);
  const cityKeys = Object.keys(grouped);

  let citySections = '';

  cityKeys.forEach((city, cityIdx) => {
    const meta = CITY_META[city] || { label: city, slug: city.toLowerCase() };
    const { exclusive, website } = grouped[city];

    // City header
    citySections += `
    <tr>
      <td style="padding:${cityIdx === 0 ? '4px' : '28px'} 28px 6px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="border-left:4px solid #3BA7A0;padding-left:12px;">
              <p style="margin:0;font-size:10px;font-weight:700;color:#3BA7A0;text-transform:uppercase;letter-spacing:1.2px;">
                ${esc(meta.label)}
              </p>
              <p style="margin:3px 0 0;font-size:18px;font-weight:800;color:#1a1a2e;letter-spacing:-0.2px;">
                This Week in ${esc(city)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;

    // Exclusive categories (newsletter-only content)
    for (const cat of EXCLUSIVE_CATS) {
      if (!exclusive[cat] || !exclusive[cat].length) continue;
      const color = CAT_COLORS[cat] || '#3BA7A0';

      citySections += `
    <tr>
      <td style="padding:14px 28px 4px;">
        <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr>
            <td valign="middle">
              <span style="font-size:12px;font-weight:700;color:#1a1a2e;text-transform:uppercase;letter-spacing:0.5px;">${esc(cat)}</span>
            </td>
            <td valign="middle" style="padding-left:8px;">
              <span style="display:inline-block;padding:2px 8px;background-color:#FFF8E1;color:#8a6200;font-size:9px;font-weight:700;border-radius:4px;letter-spacing:0.3px;border:1px solid #ffe082;">
                SUBSCRIBER EXCLUSIVE
              </span>
            </td>
          </tr>
        </table>`;

      for (const n of exclusive[cat]) {
        const title = cleanTitle(n.title);
        citySections += `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #e8e8e8;border-radius:7px;margin-bottom:8px;">
          <tr>
            <td style="border-left:4px solid ${color};padding:12px 14px;">
              <a href="${esc(n.url || '#')}" style="font-size:14px;font-weight:700;color:#1a1a2e;text-decoration:none;line-height:1.4;display:block;">${esc(title)}</a>
              <p style="margin:5px 0 0;font-size:11px;color:#999;">${esc(n.source || '')}</p>
            </td>
          </tr>
        </table>`;
      }

      citySections += `
      </td>
    </tr>`;
    }

    // Website categories (also on site — compact teasers)
    const hasWebsite = WEBSITE_CATS.some(cat => website[cat] && website[cat].length);
    if (hasWebsite) {
      citySections += `
    <tr>
      <td style="padding:12px 28px 4px;">
        <p style="margin:0 0 8px;font-size:10px;color:#999;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
          Also on KiddosCompass
        </p>`;

      for (const cat of WEBSITE_CATS) {
        if (!website[cat] || !website[cat].length) continue;
        // Show max 2 per website category to keep it compact
        const items = website[cat].slice(0, 2);
        for (const n of items) {
          const title = cleanTitle(n.title);
          citySections += `
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:6px;">
          <tr>
            <td style="padding:10px 14px;background-color:#f5fafa;border-radius:6px;border-left:3px solid #3BA7A0;">
              <p style="margin:0 0 2px;font-size:9px;font-weight:700;color:#3BA7A0;text-transform:uppercase;letter-spacing:0.5px;">${esc(cat)}</p>
              <a href="${esc(n.url || '#')}" style="font-size:13px;font-weight:600;color:#1a1a2e;text-decoration:none;line-height:1.35;display:block;">${esc(title)}</a>
            </td>
          </tr>
        </table>`;
        }
      }

      citySections += `
      </td>
    </tr>`;
    }

    // City divider (not after last city)
    if (cityIdx < cityKeys.length - 1) {
      citySections += `
    <tr>
      <td style="padding:8px 28px 0;">
        <div style="border-top:2px dashed #dde8e8;"></div>
      </td>
    </tr>`;
    }
  });

  // Handle cities with no content
  const emptyCities = subscriber.cities.filter(c => !grouped[c]);
  if (emptyCities.length) {
    for (const city of emptyCities) {
      citySections += `
    <tr>
      <td style="padding:20px 28px 8px;">
        <p style="margin:0;font-size:13px;color:#999;font-style:italic;">Nothing new in ${esc(city)} this week — check back next Saturday!</p>
      </td>
    </tr>`;
    }
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin:0;padding:0;background-color:#eef4f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#eef4f4;">
<tr><td align="center" style="padding:24px 10px;">

  <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:#ffffff;border-radius:10px;overflow:hidden;">

    <!-- Header -->
    <tr>
      <td style="background-color:#3BA7A0;padding:24px 28px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td>
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.3px;">KiddosCompass</p>
              <p style="margin:4px 0 0;font-size:11px;color:rgba(255,255,255,0.8);letter-spacing:1px;text-transform:uppercase;font-weight:600;">Weekly Family Guide</p>
            </td>
            <td align="right" valign="middle">
              <p style="margin:0;font-size:12px;color:rgba(255,255,255,0.85);text-align:right;">
                ${fmt(monday)} - ${fmt(sunday)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Greeting -->
    <tr>
      <td style="padding:18px 28px 16px;border-bottom:1px solid #ebebeb;">
        <p style="margin:0;font-size:15px;color:#3d3d3d;line-height:1.6;">
          Hey <strong>${esc(name)}</strong> — here's your weekly scoop of what's happening for families in <strong>${esc(subscriber.cities.join(', '))}</strong>.
        </p>
      </td>
    </tr>

    <!-- City sections -->
    ${citySections}

    <!-- CTA -->
    <tr><td style="height:24px;"></td></tr>
    <tr>
      <td style="padding:0 28px 28px;text-align:center;">
        <a href="${SITE_URL}" style="display:inline-block;padding:13px 36px;background-color:#3BA7A0;color:#ffffff;font-size:13px;font-weight:700;border-radius:50px;text-decoration:none;letter-spacing:0.5px;">
          Browse All Listings
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color:#1a1a2e;padding:24px 28px;border-radius:0 0 10px 10px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td align="center">
              <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#3BA7A0;">KiddosCompass</p>
              <p style="margin:0 0 12px;font-size:11px;color:rgba(255,255,255,0.5);">Your city. Your kids. This week.</p>
              <p style="margin:0 0 14px;">
                <a href="${SITE_URL}/plano" style="font-size:11px;color:#3BA7A0;text-decoration:none;margin:0 6px;">Plano</a>
                <span style="color:rgba(255,255,255,0.2);">|</span>
                <a href="${SITE_URL}/frisco" style="font-size:11px;color:#3BA7A0;text-decoration:none;margin:0 6px;">Frisco</a>
                <span style="color:rgba(255,255,255,0.2);">|</span>
                <a href="${SITE_URL}/baltimore" style="font-size:11px;color:#3BA7A0;text-decoration:none;margin:0 6px;">Baltimore</a>
              </p>
              <p style="margin:0;font-size:10px;color:rgba(255,255,255,0.35);line-height:1.7;">
                You're receiving this because you subscribed at kiddoscompass.com.<br>
                <a href="${unsubscribeUrl}" style="color:rgba(255,255,255,0.45);text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>

  </table>

</td></tr>
</table>

</body>
</html>`;
}

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
