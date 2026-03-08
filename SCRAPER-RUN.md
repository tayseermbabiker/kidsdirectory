# How to Run Scrapers

## Prerequisites (one-time setup)
```
npm install
npx playwright install chromium
```

## Step 1: Scrape businesses from Google Maps
```
node scrapers/google-maps.js
```
A Chrome browser opens automatically, searches for kids businesses in all cities, and saves them to Airtable. Takes ~20-30 min. Just sit back and watch.

## Step 2: Scrape businesses from Yelp
```
node scrapers/yelp-all.js
```
Same thing but on Yelp. Takes ~30-40 min.

## Step 3: Scrape news
```
node scrapers/news-scraper.js
```
Fetches local parent news from Google News RSS. Fast, ~1 min. This also runs daily via GitHub Actions.

## Step 4: Export to website
```
node scripts/export-businesses.js
node scripts/export-news.js
```
Pulls data from Airtable and writes JSON files that the website reads. Must run after scraping.

## Notes
- Google Maps and Yelp scrapers open a visible browser — they only work locally, not in GitHub Actions
- News scraper is HTTP-only — works everywhere
- If a scraper crashes midway, data already pushed to Airtable is safe — just re-run
- The daily GitHub Action only runs the news scraper + export scripts
