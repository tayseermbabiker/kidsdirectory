const { execSync } = require('child_process');
const path = require('path');

const scrapers = [
  'yelp-tutoring.js',
  'yelp-kids-activities.js',
  'yelp-party-venues.js',
  'yelp-summer-camps.js',
  'yelp-pediatric.js',
  'yelp-daycares.js',
  'yelp-family-restaurants.js',
  'yelp-kids-haircuts.js'
];

async function runAll() {
  console.log('=== Kids Directory: Running all scrapers ===\n');

  for (const scraper of scrapers) {
    const file = path.join(__dirname, scraper);
    console.log(`\n>>> Running ${scraper}...`);
    try {
      execSync(`node "${file}"`, { stdio: 'inherit', timeout: 300000 });
    } catch (err) {
      console.error(`!!! ${scraper} failed: ${err.message}`);
    }
  }

  console.log('\n=== All scrapers complete ===');
}

runAll();
