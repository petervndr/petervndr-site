#!/usr/bin/env python3
"""
Fetch YouTube transcript for a single video ID.
Outputs clean transcript text to stdout.
Exit code 0 = success, 1 = no transcript available, 2 = error.
"""

import sys
import re

def main():
    if len(sys.argv) < 2:
        print("Usage: fetch-transcript.py <video_id>", file=sys.stderr)
        sys.exit(2)

    video_id = sys.argv[1]

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        api = YouTubeTranscriptApi()
        transcript = api.fetch(video_id)

        text = ' '.join(t.text for t in transcript)
        # Clean up
        text = re.sub(r'\s+', ' ', text).strip()
        text = text.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>')
        text = text.replace('&quot;', '"').replace('&#39;', "'")
        text = re.sub(r'\[Music\]', '', text, flags=re.IGNORECASE)
        text = re.sub(r'\[Applause\]', '', text, flags=re.IGNORECASE)
        text = text.strip()

        if not text:
            sys.exit(1)

        print(text)
        sys.exit(0)

    except Exception as e:
        error_msg = str(e)
        if 'disabled' in error_msg.lower() or 'not available' in error_msg.lower():
            sys.exit(1)
        print(f"Error: {error_msg[:200]}", file=sys.stderr)
        sys.exit(2)

if __name__ == '__main__':
    main()
