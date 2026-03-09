/**
 * Auto-categorization for blog posts
 * Hybrid approach: keyword rules first, AI fallback for ambiguous content.
 */

export type Category =
  | 'marketing-strategy'
  | 'client-case-studies'
  | 'sales-pricing'
  | 'business-scaling'
  | 'content-brand';

export const CATEGORIES: Record<Category, string> = {
  'marketing-strategy': 'Marketing Strategy',
  'client-case-studies': 'Client Case Studies',
  'sales-pricing': 'Sales & Pricing',
  'business-scaling': 'Business Scaling',
  'content-brand': 'Content & Brand',
};

// Keyword rules — checked against title + description (lowercased)
const KEYWORD_RULES: { category: Category; keywords: string[]; weight: number }[] = [
  // Case studies — match on client names and result indicators
  {
    category: 'client-case-studies',
    keywords: [
      'ryan bakke', 'tax strategy 365',
      'brock hartzler', 'promover', 'pro mover',
      'daniel koehler', 'gtg tax',
      'brian mayoral', 'wesellup', 'we sell up',
      'zokpia', 'zopia',
      'rudy rodriguez', 'freedom from accounting',
      'case study', 'client result', 'client story',
      'how i helped', 'how we helped',
      'scaled from', 'went from', 'grew from',
    ],
    weight: 3,
  },
  // Marketing strategy
  {
    category: 'marketing-strategy',
    keywords: [
      'facebook ads', 'meta ads', 'ad funnel', 'ads for',
      'vsl', 'video sales letter',
      'lead gen', 'lead generation', 'leads for',
      'funnel', 'landing page',
      'marketing for accountant', 'marketing for accounting',
      'email marketing', 'email list', 'nurture',
      'seo for accountant', 'google ads',
      'cpa marketing', 'bookkeeping marketing',
      'get clients', 'get bookkeeping clients', 'get tax clients',
      'messaging', 'copywriting', 'offer',
      'crm', 'gohighlevel', 'go high level',
      'acquisition system', 'client acquisition',
      'content marketing', 'social media marketing',
    ],
    weight: 2,
  },
  // Sales & pricing
  {
    category: 'sales-pricing',
    keywords: [
      'sales', 'selling', 'close', 'closing',
      'objection', 'pricing', 'price',
      'proposal', 'discovery call', 'sales call',
      'charge more', 'raise your price', 'fee',
      'value pricing', 'fixed fee', 'retainer',
      'upsell', 'cross-sell',
      'cold traffic', 'warm traffic',
      'show rate', 'close rate', 'conversion rate',
    ],
    weight: 2,
  },
  // Business scaling
  {
    category: 'business-scaling',
    keywords: [
      'scaling', 'scale your', 'grow your firm',
      'hiring', 'team', 'employees', 'contractor',
      'niche', 'niching', 'specialize',
      'operations', 'systems', 'process',
      'enterprise value', 'exit', 'sell your firm',
      'revenue', 'profit', 'overhead',
      'delegation', 'authority transfer', 'drake feature',
      'referral', 'referrals', 'word of mouth',
      'plateau', 'bottleneck',
    ],
    weight: 2,
  },
  // Content & brand
  {
    category: 'content-brand',
    keywords: [
      'youtube', 'podcast', 'content creation',
      'personal brand', 'branding', 'brand building',
      'social media', 'instagram', 'tiktok', 'linkedin',
      'video', 'camera', 'thumbnail',
      'thought leader', 'authority',
    ],
    weight: 1,
  },
];

/**
 * Categorize using keyword rules.
 * Returns the category with the highest weighted score, or null if ambiguous.
 */
export function categorizeByKeywords(title: string, description: string): Category | null {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<Category, number> = {
    'marketing-strategy': 0,
    'client-case-studies': 0,
    'sales-pricing': 0,
    'business-scaling': 0,
    'content-brand': 0,
  };

  for (const rule of KEYWORD_RULES) {
    for (const keyword of rule.keywords) {
      if (text.includes(keyword)) {
        scores[rule.category] += rule.weight;
      }
    }
  }

  // Find the top score
  const entries = Object.entries(scores) as [Category, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const topScore = entries[0][1];
  const secondScore = entries[1][1];

  // Return top category if it clearly wins (>= 2 point lead), or if it's strong (>= 4)
  if (topScore === 0) return null;
  if (topScore >= 4 || topScore - secondScore >= 2) {
    return entries[0][0];
  }

  // Ambiguous — needs AI fallback
  return null;
}

/**
 * Build a prompt for AI classification fallback
 */
export function buildClassificationPrompt(title: string, description: string): string {
  return `Classify this YouTube video into exactly ONE category. Return ONLY the category slug, nothing else.

Categories:
- marketing-strategy (Facebook ads, funnels, VSLs, lead gen, messaging, content strategy for accounting firms)
- client-case-studies (specific client stories with names and revenue numbers)
- sales-pricing (sales process, objection handling, pricing models, closing, proposals)
- business-scaling (hiring, operations, niching, delegation, growth strategy, exit planning)
- content-brand (personal branding, content creation, YouTube strategy, social media)

Video title: ${title}
Video description: ${description.slice(0, 500)}

Category slug:`;
}
