/**
 * YouTube Data API v3 Client
 * Fetches video metadata from Peter's channel, filtering out Shorts.
 */

const CHANNEL_ID = 'UC2hJZCbcNcyOSm_fAmPw6oQ';
const MAX_RESULTS = 50; // YouTube API max per page

export interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  publishedAt: string;
  thumbnail: string;
  duration: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  tags: string[];
}

/**
 * Parse ISO 8601 duration (PT12M34S) to seconds
 */
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Get the uploads playlist ID for the channel
 */
async function getUploadsPlaylistId(apiKey: string): Promise<string> {
  const url = `https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${CHANNEL_ID}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube channels API error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.items[0].contentDetails.relatedPlaylists.uploads;
}

/**
 * Fetch all video IDs from the uploads playlist
 */
async function getAllVideoIds(apiKey: string, playlistId: string): Promise<string[]> {
  const ids: string[] = [];
  let pageToken = '';

  while (true) {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&playlistId=${playlistId}&maxResults=${MAX_RESULTS}&key=${apiKey}${pageToken ? `&pageToken=${pageToken}` : ''}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube playlistItems API error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    for (const item of data.items) {
      ids.push(item.contentDetails.videoId);
    }

    if (data.nextPageToken) {
      pageToken = data.nextPageToken;
    } else {
      break;
    }
  }

  return ids;
}

/**
 * Fetch video details in batches of 50
 */
async function getVideoDetails(apiKey: string, videoIds: string[]): Promise<YouTubeVideo[]> {
  const videos: YouTubeVideo[] = [];

  for (let i = 0; i < videoIds.length; i += MAX_RESULTS) {
    const batch = videoIds.slice(i, i + MAX_RESULTS);
    const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${batch.join(',')}&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`YouTube videos API error: ${res.status} ${await res.text()}`);
    const data = await res.json();

    for (const item of data.items) {
      const durationSeconds = parseDuration(item.contentDetails.duration);

      videos.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        publishedAt: item.snippet.publishedAt,
        thumbnail: item.snippet.thumbnails?.maxres?.url
          || item.snippet.thumbnails?.high?.url
          || item.snippet.thumbnails?.medium?.url
          || '',
        duration: item.contentDetails.duration,
        durationSeconds,
        viewCount: parseInt(item.statistics.viewCount || '0'),
        likeCount: parseInt(item.statistics.likeCount || '0'),
        tags: item.snippet.tags || [],
      });
    }
  }

  return videos;
}

/**
 * Main: Fetch all long-form videos (>60s) from the channel
 */
export async function fetchAllLongFormVideos(apiKey: string): Promise<YouTubeVideo[]> {
  console.log('Fetching uploads playlist ID...');
  const playlistId = await getUploadsPlaylistId(apiKey);
  console.log(`Uploads playlist: ${playlistId}`);

  console.log('Fetching all video IDs...');
  const allIds = await getAllVideoIds(apiKey, playlistId);
  console.log(`Found ${allIds.length} total videos`);

  console.log('Fetching video details...');
  const allVideos = await getVideoDetails(apiKey, allIds);

  // Filter out Shorts (<=60 seconds)
  const longForm = allVideos.filter(v => v.durationSeconds > 60);
  console.log(`${longForm.length} long-form videos (filtered out ${allVideos.length - longForm.length} Shorts)`);

  return longForm;
}

/**
 * Fetch only new videos since a given date
 */
export async function fetchNewVideos(apiKey: string, since: string): Promise<YouTubeVideo[]> {
  const url = `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${CHANNEL_ID}&publishedAfter=${since}&type=video&order=date&maxResults=${MAX_RESULTS}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube search API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  const ids = data.items.map((item: any) => item.id.videoId);
  if (ids.length === 0) return [];

  const videos = await getVideoDetails(apiKey, ids);
  return videos.filter(v => v.durationSeconds > 60);
}
