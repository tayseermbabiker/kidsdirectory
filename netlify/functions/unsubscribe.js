const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
const TABLE_NAME = 'Subscribers';

exports.handler = async (event) => {
  const token = event.queryStringParameters?.token;

  if (!token) {
    return { statusCode: 400, headers: { 'Content-Type': 'text/html' }, body: page('Missing token.') };
  }

  try {
    // Find subscriber by token
    const findUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=${encodeURIComponent(`{unsubscribe_token}="${token}"`)}`;
    const findRes = await fetch(findUrl, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const findData = await findRes.json();

    if (!findData.records || findData.records.length === 0) {
      return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: page('This link is invalid or you are already unsubscribed.') };
    }

    const record = findData.records[0];

    // Set is_active to false
    const updateUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
    await fetch(updateUrl, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        records: [{ id: record.id, fields: { is_active: false } }]
      })
    });

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: page("You've been unsubscribed. We're sorry to see you go!") };
  } catch (err) {
    return { statusCode: 500, headers: { 'Content-Type': 'text/html' }, body: page('Something went wrong. Please try again later.') };
  }
};

function page(message) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>KiddosCompass</title></head>
<body style="margin:0;padding:0;background:#FAF9F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;">
  <div style="text-align:center;padding:40px 24px;max-width:400px;">
    <p style="font-size:1.4rem;font-weight:700;color:#3BA7A0;margin:0 0 16px;">KiddosCompass</p>
    <p style="font-size:1rem;color:#2E2E2E;line-height:1.6;margin:0 0 24px;">${message}</p>
    <a href="https://kiddoscompass.com" style="display:inline-block;padding:12px 28px;background:#3BA7A0;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:0.9rem;">Back to KiddosCompass</a>
  </div>
</body></html>`;
}
