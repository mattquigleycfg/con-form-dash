import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SocialMediaMetrics {
  id?: string;
  linkedin_followers: number;
  facebook_followers: number;
  instagram_followers: number;
  updated_at: string;
  updated_by_user_id?: string;
}

export interface SocialMediaGrowth {
  platform: string;
  current: number;
  previous: number;
  growth: number;
  growthPercent: number;
}

/**
 * Fetches the latest social media follower counts
 */
async function fetchLatestMetrics(): Promise<SocialMediaMetrics | null> {
  const { data, error } = await supabase
    .from("social_media_metrics")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    // If no data exists yet, return defaults
    if (error.code === "PGRST116") {
      console.log("📱 No social media metrics found, returning defaults");
      return {
        linkedin_followers: 2578, // From LinkedIn page
        facebook_followers: 0,
        instagram_followers: 0,
        updated_at: new Date().toISOString(),
      };
    }
    throw error;
  }

  return data as SocialMediaMetrics;
}

/**
 * Fetches historical metrics for growth calculation
 */
async function fetchPreviousMetrics(daysAgo: number): Promise<SocialMediaMetrics | null> {
  const dateThreshold = new Date();
  dateThreshold.setDate(dateThreshold.getDate() - daysAgo);

  const { data, error } = await supabase
    .from("social_media_metrics")
    .select("*")
    .lte("updated_at", dateThreshold.toISOString())
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") {
    console.warn("Could not fetch previous metrics:", error);
  }

  return data as SocialMediaMetrics | null;
}

/**
 * Calculates growth metrics
 */
function calculateGrowth(
  current: SocialMediaMetrics,
  previous: SocialMediaMetrics | null
): SocialMediaGrowth[] {
  const platforms = [
    { name: "LinkedIn", currentKey: "linkedin_followers" as const },
    { name: "Facebook", currentKey: "facebook_followers" as const },
    { name: "Instagram", currentKey: "instagram_followers" as const },
  ];

  return platforms.map(({ name, currentKey }) => {
    const currentValue = current[currentKey];
    const previousValue = previous?.[currentKey] ?? currentValue;
    const growth = currentValue - previousValue;
    const growthPercent = previousValue > 0 ? (growth / previousValue) * 100 : 0;

    return {
      platform: name,
      current: currentValue,
      previous: previousValue,
      growth,
      growthPercent: Math.round(growthPercent * 10) / 10,
    };
  });
}

/**
 * Hook to fetch social media metrics
 */
export function useSocialMediaMetrics() {
  return useQuery({
    queryKey: ["social-media-metrics"],
    queryFn: async () => {
      const current = await fetchLatestMetrics();
      if (!current) {
        return {
          current: {
            linkedin_followers: 2578,
            facebook_followers: 0,
            instagram_followers: 0,
            updated_at: new Date().toISOString(),
          },
          growth: [],
        };
      }

      const previous = await fetchPreviousMetrics(30); // 30 days ago
      const growth = calculateGrowth(current, previous);

      console.log("📱 Social Media Metrics:", {
        linkedin: current.linkedin_followers,
        facebook: current.facebook_followers,
        instagram: current.instagram_followers,
        lastUpdated: current.updated_at,
      });

      return { current, growth };
    },
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchInterval: 1000 * 60 * 60, // Auto-refresh every hour
  });
}

/**
 * Hook to update social media metrics
 */
export function useUpdateSocialMediaMetrics() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (metrics: Partial<SocialMediaMetrics>) => {
      const { data: { user } } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("social_media_metrics")
        .insert([
          {
            ...metrics,
            updated_by_user_id: user?.id,
          },
        ])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["social-media-metrics"] });
      console.log("✅ Social media metrics updated");
    },
  });
}

