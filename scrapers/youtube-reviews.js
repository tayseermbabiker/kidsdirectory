require('dotenv').config();
const fs = require('fs');
const path = require('path');

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error('Missing YOUTUBE_API_KEY in .env');
  process.exit(1);
}

const BASE_URL = 'https://www.googleapis.com/youtube/v3';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'youtube-reviews.json');

const SEARCH_CONFIG = [
  {
    category: 'Tutoring & Learning Centers',
    queries: [
      { q: 'Kumon vs Mathnasium review', maxResults: 5 },
      { q: 'best tutoring center for kids', maxResults: 4 },
      { q: 'learning center tour kids experience', maxResults: 4 },
    ],
  },
  {
    category: 'Kids Activities & Classes',
    queries: [
      { q: 'kids dance class experience', maxResults: 5 },
      { q: 'children swim lessons review', maxResults: 4 },
      { q: 'kids martial arts first day', maxResults: 4 },
    ],
  },
  {
    category: 'Birthday Party Venues',
    queries: [
      { q: 'kids birthday party venue tour', maxResults: 5 },
      { q: 'best birthday party ideas for kids', maxResults: 4 },
    ],
  },
  {
    category: 'Summer Camps & After School',
    queries: [
      { q: 'summer camp experience kids vlog', maxResults: 5 },
      { q: 'best summer camps Texas', maxResults: 4 },
    ],
  },
  {
    category: 'Pediatric Dentists & Doctors',
    queries: [
      { q: 'pediatric dentist first visit kids', maxResults: 5 },
      { q: 'how to choose a pediatrician', maxResults: 4 },
    ],
  },
  {
    category: 'Daycares & Preschools',
    queries: [
      { q: 'daycare tour what to look for', maxResults: 5 },
      { q: 'best preschool for toddlers review', maxResults: 4 },
    ],
  },
  {
    category: 'Family-Friendly Restaurants',
    queries: [
      { q: 'best family restaurants kids menu', maxResults: 5 },
      { q: 'family dinner out with kids', maxResults: 4 },
    ],
  },
  {
    category: 'Kids Haircuts & Clothing',
    queries: [
      { q: 'first haircut experience toddler', maxResults: 5 },
      { q: 'kids salon review', maxResults: 4 },
    ],
  },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function searchVideos(query, maxResults = 5) {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    maxResults: String(maxResults),
    order: 'relevance',
    videoDuration: 'medium',
    relevanceLanguage: 'en',
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}/search?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`YouTube search failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return data.items || [];
}

async function getVideoStats(videoIds) {
  if (videoIds.length === 0) return {};

  const params = new URLSearchParams({
    part: 'statistics,contentDetails',
    id: videoIds.join(','),
    key: API_KEY,
  });

  const res = await fetch(`${BASE_URL}/videos?${params}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(`YouTube videos.list failed: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  const stats = {};
  for (const item of data.items || []) {
    stats[item.id] = {
      viewCount: parseInt(item.statistics.viewCount || '0', 10),
      likeCount: parseInt(item.statistics.likeCount || '0', 10),
      commentCount: parseInt(item.statistics.commentCount || '0', 10),
      duration: item.contentDetails?.duration || '',
    };
  }
  return stats;
}

function parseDuration(iso) {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${s}s`;
}

function formatViews(count) {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K`;
  return String(count);
}

async function scrapeCategoryVideos(config) {
  const allVideos = new Map();

  for (const { q, maxResults } of config.queries) {
    console.log(`  "${q}" (max ${maxResults})`);
    try {
      const results = await searchVideos(q, maxResults);
      for (const item of results) {
        const videoId = item.id.videoId;
        if (allVideos.has(videoId)) continue;
        allVideos.set(videoId, {
          videoId,
          title: item.snippet.title,
          channelTitle: item.snippet.channelTitle,
          channelId: item.snippet.channelId,
          publishedAt: item.snippet.publishedAt,
          thumbnail: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.medium?.url || '',
          description: (item.snippet.description || '').slice(0, 300),
        });
      }
      await sleep(200);
    } catch (err) {
      console.error(`  Error: ${err.message}`);
    }
  }

  const videoIds = Array.from(allVideos.keys());
  console.log(`  Fetching stats for ${videoIds.length} videos...`);

  const stats = {};
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const batchStats = await getVideoStats(batch);
    Object.assign(stats, batchStats);
    if (i + 50 < videoIds.length) await sleep(200);
  }

  const videos = [];
  for (const [videoId, video] of allVideos) {
    const s = stats[videoId] || {};
    videos.push({
      ...video,
      viewCount: s.viewCount || 0,
      viewCountFormatted: formatViews(s.viewCount || 0),
      likeCount: s.likeCount || 0,
      commentCount: s.commentCount || 0,
      duration: parseDuration(s.duration || ''),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
    });
  }

  videos.sort((a, b) => b.viewCount - a.viewCount);
  return videos.slice(0, 12);
}

async function main() {
  console.log('Kids Directory — YouTube Reviews Scraper');
  console.log('=========================================\n');

  const output = {
    lastUpdated: new Date().toISOString(),
    categories: {},
  };

  let totalQuotaUsed = 0;

  for (const config of SEARCH_CONFIG) {
    console.log(`\n[${config.category}]`);
    totalQuotaUsed += config.queries.length * 100;

    const videos = await scrapeCategoryVideos(config);
    totalQuotaUsed += Math.ceil(videos.length / 50);

    output.categories[config.category] = {
      videoCount: videos.length,
      topCreators: [...new Set(videos.map(v => v.channelTitle))].slice(0, 5),
      videos,
    };

    console.log(`  ${videos.length} videos from ${new Set(videos.map(v => v.channelTitle)).size} creators`);
    if (videos[0]) {
      console.log(`  Top: "${videos[0].title}" (${videos[0].viewCountFormatted} views)`);
    }

    await sleep(500);
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nSaved to ${OUTPUT_PATH}`);
  console.log(`Estimated API quota used: ~${totalQuotaUsed} units (daily limit: 10,000)`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
