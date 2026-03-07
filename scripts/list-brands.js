require('dotenv').config();
const fetch = require('node-fetch');

async function main() {
  const all = [];
  let offset = null;

  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    ['name', 'category', 'take'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Businesses?${params}`, {
      headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of data.records || []) all.push({ id: r.id, ...r.fields });
    offset = data.offset || null;
  } while (offset);

  const cats = {};
  for (const b of all) {
    const cat = b.category || 'Unknown';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push({ name: b.name, id: b.id, hasTake: !!b.take });
  }

  for (const [cat, bizs] of Object.entries(cats).sort()) {
    console.log(`\n=== ${cat} (${bizs.length}) ===`);
    bizs.sort((a, b) => a.name.localeCompare(b.name));
    bizs.forEach(b => console.log(`${b.hasTake ? '[DONE] ' : '       '} ${b.name}`));
  }
}

main().catch(console.error);
