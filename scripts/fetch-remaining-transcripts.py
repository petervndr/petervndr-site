#!/usr/bin/env python3
"""
Fetch remaining transcripts that weren't cached yet.
Uses 5-second delays to avoid rate limiting.
"""
import sys
import os
import re
import time
import json

# Get video IDs from stdin (one per line)
transcripts_dir = os.path.join(os.getcwd(), 'src', 'content', 'transcripts')
os.makedirs(transcripts_dir, exist_ok=True)

# Read video data from stdin
video_ids = []
for line in sys.stdin:
    line = line.strip()
    if line:
        video_ids.append(line)

if not video_ids:
    print("No video IDs provided", file=sys.stderr)
    sys.exit(1)

# Filter to ones not already cached
to_fetch = [vid for vid in video_ids if not os.path.exists(os.path.join(transcripts_dir, f"{vid}.txt"))]
print(f"Need to fetch: {len(to_fetch)} (already cached: {len(video_ids) - len(to_fetch)})", file=sys.stderr)

from youtube_transcript_api import YouTubeTranscriptApi
api = YouTubeTranscriptApi()

fetched = 0
failed = 0

for i, vid_id in enumerate(to_fetch):
    try:
        transcript = api.fetch(vid_id)
        text = ' '.join(t.text for t in transcript)
        text = re.sub(r'\s+', ' ', text).strip()
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'")
        text = re.sub(r'\[Music\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Applause\]', '', text, flags=re.IGNORECASE)
        text = text.strip()

        if text:
            filepath = os.path.join(transcripts_dir, f"{vid_id}.txt")
            with open(filepath, 'w') as f:
                f.write(text)
            fetched += 1
            print(f"  [{i+1}/{len(to_fetch)}] ✓ {vid_id} ({len(text)} chars)", file=sys.stderr)
        else:
            failed += 1
            print(f"  [{i+1}/{len(to_fetch)}] - {vid_id} (empty)", file=sys.stderr)
    except Exception as e:
        failed += 1
        err = str(e)[:100]
        print(f"  [{i+1}/{len(to_fetch)}] x {vid_id}: {err}", file=sys.stderr)

    # Longer delay to avoid rate limiting
    if i < len(to_fetch) - 1:
        time.sleep(5)

print(f"\nDone: {fetched} fetched, {failed} failed", file=sys.stderr)
