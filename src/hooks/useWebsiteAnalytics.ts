import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getDateRange, type DatePeriod } from "@/utils/dateHelpers";

// Types for different query responses
export interface TopPageData {
  pagePath: string;
  pageTitle: string;
  views: number;
  users: number;
  avgDuration: number;
  bounceRate: number;
}

export interface TrafficSourceData {
  source: string;
  medium: string;
  sessions: number;
  users: number;
  newUsers: number;
  bounceRate: number;
  engagementRate: number;
}

export interface TimeSeriesData {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
}

export interface DetailedMetrics {
  sessions: number;
  totalUsers: number;
  activeUsers: number;
  newUsers: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
  engagementRate: number;
  pagesPerSession: number;
}

/**
 * Fetch detailed website traffic metrics
 */
export function useWebsiteTraffic(period: DatePeriod = "month") {
  return useQuery({
    queryKey: ["website-traffic", period],
    queryFn: async (): Promise<DetailedMetrics> => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          queryType: "summary",
          propertyId: "355745027",
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
            "engagementRate",
          ],
        },
      });

      if (error) {
        console.error("Website traffic error:", error);
        throw error;
      }

      // The Edge Function returns pre-transformed summary data
      // Extract sessions based on period
      const sessions = period === 'week' 
        ? (data?.websiteSessionsWeek || 0)
        : period === 'month'
        ? (data?.websiteSessionsMonth || 0)
        : (data?.websiteSessionsYTD || 0);

      const pageviews = data?.pageviews || 0;

      return {
        sessions,
        totalUsers: data?.totalUsers || 0,
        activeUsers: data?.activeUsers || 0,
        newUsers: data?.newUsers || 0,
        pageviews,
        avgSessionDuration: data?.avgSessionDuration || 0,
        bounceRate: data?.bounceRate || 0,
        engagementRate: data?.engagementRate || 0,
        pagesPerSession: sessions > 0 ? pageviews / sessions : 0,
      };
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30,
  });
}

/**
 * Fetch top pages by views
 */
export function useTopPages(period: DatePeriod = "month", limit: number = 10) {
  return useQuery({
    queryKey: ["top-pages", period, limit],
    queryFn: async (): Promise<TopPageData[]> => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          queryType: "topPages",
          propertyId: "355745027",
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          limit,
        },
      });

      if (error) {
        console.error("Top pages error:", error);
        return [];
      }

      return data as TopPageData[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30,
  });
}

/**
 * Fetch traffic acquisition sources
 */
export function useTrafficSources(period: DatePeriod = "month", limit: number = 10) {
  return useQuery({
    queryKey: ["traffic-sources", period, limit],
    queryFn: async (): Promise<TrafficSourceData[]> => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          queryType: "acquisition",
          propertyId: "355745027",
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          limit,
        },
      });

      if (error) {
        console.error("Traffic sources error:", error);
        return [];
      }

      return data as TrafficSourceData[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30,
  });
}

/**
 * Fetch time series data for trend charts
 */
export function useTrafficTimeSeries(period: DatePeriod = "month") {
  return useQuery({
    queryKey: ["traffic-timeseries", period],
    queryFn: async (): Promise<TimeSeriesData[]> => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          queryType: "timeSeries",
          propertyId: "355745027",
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
        },
      });

      if (error) {
        console.error("Time series error:", error);
        return [];
      }

      return data as TimeSeriesData[];
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30,
  });
}

/**
 * Fetch landing pages data
 */
export function useLandingPages(period: DatePeriod = "month", limit: number = 10) {
  return useQuery({
    queryKey: ["landing-pages", period, limit],
    queryFn: async (): Promise<TopPageData[]> => {
      const { start, end } = getDateRange(period);

      const { data, error } = await supabase.functions.invoke("google-analytics-query", {
        body: {
          propertyId: "355745027",
          startDate: start.toISOString().split('T')[0],
          endDate: end.toISOString().split('T')[0],
          metrics: ["sessions", "activeUsers", "averageSessionDuration", "bounceRate"],
          dimensions: ["landingPage"],
          limit,
        },
      });

      if (error) {
        console.error("Landing pages error:", error);
        return [];
      }

      // Transform to match TopPageData format
      return (data?.rows || []).map((row: any) => ({
        pagePath: row.dimensionValues?.[0]?.value || '',
        pageTitle: row.dimensionValues?.[0]?.value || '', // landingPage doesn't have title
        views: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || '0'),
      }));
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    refetchInterval: 1000 * 60 * 30,
  });
}
