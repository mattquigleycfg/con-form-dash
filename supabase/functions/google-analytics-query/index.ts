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
    const { propertyId, startDate, endDate, metrics } = await req.json();

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

    // Query GA4 Data API
    const ga4Response = await fetch(
      `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY_ID}:runReport`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dateRanges: [{ startDate, endDate }],
          metrics: metrics.map((m: string) => ({ name: m })),
        }),
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

    // Transform the response into our expected format
    const row = ga4Data.rows?.[0];
    const metricValues = row?.metricValues || [];

    const response = {
      websiteSessionsWeek: 0,
      websiteSessionsMonth: 0,
      websiteSessionsYTD: 0,
      totalUsers: parseInt(metricValues[0]?.value || '0'),
      activeUsers: parseInt(metricValues[1]?.value || '0'),
      newUsers: parseInt(metricValues[2]?.value || '0'),
      pageviews: parseInt(metricValues[3]?.value || '0'),
      avgSessionDuration: parseFloat(metricValues[4]?.value || '0'),
      bounceRate: parseFloat(metricValues[5]?.value || '0'),
    };

    // The sessions value depends on the date range requested
    const sessions = parseInt(metricValues[6]?.value || '0');
    
    // Determine which period this is based on date range
    const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 7) {
      response.websiteSessionsWeek = sessions;
    } else if (daysDiff <= 31) {
      response.websiteSessionsMonth = sessions;
    } else {
      response.websiteSessionsYTD = sessions;
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
