const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const BUSINESSES_PATH = path.join(__dirname, '..', 'public', 'businesses.json');
const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'listings');
const CONCURRENCY = 15;
const TIMEOUT = 10000;

async function downloadImage(url, filepath) {
  const res = await fetch(url, { timeout: TIMEOUT });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = await res.buffer();
  if (buffer.length < 1000) throw new Error('Image too small, likely broken');
  fs.writeFileSync(filepath, buffer);
  return buffer.length;
}

async function run() {
  const data = JSON.parse(fs.readFileSync(BUSINESSES_PATH, 'utf8'));
  const businesses = data.businesses || [];

  if (!fs.existsSync(IMAGES_DIR)) {
    fs.mkdirSync(IMAGES_DIR, { recursive: true });
  }

  // Find businesses with Google Photos URLs that need downloading
  const toDownload = businesses.filter(b =>
    b.image_url &&
    b.image_url.includes('googleusercontent.com') &&
    !b.image_url.startsWith('/images/')
  );

  console.log(`Total businesses: ${businesses.length}`);
  console.log(`Google Photos URLs to download: ${toDownload.length}`);

  let downloaded = 0;
  let failed = 0;
  let skipped = 0;

  // Process in batches for concurrency control
  for (let i = 0; i < toDownload.length; i += CONCURRENCY) {
    const batch = toDownload.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(async (biz) => {
        const ext = 'jpg';
        const filename = `${biz.id}.${ext}`;
        const filepath = path.join(IMAGES_DIR, filename);

        // Skip if already downloaded
        if (fs.existsSync(filepath)) {
          skipped++;
          biz.image_url = `/images/listings/${filename}`;
          return;
        }

        try {
          const size = await downloadImage(biz.image_url, filepath);
          biz.image_url = `/images/listings/${filename}`;
          downloaded++;
          if ((downloaded + skipped) % 50 === 0) {
            console.log(`  Progress: ${downloaded} downloaded, ${skipped} skipped, ${failed} failed`);
          }
        } catch (err) {
          failed++;
          // Keep original URL — onerror fallback will handle it
        }
      })
    );
  }

  // Also update already-skipped ones that exist on disk but still have google URLs
  for (const biz of businesses) {
    if (biz.image_url && biz.image_url.includes('googleusercontent.com')) {
      const filepath = path.join(IMAGES_DIR, `${biz.id}.jpg`);
      if (fs.existsSync(filepath)) {
        biz.image_url = `/images/listings/${biz.id}.jpg`;
      }
    }
  }

  // Write updated businesses.json
  fs.writeFileSync(BUSINESSES_PATH, JSON.stringify(data, null, 2));

  console.log(`\nDone!`);
  console.log(`  Downloaded: ${downloaded}`);
  console.log(`  Skipped (already existed): ${skipped}`);
  console.log(`  Failed (kept original URL): ${failed}`);
  console.log(`  Total businesses: ${businesses.length}`);
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
