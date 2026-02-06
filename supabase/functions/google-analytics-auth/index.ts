import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'No authorization code provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GA4_CLIENT_ID = Deno.env.get('GA4_CLIENT_ID');
    const GA4_CLIENT_SECRET = Deno.env.get('GA4_CLIENT_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GA4_CLIENT_ID || !GA4_CLIENT_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing required environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GA4_CLIENT_ID,
        client_secret: GA4_CLIENT_SECRET,
        redirect_uri: `${SUPABASE_URL}/functions/v1/google-analytics-auth`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('Token exchange failed:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to exchange authorization code', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokens = await tokenResponse.json();
    
    // Store refresh token in Supabase using REST API
    const upsertResponse = await fetch(`${SUPABASE_URL}/rest/v1/settings`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: 'ga4_refresh_token',
        value: tokens.refresh_token,
        updated_at: new Date().toISOString(),
      })
    });

    if (!upsertResponse.ok) {
      const error = await upsertResponse.text();
      console.error('Failed to store refresh token:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to store refresh token', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Redirect to success page
    return new Response(null, {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': 'https://con-form-dash.netlify.app/kpis/marketing?ga4_auth=success',
      },
    });

  } catch (error) {
    console.error('Error in GA4 auth:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
