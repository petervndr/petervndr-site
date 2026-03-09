import { fetchAllLongFormVideos } from './youtube-api.js';

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) { console.error('Missing YOUTUBE_API_KEY'); process.exit(1); }

const videos = await fetchAllLongFormVideos(apiKey);
videos.sort((a, b) => b.viewCount - a.viewCount);

for (const v of videos.slice(0, 10)) {
  console.log(`${v.viewCount.toLocaleString()} views | ${v.title} | ${v.id} | ${Math.round(v.durationSeconds / 60)}min`);
}
console.log(`\nTotal long-form videos: ${videos.length}`);
