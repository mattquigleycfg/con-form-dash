import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { queryType = 'summary', propertyId, startDate, endDate, metrics, dimensions, limit = 10 } = await req.json();

    const GA4_PROPERTY_ID = propertyId || Deno.env.get('GA4_PROPERTY_ID');
    const GA4_CLIENT_ID = Deno.env.get('GA4_CLIENT_ID');
    const GA4_CLIENT_SECRET = Deno.env.get('GA4_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GA4_PROPERTY_ID || !GA4_CLIENT_ID || !GA4_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get refresh token from Supabase using REST API
    const settingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/settings?key=eq.ga4_refresh_token&select=value`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      }
    });

    if (!settingsResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'GA4 not authorized. Please authorize first.',
          authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GA4_CLIENT_ID}&redirect_uri=${SUPABASE_URL}/functions/v1/google-analytics-auth&response_type=code&scope=https://www.googleapis.com/auth/analytics.readonly&access_type=offline&prompt=consent`
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settingsData = await settingsResponse.json();
    if (!settingsData || settingsData.length === 0) {
      return new Response(
        JSON.stringify({ 
          error: 'GA4 not authorized. Please authorize first.',
          authUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GA4_CLIENT_ID}&redirect_uri=${SUPABASE_URL}/functions/v1/google-analytics-auth&response_type=code&scope=https://www.googleapis.com/auth/analytics.readonly&access_type=offline&prompt=consent`
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const refreshToken = settingsData[0].value;

    // Get access token using refresh token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GA4_CLIENT_ID,
        client_secret: GA4_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token refresh failed:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to refresh access token', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { access_token } = await tokenResponse.json();

    // Build GA4 API request based on query type
    let ga4RequestBody: any = {
      dateRanges: [{ startDate, endDate }],
    };

    // Track requested metric names for proper index mapping in response
    let summaryMetricNames: string[] = [];

    if (queryType === 'summary') {
      // Summary query - include all standard metrics
      summaryMetricNames = metrics || [
        "sessions", "totalUsers", "activeUsers", "newUsers", "screenPageViews",
        "averageSessionDuration", "bounceRate", "engagementRate"
      ];
      ga4RequestBody.metrics = summaryMetricNames.map((m: string) => ({ name: m }));
    } else if (queryType === 'topPages') {
      // Top pages query with dimensions
      ga4RequestBody.metrics = [
        { name: "screenPageViews" },
        { name: "activeUsers" },
        { name: "averageSessionDuration" },
        { name: "bounceRate" }
      ];
      ga4RequestBody.dimensions = [
        { name: "pagePath" },
        { name: "pageTitle" }
      ];
      ga4RequestBody.limit = limit;
      ga4RequestBody.orderBys = [{ metric: { metricName: "screenPageViews" }, desc: true }];
    } else if (queryType === 'acquisition') {
      // Traffic acquisition query
      ga4RequestBody.metrics = [
        { name: "sessions" },
        { name: "activeUsers" },
        { name: "newUsers" },
        { name: "bounceRate" },
        { name: "engagementRate" }
      ];
      ga4RequestBody.dimensions = [
        { name: "sessionSource" },
        { name: "sessionMedium" }
      ];
      ga4RequestBody.limit = limit;
      ga4RequestBody.orderBys = [{ metric: { metricName: "sessions" }, desc: true }];
    } else if (queryType === 'timeSeries') {
      // Time series query for charts
      ga4RequestBody.metrics = (metrics || [
        "sessions", "activeUsers", "screenPageViews"
      ]).map((m: string) => ({ name: m }));
      ga4RequestBody.dimensions = [{ name: "date" }];
      ga4RequestBody.orderBys = [{ dimension: { dimensionName: "date" }, desc: false }];
    } else {
      // Custom query with provided metrics and dimensions
      if (metrics) ga4RequestBody.metrics = metrics.map((m: string) => ({ name: m }));
      if (dimensions) ga4RequestBody.dimensions = dimensions.map((d: string) => ({ name: d }));
      if (limit) ga4RequestBody.limit = limit;
    }

    // Query GA4 Data API
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ga4RequestBody),
      }
    );

    if (!ga4Response.ok) {
      const error = await ga4Response.text();
      console.error('GA4 API call failed:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch GA4 data', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ga4Data = await ga4Response.json();

    // Transform response based on query type
    let response: any;

    if (queryType === 'summary') {
      // Transform summary data using name-based mapping (not positional indices)
      const row = ga4Data.rows?.[0];
      const metricValues = row?.metricValues || [];

      // Build a name→value map so we don't depend on metric order
      const metricMap: Record<string, string> = {};
      summaryMetricNames.forEach((name: string, index: number) => {
        metricMap[name] = metricValues[index]?.value || '0';
      });

      const sessions = parseInt(metricMap['sessions'] || '0');

      response = {
        websiteSessionsWeek: 0,
        websiteSessionsMonth: 0,
        websiteSessionsYTD: 0,
        totalUsers: parseInt(metricMap['totalUsers'] || '0'),
        activeUsers: parseInt(metricMap['activeUsers'] || '0'),
        newUsers: parseInt(metricMap['newUsers'] || '0'),
        pageviews: parseInt(metricMap['screenPageViews'] || '0'),
        avgSessionDuration: parseFloat(metricMap['averageSessionDuration'] || '0'),
        bounceRate: parseFloat(metricMap['bounceRate'] || '0'),
        engagementRate: parseFloat(metricMap['engagementRate'] || '0'),
      };

      // Determine which period this is based on date range
      const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 7) {
        response.websiteSessionsWeek = sessions;
      } else if (daysDiff <= 31) {
        response.websiteSessionsMonth = sessions;
      } else {
        response.websiteSessionsYTD = sessions;
      }
    } else if (queryType === 'topPages') {
      // Transform top pages data
      response = (ga4Data.rows || []).map((row: any) => ({
        pagePath: row.dimensionValues?.[0]?.value || '',
        pageTitle: row.dimensionValues?.[1]?.value || '',
        views: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        avgDuration: parseFloat(row.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || '0'),
      }));
    } else if (queryType === 'acquisition') {
      // Transform acquisition data
      response = (ga4Data.rows || []).map((row: any) => ({
        source: row.dimensionValues?.[0]?.value || '(direct)',
        medium: row.dimensionValues?.[1]?.value || '(none)',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        newUsers: parseInt(row.metricValues?.[2]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[3]?.value || '0'),
        engagementRate: parseFloat(row.metricValues?.[4]?.value || '0'),
      }));
    } else if (queryType === 'timeSeries') {
      // Transform time series data
      response = (ga4Data.rows || []).map((row: any) => ({
        date: row.dimensionValues?.[0]?.value || '',
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        pageviews: parseInt(row.metricValues?.[2]?.value || '0'),
      }));
    } else {
      // Return raw GA4 data for custom queries
      response = ga4Data;
    }

    return new Response(
      JSON.stringify(response),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in GA4 query:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
