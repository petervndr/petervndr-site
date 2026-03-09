import { fetchAllLongFormVideos } from './youtube-api.js';
import { transcriptExists } from './transcript-fetcher.js';

const apiKey = process.env.YOUTUBE_API_KEY!;
const videos = await fetchAllLongFormVideos(apiKey);
const missing = videos.filter(v => !transcriptExists(v.id));
for (const v of missing) {
  console.log(v.id);
}
