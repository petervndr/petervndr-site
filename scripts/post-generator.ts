/**
 * AI Blog Post Generator
 * Converts YouTube video transcripts into structured blog posts using Claude.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { categorizeByKeywords, buildClassificationPrompt, type Category, CATEGORIES } from './categorizer.js';
import type { YouTubeVideo } from './youtube-api.js';

const BLOG_DIR = join(process.cwd(), 'src', 'content', 'blog');

interface BlogPostFrontmatter {
  title: string;
  date: string;
  category: Category;
  categoryLabel: string;
  youtubeId: string;
  thumbnail: string;
  description: string;
  duration: string;
  viewCount: number;
}

/**
 * Generate a URL-friendly slug from a title
 */
function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/**
 * Check if a blog post already exists for a video
 */
export function postExists(videoId: string): boolean {
  if (!existsSync(BLOG_DIR)) return false;
  const files = require('fs').readdirSync(BLOG_DIR) as string[];
  return files.some((f: string) => {
    if (!f.endsWith('.md')) return false;
    const content = readFileSync(join(BLOG_DIR, f), 'utf-8');
    return content.includes(`youtubeId: "${videoId}"`);
  });
}

/**
 * Call Claude API to generate a blog post from a transcript
 */
async function generateWithClaude(
  apiKey: string,
  video: YouTubeVideo,
  transcript: string
): Promise<{ content: string; description: string; category: Category }> {
  // First, try keyword categorization
  let category = categorizeByKeywords(video.title, video.description);

  const prompt = `You are converting a YouTube video transcript into a blog post for Peter Vander Wall's website (petervndr.com). Peter is a marketing strategist who works exclusively with accounting firm owners.

VOICE & TONE (match this exactly):
- Direct and no-BS. Tell accountants what they need to hear.
- Conversational authority — like a smart friend who's an expert.
- Story-driven — anchor every point to real examples with specific numbers.
- Pain-first — demonstrate understanding of the problem before offering solutions.
- Simple language — explain marketing terms when used.
- Never use: "crush it," "10x," "hack," "game-changer," "unlock," "skyrocket"
- Never say "guys" — use "firm owners," "accountants," or address directly.

VIDEO TITLE: ${video.title}
VIDEO DESCRIPTION: ${video.description.slice(0, 500)}

TRANSCRIPT:
${transcript.slice(0, 12000)}

INSTRUCTIONS:
1. Write a well-structured blog post (800-1500 words) based on this transcript.
2. Use proper headings (##) to break up sections.
3. Keep Peter's conversational tone and any specific examples/numbers mentioned.
4. Do NOT include the video title as an H1 — that's handled by the template.
5. Do NOT add a conclusion that says "subscribe" or reference YouTube.
6. End with a strong takeaway or actionable next step.

Also provide:
- A meta description (150-160 characters) optimized for SEO
${!category ? '- A category classification (one of: marketing-strategy, client-case-studies, sales-pricing, business-scaling, content-brand)' : ''}

Format your response EXACTLY like this:
---META_DESCRIPTION---
[your meta description here]
${!category ? '---CATEGORY---\n[category slug here]' : ''}
---CONTENT---
[your blog post content here]`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-20250414',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`Claude API error: ${res.status} ${error}`);
  }

  const data = await res.json();
  const responseText = data.content[0].text;

  // Parse response
  const descMatch = responseText.match(/---META_DESCRIPTION---\s*([\s\S]*?)(?=---(?:CATEGORY|CONTENT)---)/);
  const catMatch = responseText.match(/---CATEGORY---\s*([\s\S]*?)(?=---CONTENT---)/);
  const contentMatch = responseText.match(/---CONTENT---\s*([\s\S]*)/);

  const description = descMatch?.[1]?.trim() || `${video.title} — marketing insights for accounting firm owners.`;
  const content = contentMatch?.[1]?.trim() || '';

  if (!category && catMatch) {
    const aiCategory = catMatch[1].trim().toLowerCase() as Category;
    if (aiCategory in CATEGORIES) {
      category = aiCategory;
    }
  }

  // Default category if nothing matched
  if (!category) {
    category = 'marketing-strategy';
  }

  return { content, description, category };
}

/**
 * Generate and save a blog post for a video
 */
export async function generateBlogPost(
  anthropicKey: string,
  video: YouTubeVideo,
  transcript: string
): Promise<string> {
  const slug = slugify(video.title);

  if (!existsSync(BLOG_DIR)) {
    mkdirSync(BLOG_DIR, { recursive: true });
  }

  const { content, description, category } = await generateWithClaude(
    anthropicKey,
    video,
    transcript
  );

  const frontmatter: BlogPostFrontmatter = {
    title: video.title.replace(/"/g, '\\"'),
    date: video.publishedAt.split('T')[0],
    category,
    categoryLabel: CATEGORIES[category],
    youtubeId: video.id,
    thumbnail: video.thumbnail,
    description: description.replace(/"/g, '\\"'),
    duration: video.duration,
    viewCount: video.viewCount,
  };

  const markdown = `---
title: "${frontmatter.title}"
date: "${frontmatter.date}"
category: "${frontmatter.category}"
categoryLabel: "${frontmatter.categoryLabel}"
youtubeId: "${frontmatter.youtubeId}"
thumbnail: "${frontmatter.thumbnail}"
description: "${frontmatter.description}"
duration: "${frontmatter.duration}"
viewCount: ${frontmatter.viewCount}
---

${content}
`;

  const filePath = join(BLOG_DIR, `${slug}.md`);
  writeFileSync(filePath, markdown, 'utf-8');

  return slug;
}
