/**
 * Fetch all transcripts for long-form videos.
 * Caches to src/content/transcripts/ — safe to re-run.
 */
import { fetchAllLongFormVideos } from './youtube-api.js';
import { fetchTranscripts } from './transcript-fetcher.js';

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) { console.error('Missing YOUTUBE_API_KEY'); process.exit(1); }

console.log('Fetching video list from YouTube API...');
const videos = await fetchAllLongFormVideos(apiKey);
console.log(`Found ${videos.length} long-form videos\n`);

const videoIds = videos.map(v => v.id);

const results = await fetchTranscripts(videoIds, {
  onProgress: (done, total, videoId) => {
    const video = videos.find(v => v.id === videoId);
    const title = video?.title?.slice(0, 50) || videoId;
    console.log(`  [${done}/${total}] ${title}...`);
  }
});

console.log(`\nDone! ${results.size}/${videos.length} transcripts available.`);
