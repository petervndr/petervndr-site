/**
 * Fetch all long-form video metadata and identify which need blog posts.
 */
import { fetchAllLongFormVideos } from './youtube-api.js';
import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const apiKey = process.env.YOUTUBE_API_KEY!;
const blogDir = join(process.cwd(), 'src', 'content', 'blog');

async function main() {
  const videos = await fetchAllLongFormVideos(apiKey);

  // Check which ones already have blog posts
  let existingIds = new Set<string>();
  try {
    const files = readdirSync(blogDir).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = readFileSync(join(blogDir, f), 'utf-8');
      const match = content.match(/youtubeId:\s*"([^"]+)"/);
      if (match) existingIds.add(match[1]);
    }
  } catch {}

  const newVideos = videos.filter(v => !existingIds.has(v.id));
  newVideos.sort((a, b) => b.viewCount - a.viewCount);

  console.log(`Total long-form: ${videos.length}`);
  console.log(`Already have posts: ${existingIds.size}`);
  console.log(`Need posts: ${newVideos.length}`);
  console.log('---');

  writeFileSync('/tmp/new-videos.json', JSON.stringify(newVideos, null, 2));
  console.log('Saved to /tmp/new-videos.json');

  for (const v of newVideos) {
    const mins = Math.round(v.durationSeconds / 60);
    console.log(`  ${String(v.viewCount).padStart(6)} views | ${mins}m | ${v.id} | ${v.title}`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
