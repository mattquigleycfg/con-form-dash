import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";

export interface GoogleAnalyticsMetrics {
  websiteSessionsWeek: number;
  websiteSessionsMonth: number;
  websiteSessionsYTD: number;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
}

/**
 * Hook to fetch Google Analytics metrics
 * 
 * SETUP REQUIRED:
 * 1. Create Google Analytics Data API credentials
 * 2. Add to Supabase Edge Function secrets:
 *    - GA4_PROPERTY_ID (e.g., "355745027")
 *    - GA4_CREDENTIALS (JSON service account key)
 * 3. Create edge function: supabase/functions/google-analytics-query
 * 
 * For now, this returns placeholder data.
 * Uncomment the API call once Edge Function is deployed.
 */
export function useGoogleAnalytics(period: DatePeriod = "month") {
  return useQuery({
    queryKey: ["google-analytics", period],
    queryFn: async (): Promise<GoogleAnalyticsMetrics> => {
      const { start, end } = getDateRange(period);

      // TODO: Uncomment when GA4 Edge Function is ready
      /*
      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          propertyId: "355745027", // Your GA4 Property ID
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          metrics: [
            "sessions",
            "totalUsers",
            "activeUsers",
            "newUsers",
            "screenPageViews",
            "averageSessionDuration",
            "bounceRate",
          ],
        },
      });

      if (error) throw error;
      return data as GoogleAnalyticsMetrics;
      */

      // PLACEHOLDER DATA - Replace with actual GA4 API call
      console.log("📊 Google Analytics: Using placeholder data (Edge Function not yet deployed)");
      
      // Calculate ranges for week/month/ytd
      const weekRange = getDateRange("week");
      const monthRange = getDateRange("month");
      const ytdRange = getDateRange("ytd");

      return {
        websiteSessionsWeek: 0,
        websiteSessionsMonth: 0,
        websiteSessionsYTD: 0,
        totalUsers: 0,
        activeUsers: 0,
        newUsers: 0,
        pageviews: 0,
        avgSessionDuration: 0,
        bounceRate: 0,
      };
    },
    staleTime: 1000 * 60 * 60, // 1 hour (GA data doesn't change rapidly)
    refetchInterval: 1000 * 60 * 60, // Auto-refresh every hour
    enabled: false, // Disable until Edge Function is deployed
  });
}

