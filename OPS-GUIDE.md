# KiddosCompass — Operations Guide

## Domain & Hosting
| Service | Purpose | URL |
|---------|---------|-----|
| Netlify | Hosting, DNS, functions | https://app.netlify.com |
| GitHub | Code repo | https://github.com/tayseermbabiker/kidsdirectory |
| Domain | kiddoscompass.com | Managed via Netlify DNS |

## Data & Backend
| Service | Purpose | Details |
|---------|---------|---------|
| Airtable (Businesses) | Business listings | Base: `appngA2P8MNHh6Ieh` — 952 records |
| Airtable (Content) | News + Subscribers | Base: `appXMefK14YnTjpGq` |
| Google Analytics | Traffic tracking | Property: `G-PNP99V5QVF` |
| Google Search Console | SEO, sitemap | kiddoscompass.com verified |

## Email & Communication
| Service | Purpose | Details |
|---------|---------|---------|
| Zoho Mail | Inbox — read & reply emails | hello@kiddoscompass.com |
| Resend | Send automated emails | Welcome emails, weekly alerts |

### Email flows
1. **Welcome email** — Sent instantly when someone subscribes (via Resend)
2. **Weekly alerts** — NOT YET SET UP — needs GitHub Actions cron + `send-weekly-alerts.js`
3. **Manual replies** — Via Zoho Mail inbox at hello@kiddoscompass.com

## Scraping Schedule
| What | When | How |
|------|------|-----|
| Business scrapers | Manual (run as needed) | `npm run scrape` — 4 scrapers: Howard, Baltimore County, Anne Arundel, Harford |
| News scraper | GitHub Actions cron | `.github/workflows/scrape-news.yml` — runs daily |
| News export | After scrape | `node scripts/export-news.js` → `public/news.json` |
| Business export | After scrape | `node scripts/export-businesses.js` → `public/businesses.json` + `sitemap.xml` |

### Scraper sources
- **Businesses**: Google Maps (Playwright) — Plano, Frisco, Baltimore metro (4 counties)
- **News**: Google News RSS, Frisco City Alerts, Frisco ISD, Community Impact

## Netlify Environment Variables
| Variable | Purpose |
|----------|---------|
| `AIRTABLE_API_KEY` | Airtable personal access token |
| `AIRTABLE_BASE_ID` | Businesses base (`appngA2P8MNHh6Ieh`) |
| `AIRTABLE_CONTENT_BASE_ID` | News + Subscribers base (`appXMefK14YnTjpGq`) |
| `RESEND_API_KEY` | Resend email API key |

## Key Pages
| Page | URL | Notes |
|------|-----|-------|
| Homepage | kiddoscompass.com | Hero, categories, news carousel, subscribe |
| City pages | /plano, /frisco, /baltimore | Business listings by city |
| Category pages | /plano/tutoring-learning-centers | Filtered by city + category |
| Business detail | /go/{id} | Full page via Netlify Function |
| FAQ | /faq | SEO questions with JSON-LD schema |
| Saved | /saved | LocalStorage-based saved businesses |

## Where to check things
| I want to... | Go to... |
|--------------|----------|
| See subscribers | Airtable → Content base → Subscribers table |
| See news articles | Airtable → Content base → News table |
| See business listings | Airtable → Businesses base → Businesses table |
| Check site traffic | Google Analytics → G-PNP99V5QVF |
| Check SEO / indexing | Google Search Console → kiddoscompass.com |
| Read/reply emails | Zoho Mail → hello@kiddoscompass.com |
| Check scraper runs | GitHub → Actions tab |
| Check deploy status | Netlify → kiddoscompass site → Deploys |

## Pending / Future
- [ ] Weekly email alerts (GitHub Actions cron — not set up yet)
- [ ] Marketing plan
- [ ] Monetization (featured listings)
