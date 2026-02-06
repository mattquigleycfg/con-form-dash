import { type DetailedMetrics, type TrafficSourceData } from "@/hooks/useWebsiteAnalytics";

export interface AIInsight {
  type: "success" | "warning" | "opportunity" | "info";
  metric: string;
  value: string;
  insight: string;
  suggestions: string[];
  priority: "high" | "medium" | "low";
}

// Construction industry benchmarks (B2B)
const BENCHMARKS = {
  bounceRate: { good: 0.4, acceptable: 0.6 },
  engagementRate: { good: 0.6, acceptable: 0.4 },
  pagesPerSession: { good: 3, acceptable: 2 },
  avgSessionDuration: { good: 180, acceptable: 120 }, // seconds
  organicTrafficPercent: { good: 40, acceptable: 20 },
};

export function generateMarketingInsights(
  metrics?: DetailedMetrics,
  sources?: TrafficSourceData[]
): AIInsight[] {
  if (!metrics) return [];

  const insights: AIInsight[] = [];

  // Analyze Bounce Rate
  if (metrics.bounceRate > BENCHMARKS.bounceRate.acceptable) {
    insights.push({
      type: "warning",
      metric: "Bounce Rate",
      value: `${(metrics.bounceRate * 100).toFixed(1)}%`,
      insight: "Your bounce rate is above the construction industry average (40-60%)",
      suggestions: [
        "Improve page load speed - target under 3 seconds",
        "Ensure content matches search intent for landing pages",
        "Add compelling CTAs above the fold",
        "Optimize for mobile experience (many contractors browse on-site)",
        "Include trust signals: certifications, case studies, testimonials",
      ],
      priority: "high",
    });
  } else if (metrics.bounceRate < BENCHMARKS.bounceRate.good) {
    insights.push({
      type: "success",
      metric: "Bounce Rate",
      value: `${(metrics.bounceRate * 100).toFixed(1)}%`,
      insight: "Excellent bounce rate! Your content is highly engaging",
      suggestions: [
        "Maintain content quality and relevance",
        "Continue A/B testing landing pages",
        "Document what's working to replicate success",
      ],
      priority: "low",
    });
  }

  // Analyze Engagement Rate
  if (metrics.engagementRate < BENCHMARKS.engagementRate.acceptable) {
    insights.push({
      type: "warning",
      metric: "Engagement Rate",
      value: `${(metrics.engagementRate * 100).toFixed(1)}%`,
      insight: "Low user engagement detected",
      suggestions: [
        "Add video content showcasing projects and expertise",
        "Create interactive calculators or quote forms",
        "Implement chat support for immediate assistance",
        "Add project galleries with before/after comparisons",
        "Include detailed case studies with ROI data",
      ],
      priority: "high",
    });
  } else if (metrics.engagementRate > BENCHMARKS.engagementRate.good) {
    insights.push({
      type: "success",
      metric: "Engagement Rate",
      value: `${(metrics.engagementRate * 100).toFixed(1)}%`,
      insight: "Outstanding engagement! Users are actively interacting with your content",
      suggestions: [
        "Identify your highest-engagement pages and create similar content",
        "Add conversion tracking to engaged sessions",
        "Consider retargeting highly engaged users",
      ],
      priority: "low",
    });
  }

  // Analyze Pages per Session
  if (metrics.pagesPerSession < BENCHMARKS.pagesPerSession.acceptable) {
    insights.push({
      type: "opportunity",
      metric: "Pages per Session",
      value: metrics.pagesPerSession.toFixed(1),
      insight: "Users aren't exploring multiple pages - opportunity to improve site navigation",
      suggestions: [
        "Improve internal linking between related services",
        "Add 'Related Projects' sections to project pages",
        "Create clear navigation paths to key pages (Services → Projects → Contact)",
        "Implement breadcrumb navigation",
        "Add 'Next Steps' CTAs at the bottom of content pages",
      ],
      priority: "medium",
    });
  }

  // Analyze Session Duration
  if (metrics.avgSessionDuration < BENCHMARKS.avgSessionDuration.acceptable) {
    insights.push({
      type: "opportunity",
      metric: "Session Duration",
      value: `${Math.floor(metrics.avgSessionDuration / 60)}m ${Math.floor(metrics.avgSessionDuration % 60)}s`,
      insight: "Short session times suggest users aren't finding what they need",
      suggestions: [
        "Add detailed service descriptions with technical specs",
        "Include comprehensive project portfolios",
        "Create in-depth guides for construction processes",
        "Add FAQ sections to answer common questions",
        "Ensure critical information is easy to find",
      ],
      priority: "medium",
    });
  }

  // Analyze Traffic Sources
  if (sources && sources.length > 0) {
    const totalSessions = sources.reduce((sum, s) => sum + s.sessions, 0);
    const organicTraffic = sources.find(s => s.medium === 'organic' || s.source.toLowerCase().includes('google'));
    const organicPercent = organicTraffic ? (organicTraffic.sessions / totalSessions) * 100 : 0;

    if (organicPercent < BENCHMARKS.organicTrafficPercent.acceptable) {
      insights.push({
        type: "opportunity",
        metric: "Organic Search Traffic",
        value: `${organicPercent.toFixed(1)}%`,
        insight: "Organic search traffic is below industry benchmarks (40%+)",
        suggestions: [
          "Conduct keyword research for construction-specific terms",
          "Optimize for local SEO (location + service keywords)",
          "Create content targeting 'commercial construction', 'industrial projects', etc.",
          "Build quality backlinks from industry associations and suppliers",
          "Implement schema markup for construction services",
          "List on construction industry directories",
        ],
        priority: "high",
      });
    }

    const directTraffic = sources.find(s => s.source === '(direct)');
    const directPercent = directTraffic ? (directTraffic.sessions / totalSessions) * 100 : 0;

    if (directPercent > 30) {
      insights.push({
        type: "success",
        metric: "Direct Traffic",
        value: `${directPercent.toFixed(1)}%`,
        insight: "Strong brand awareness! Many users are coming directly to your site",
        suggestions: [
          "Capitalize on brand recognition with content marketing",
          "Consider email marketing to nurture these leads",
          "Create loyalty programs for repeat customers",
        ],
        priority: "low",
      });
    }
  }

  // Analyze User Mix (New vs Returning)
  const newUserPercent = metrics.totalUsers > 0 ? (metrics.newUsers / metrics.totalUsers) * 100 : 0;
  
  if (newUserPercent > 80) {
    insights.push({
      type: "opportunity",
      metric: "Visitor Retention",
      value: `${newUserPercent.toFixed(0)}% new users`,
      insight: "Most visitors are first-time users - opportunity to build repeat traffic",
      suggestions: [
        "Implement retargeting campaigns for past visitors",
        "Create email capture with valuable content (guides, checklists)",
        "Build a newsletter with industry insights and project updates",
        "Offer project estimation tools requiring registration",
        "Add bookmark-worthy resources (cost calculators, planning guides)",
      ],
      priority: "medium",
    });
  }

  // Overall performance summary
  const goodMetrics = insights.filter(i => i.type === "success").length;
  const totalAnalyzed = insights.length;

  if (goodMetrics === 0 && totalAnalyzed > 2) {
    insights.unshift({
      type: "info",
      metric: "Overall Performance",
      value: "Multiple Opportunities",
      insight: "Your analytics show several areas for improvement - prioritize high-impact changes",
      suggestions: [
        "Focus on high-priority items first (bounce rate, engagement, organic traffic)",
        "Implement changes incrementally and measure impact",
        "Consider A/B testing major changes before full rollout",
        "Set up conversion tracking to measure ROI of improvements",
      ],
      priority: "high",
    });
  }

  // Sort by priority
  return insights.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

export const GA4_RESOURCES = [
  {
    title: "GA4 Documentation",
    description: "Official Google Analytics 4 documentation",
    url: "https://support.google.com/analytics/answer/9304153",
    category: "Getting Started",
  },
  {
    title: "Understanding Engagement Rate",
    description: "Learn how GA4 calculates engagement metrics",
    url: "https://support.google.com/analytics/answer/12195621",
    category: "Metrics",
  },
  {
    title: "Traffic Acquisition Reports",
    description: "Analyze where your users come from",
    url: "https://support.google.com/analytics/answer/9355949",
    category: "Reports",
  },
  {
    title: "Setting Up Conversions",
    description: "Track important business goals",
    url: "https://support.google.com/analytics/answer/9267735",
    category: "Conversions",
  },
  {
    title: "Bounce Rate vs Engagement Rate",
    description: "Key differences in GA4 metrics",
    url: "https://support.google.com/analytics/answer/12195621",
    category: "Metrics",
  },
];

export const MARKETING_PROMPTS = [
  "How can I improve my website's bounce rate?",
  "What's a good engagement rate for B2B construction companies?",
  "How do I interpret my traffic source data?",
  "What are the best practices for landing page optimization?",
  "How can I increase organic search traffic?",
  "What metrics should I focus on for lead generation?",
  "How do I set up conversion tracking in GA4?",
  "What's the difference between sessions and users?",
  "How can I improve time on site?",
  "What are effective CTAs for construction websites?",
];
