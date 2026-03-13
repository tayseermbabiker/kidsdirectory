const fetch = require('node-fetch');
const crypto = require('crypto');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
const TABLE_NAME = 'Subscribers';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { email, first_name, categories, cities, website } = body;

    // Honeypot — bots fill this hidden field, humans don't
    if (website) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: 'Subscribed successfully!' }) };
    }

    if (!email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Email is required' }) };
    }

    // Check for existing subscriber
    const safeEmail = email.replace(/"/g, '\\"');
    const checkUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent(`{email}="${safeEmail}"`)}`;
    const checkRes = await fetch(checkUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const checkData = await checkRes.json();

    if (checkData.records && checkData.records.length > 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ message: "You're already subscribed!" }) };
    }

    // Create subscriber (categories/cities are multilineText in Airtable)
    const token = crypto.randomBytes(32).toString('hex');
    const defaultCategories = (categories || []).join('\n') || 'All';
    const defaultCities = (cities || []).join('\n') || 'Plano\nFrisco';
    const createUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          email,
          first_name: first_name || '',
          categories: defaultCategories,
          cities: defaultCities,
          is_active: true,
          created_at: new Date().toISOString().split('T')[0],
          unsubscribe_token: token
        }
      })
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      return { statusCode: 500, headers, body: errText };
    }

    // Send welcome email via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const name = first_name || 'there';
      const cityList = (cities || ['Plano', 'Frisco']).join(', ');
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: 'KiddosCompass <hello@kiddoscompass.com>',
            to: email,
            subject: `Welcome to KiddosCompass, ${name}!`,
            html: `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:'Helvetica Neue',Arial,sans-serif;">
<div style="max-width:560px;margin:0 auto;padding:32px 24px;">
  <div style="text-align:center;margin-bottom:28px;">
    <span style="font-size:1.4rem;font-weight:700;color:#3BA7A0;letter-spacing:-0.5px;">KiddosCompass</span>
  </div>

  <div style="background:#fff;border-radius:12px;padding:32px 28px;border:1px solid #E4E4E7;">
    <h1 style="font-size:1.3rem;color:#2E2E2E;margin:0 0 16px;">Hey ${name}!</h1>
    <p style="font-size:0.95rem;color:#444;line-height:1.7;margin:0 0 16px;">
      Welcome to KiddosCompass! Every week, you'll get a curated list of the best kid-friendly activities, classes, and local news for <strong>${cityList}</strong> — straight to your inbox.
    </p>
    <p style="font-size:0.95rem;color:#444;line-height:1.7;margin:0 0 24px;">
      In the meantime, start exploring:
    </p>
    <div style="text-align:center;margin-bottom:24px;">
      <a href="https://kiddoscompass.com" style="display:inline-block;padding:12px 28px;background:#3BA7A0;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">Browse Listings</a>
    </div>
    <p style="font-size:0.82rem;color:#999;line-height:1.6;margin:0;">
      You're receiving this because you signed up at kiddoscompass.com. You can unsubscribe anytime from any of our weekly emails.
    </p>
  </div>

  <div style="text-align:center;margin-top:24px;font-size:0.72rem;color:#999;">
    KiddosCompass &mdash; Plano &amp; Frisco, TX | Baltimore, MD
  </div>
</div>
</body></html>`
          })
        });
      } catch (e) {
        console.log('Welcome email failed:', e.message);
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Subscribed successfully!' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
