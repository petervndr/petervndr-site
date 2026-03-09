/**
 * Export video data + transcripts as JSON for blog generation.
 * Outputs to stdout so Claude Code can read it.
 */
import { fetchAllLongFormVideos } from './youtube-api.js';
import { readTranscript, transcriptExists } from './transcript-fetcher.js';
import { categorizeByKeywords, CATEGORIES, type Category } from './categorizer.js';
import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = join(process.cwd(), 'src', 'content', 'blog');

const apiKey = process.env.YOUTUBE_API_KEY;
if (!apiKey) { console.error('Missing YOUTUBE_API_KEY'); process.exit(1); }

// Parse args
const args = process.argv.slice(2);
const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity;
const offset = args.includes('--offset') ? parseInt(args[args.indexOf('--offset') + 1]) : 0;

// Check which videos already have blog posts
function postExistsForVideo(videoId: string): boolean {
  if (!existsSync(BLOG_DIR)) return false;
  try {
    const files = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md'));
    for (const f of files) {
      const content = readFileSync(join(BLOG_DIR, f), 'utf-8');
      if (content.includes(`youtubeId: "${videoId}"`)) return true;
    }
  } catch {}
  return false;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

const videos = await fetchAllLongFormVideos(apiKey);

// Filter to videos with transcripts and no existing posts
const ready = videos
  .filter(v => transcriptExists(v.id) && !postExistsForVideo(v.id))
  .sort((a, b) => b.viewCount - a.viewCount);

const batch = ready.slice(offset, offset + limit);

console.error(`Total videos: ${videos.length}`);
console.error(`With transcripts & no post: ${ready.length}`);
console.error(`This batch: ${batch.length} (offset ${offset}, limit ${limit})`);

// Output compact JSON per video
for (const v of batch) {
  const transcript = readTranscript(v.id)!;
  const keywordCategory = categorizeByKeywords(v.title, v.description);

  const data = {
    id: v.id,
    title: v.title,
    slug: slugify(v.title),
    date: v.publishedAt.split('T')[0],
    thumbnail: v.thumbnail,
    duration: v.duration,
    viewCount: v.viewCount,
    description: v.description.slice(0, 500),
    keywordCategory,
    categoryLabel: keywordCategory ? CATEGORIES[keywordCategory] : null,
    transcriptLength: transcript.length,
    transcriptPreview: transcript.slice(0, 500),
  };

  console.log(JSON.stringify(data));
}
