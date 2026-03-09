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
    const { email, first_name, categories, cities } = body;

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

    return { statusCode: 200, headers, body: JSON.stringify({ message: 'Subscribed successfully!' }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
