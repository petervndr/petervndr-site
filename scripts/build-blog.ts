/**
 * Blog Build Pipeline
 * Orchestrates: YouTube API → Transcripts → AI Generation → Markdown files
 *
 * Usage:
 *   npx tsx scripts/build-blog.ts              # Process all new videos
 *   npx tsx scripts/build-blog.ts --limit 5    # Process only 5 videos (for testing)
 *   npx tsx scripts/build-blog.ts --force      # Regenerate all posts
 */

import { fetchAllLongFormVideos, type YouTubeVideo } from './youtube-api.js';
import { fetchTranscripts, transcriptExists } from './transcript-fetcher.js';
import { generateBlogPost, postExists } from './post-generator.js';
import { readdirSync } from 'fs';
import { join } from 'path';

const BLOG_DIR = join(process.cwd(), 'src', 'content', 'blog');

async function main() {
  const args = process.argv.slice(2);
  const limit = args.includes('--limit') ? parseInt(args[args.indexOf('--limit') + 1]) : Infinity;
  const force = args.includes('--force');

  // Check for required API keys
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!youtubeKey) {
    console.error('Missing YOUTUBE_API_KEY environment variable');
    process.exit(1);
  }
  if (!anthropicKey) {
    console.error('Missing ANTHROPIC_API_KEY environment variable');
    process.exit(1);
  }

  console.log('=== Blog Build Pipeline ===\n');

  // Step 1: Fetch all long-form videos from YouTube
  console.log('Step 1: Fetching videos from YouTube...');
  const videos = await fetchAllLongFormVideos(youtubeKey);

  // Step 2: Filter to videos that need processing
  let toProcess: YouTubeVideo[];
  if (force) {
    toProcess = videos;
  } else {
    toProcess = videos.filter(v => !postExists(v.id));
  }

  if (limit < toProcess.length) {
    // Sort by view count (highest first) so we process best content first
    toProcess.sort((a, b) => b.viewCount - a.viewCount);
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`\nStep 2: ${toProcess.length} videos to process (${videos.length - toProcess.length} already have posts)\n`);

  if (toProcess.length === 0) {
    console.log('Nothing new to process. Blog is up to date!');
    return;
  }

  // Step 3: Fetch transcripts
  console.log('Step 3: Fetching transcripts...');
  const transcripts = await fetchTranscripts(
    toProcess.map(v => v.id),
    {
      onProgress: (done, total, videoId) => {
        console.log(`  [${done}/${total}] Fetching transcript for ${videoId}...`);
      }
    }
  );

  // Step 4: Generate blog posts
  console.log('\nStep 4: Generating blog posts with AI...');
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const video of toProcess) {
    const transcript = transcripts.get(video.id);
    if (!transcript) {
      console.log(`  Skipping "${video.title}" — no transcript available`);
      skipped++;
      continue;
    }

    try {
      console.log(`  Generating: "${video.title}"...`);
      const slug = await generateBlogPost(anthropicKey, video, transcript);
      console.log(`    ✓ Saved as ${slug}.md`);
      generated++;

      // Small delay between AI calls
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`    ✗ Error: ${error}`);
      errors++;
    }
  }

  // Summary
  console.log('\n=== Pipeline Complete ===');
  console.log(`  Total videos on channel: ${videos.length} (long-form)`);
  console.log(`  Blog posts generated: ${generated}`);
  console.log(`  Skipped (no transcript): ${skipped}`);
  console.log(`  Errors: ${errors}`);

  try {
    const existingPosts = readdirSync(BLOG_DIR).filter(f => f.endsWith('.md')).length;
    console.log(`  Total blog posts: ${existingPosts}`);
  } catch {
    console.log(`  Total blog posts: ${generated}`);
  }
}

main().catch(error => {
  console.error('Pipeline failed:', error);
  process.exit(1);
});
