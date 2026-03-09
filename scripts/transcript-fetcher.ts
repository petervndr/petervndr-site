/**
 * YouTube Transcript Fetcher
 * Shells out to Python's youtube-transcript-api (more reliable than Node alternatives).
 * Caches transcripts as text files in src/content/transcripts/.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const TRANSCRIPTS_DIR = join(process.cwd(), 'src', 'content', 'transcripts');
const PYTHON_BIN = '/tmp/yt-venv/bin/python3.12';
const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const FETCH_SCRIPT = join(SCRIPT_DIR, 'fetch-transcript.py');
const RATE_LIMIT_MS = 1500; // 1.5 seconds between requests

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch transcript for a single video via Python
 */
function fetchTranscriptFromYouTube(videoId: string): string | null {
  try {
    const result = execFileSync(PYTHON_BIN, [FETCH_SCRIPT, videoId], {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const text = result.trim();
    return text.length > 0 ? text : null;
  } catch (error: any) {
    // Exit code 1 = no transcript available (expected)
    if (error?.status === 1) return null;
    // Exit code 2 = actual error
    const stderr = error?.stderr?.toString().trim();
    if (stderr) {
      console.error(`  Error fetching transcript for ${videoId}: ${stderr.slice(0, 150)}`);
    }
    return null;
  }
}

/**
 * Check if a transcript already exists in the cache
 */
export function transcriptExists(videoId: string): boolean {
  return existsSync(join(TRANSCRIPTS_DIR, `${videoId}.txt`));
}

/**
 * Read a cached transcript
 */
export function readTranscript(videoId: string): string | null {
  const path = join(TRANSCRIPTS_DIR, `${videoId}.txt`);
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

/**
 * Save a transcript to the cache
 */
function saveTranscript(videoId: string, text: string): void {
  if (!existsSync(TRANSCRIPTS_DIR)) {
    mkdirSync(TRANSCRIPTS_DIR, { recursive: true });
  }
  writeFileSync(join(TRANSCRIPTS_DIR, `${videoId}.txt`), text, 'utf-8');
}

/**
 * Fetch and cache transcripts for a list of video IDs.
 * Skips videos that already have cached transcripts.
 * Returns a map of videoId -> transcript text.
 */
export async function fetchTranscripts(
  videoIds: string[],
  options: { onProgress?: (done: number, total: number, videoId: string) => void } = {}
): Promise<Map<string, string>> {
  const results = new Map<string, string>();
  const toFetch = videoIds.filter(id => !transcriptExists(id));

  // Load cached transcripts
  for (const id of videoIds) {
    const cached = readTranscript(id);
    if (cached) {
      results.set(id, cached);
    }
  }

  console.log(`Transcripts: ${results.size} cached, ${toFetch.length} to fetch`);

  // Fetch missing transcripts with rate limiting
  for (let i = 0; i < toFetch.length; i++) {
    const videoId = toFetch[i];
    options.onProgress?.(i + 1, toFetch.length, videoId);

    const transcript = fetchTranscriptFromYouTube(videoId);
    if (transcript) {
      saveTranscript(videoId, transcript);
      results.set(videoId, transcript);
    } else {
      console.warn(`  No transcript available for ${videoId}`);
    }

    // Rate limit (skip delay on last item)
    if (i < toFetch.length - 1) {
      await sleep(RATE_LIMIT_MS);
    }
  }

  return results;
}
