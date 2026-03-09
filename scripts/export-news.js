require('dotenv').config();
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_CONTENT_BASE_ID;
const NEWS_TABLE = 'News';

async function exportNews() {
  console.log('Exporting news from Airtable...');
  const records = [];
  let offset = null;

  do {
    const params = new URLSearchParams({ pageSize: '100' });
    // Sort by published_at descending
    params.set('sort[0][field]', 'published_at');
    params.set('sort[0][direction]', 'desc');
    if (offset) params.set('offset', offset);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(NEWS_TABLE)}?${params}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    records.push(...(data.records || []));
    offset = data.offset || null;
  } while (offset);

  const news = records.map(r => ({
    id: r.id,
    title: r.fields.title || '',
    snippet: r.fields.snippet || '',
    url: r.fields.url || '',
    source: r.fields.source || '',
    category: r.fields.category || '',
    city: r.fields.city || '',
    image_url: r.fields.image_url || '',
    published_at: r.fields.published_at || ''
  }));

  const output = {
    news,
    count: news.length,
    exported_at: new Date().toISOString()
  };

  const publicDir = path.join(__dirname, '..', 'public');
  fs.writeFileSync(path.join(publicDir, 'news.json'), JSON.stringify(output));
  console.log(`Exported ${news.length} news items to public/news.json`);
}

exportNews().catch(console.error);
