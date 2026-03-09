/**
 * Fetch transcripts for all videos in /tmp/longform-videos.json
 */
import { fetchTranscripts, transcriptExists } from './transcript-fetcher.js';
import { readFileSync } from 'fs';

async function main() {
  const videos = JSON.parse(readFileSync('/tmp/longform-videos.json', 'utf-8'));
  const ids = videos.map((v: any) => v.id);

  // Check how many already cached
  const cached = ids.filter((id: string) => transcriptExists(id));
  const needed = ids.filter((id: string) => !transcriptExists(id));
  console.log(`${cached.length} transcripts cached, ${needed.length} to fetch`);

  const transcripts = await fetchTranscripts(ids, {
    onProgress: (done, total, videoId) => {
      console.log(`  [${done}/${total}] ${videoId}`);
    }
  });

  console.log(`\nTotal transcripts available: ${transcripts.size} / ${ids.length}`);

  // List any failures
  const missing = ids.filter((id: string) => !transcripts.has(id));
  if (missing.length > 0) {
    console.log(`\nMissing transcripts (${missing.length}):`);
    for (const id of missing) {
      const v = videos.find((v: any) => v.id === id);
      console.log(`  ${id} — ${v?.title}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
