require('dotenv').config();
const fetch = require('node-fetch');

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE = 'Businesses';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Same brand matchers from apply-brand-templates.js
const FRANCHISE_MATCHERS = [
  (n) => n.includes('kumon'),
  (n) => n.includes('mathnasium'),
  (n) => n.includes('best brains'),
  (n) => n.includes('c2 education'),
  (n) => n.includes('eye level'),
  (n) => n.includes('gideon'),
  (n) => n.includes('reading ranch'),
  (n) => n.includes('jei learning'),
  (n) => n.startsWith('the tutoring center'),
  (n) => n.includes('test geek'),
  (n) => n.includes('primrose school'),
  (n) => n.includes('montessori'),
  (n) => n.includes('kindercare'),
  (n) => n.includes('learning experience'),
  (n) => n.includes('bright horizons'),
  (n) => n.includes('aqua-tots'),
  (n) => n.includes('emler swim'),
  (n) => n.includes('safesplash'),
  (n) => n.includes('premier martial arts'),
  (n) => n.includes('school of rock'),
  (n) => n.includes('main event'),
  (n) => n.includes('urban air'),
  (n) => n.includes('pigtails'),
  (n) => n.includes('snip-its'),
  (n) => n.includes('sharkey'),
  // Additional known franchises
  (n) => n.includes('goddard school'),
  (n) => n.includes('kids r kids') || n.includes("kids 'r' kids"),
  (n) => n.includes('kidstrong'),
  (n) => n.includes('pump it up'),
  (n) => n.includes('romp n'),
  (n) => n.includes('tumbles'),
  (n) => n.includes('we rock the spectrum'),
  (n) => n.includes('crayola experience'),
  (n) => n.includes('pinstack'),
  (n) => n.includes('strikz'),
  (n) => n.includes('cook children'),
  (n) => n.includes('children\'s health'),
  (n) => n.includes('fred astaire'),
  (n) => n.includes('british swim school'),
  (n) => n.includes('big blue swim'),
  (n) => n.includes('goldfish swim'),
  (n) => n.includes('abercrombie'),
  (n) => n.includes('carter\'s'),
  (n) => n.includes('oshkosh'),
  (n) => n.includes('kohl\'s'),
  (n) => n.includes('kidzbkids') || n.includes('kidz b kids'),
  (n) => n.includes('kid to kid'),
  (n) => n.includes('crème de la crème') || n.includes('creme de la creme'),
  (n) => n.includes('cadence academy'),
  (n) => n.includes('everbrook academy'),
  (n) => n.includes('children\'s lighthouse'),
  (n) => n.includes('adventure kids'),
  (n) => n.includes('celebree school'),
  (n) => n.includes('challenge island'),
  (n) => n.includes('club scikidz'),
  (n) => n.includes('icode'),
  (n) => n.includes('bricks bots'),
  (n) => n.includes('play street museum'),
  (n) => n.includes('chuy\'s'),
  (n) => n.includes('lazy dog'),
  (n) => n.includes('maggiano'),
  (n) => n.includes('flower child'),
  (n) => n.includes('seasons 52'),
  (n) => n.includes('tupelo honey'),
  (n) => n.includes('cane rosso'),
];

function isFranchise(name) {
  const lower = name.toLowerCase();
  return FRANCHISE_MATCHERS.some(fn => fn(lower));
}

async function main() {
  const all = [];
  let offset = null;
  do {
    const params = new URLSearchParams();
    params.set('pageSize', '100');
    ['name', 'business_type'].forEach(f => params.append('fields[]', f));
    if (offset) params.set('offset', offset);
    const res = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}?${params}`, {
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
    });
    const data = await res.json();
    for (const r of data.records || []) all.push({ id: r.id, ...r.fields });
    offset = data.offset || null;
  } while (offset);

  console.log(`Total: ${all.length}`);

  const updates = [];
  let franchiseCount = 0;
  let localCount = 0;

  for (const biz of all) {
    if (biz.business_type) continue; // already tagged

    const type = isFranchise(biz.name) ? 'franchise' : 'local';
    if (type === 'franchise') franchiseCount++;
    else localCount++;

    updates.push({ id: biz.id, fields: { business_type: type } });
  }

  console.log(`Franchise: ${franchiseCount}, Local: ${localCount}`);

  // Batch update 10 at a time
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE)}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ records: batch })
    });
    if (!res.ok) console.error('Error:', await res.text());
    else console.log(`Tagged ${Math.min(i + 10, updates.length)}/${updates.length}`);
    if (i + 10 < updates.length) await sleep(250);
  }

  console.log('Done!');
}

main().catch(console.error);
