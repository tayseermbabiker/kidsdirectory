const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;

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
    const { id } = JSON.parse(event.body);
    if (!id) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing business id' }) };
    }

    // Get current vote count
    const getRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Businesses/${id}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });

    if (!getRes.ok) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Business not found' }) };
    }

    const record = await getRes.json();
    const currentVotes = record.fields.vote_count || 0;
    const newVotes = currentVotes + 1;

    // Update vote count
    const updateRes = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Businesses/${id}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ fields: { vote_count: newVotes } })
    });

    if (!updateRes.ok) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to update vote' }) };
    }

    return { statusCode: 200, headers, body: JSON.stringify({ vote_count: newVotes }) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
