import { fetchTranscripts } from './transcript-fetcher.js';

const testIds = ['TIU36TVn5W4', 'gO7lH1motAo', 'fx7rW0d1NQU'];

const results = await fetchTranscripts(testIds, {
  onProgress: (done, total, videoId) => {
    console.log(`  [${done}/${total}] Fetching transcript for ${videoId}...`);
  }
});

for (const [id, text] of results) {
  console.log(`\n${id}: ${text.length} chars`);
  console.log(`  First 200: ${text.slice(0, 200)}`);
}

console.log(`\nSuccess: ${results.size}/${testIds.length}`);
