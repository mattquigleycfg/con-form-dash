import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { model, method, args } = await req.json();
    
    const ODOO_URL = Deno.env.get('ODOO_URL');
    const ODOO_USERNAME = Deno.env.get('ODOO_USERNAME');
    const ODOO_PASSWORD = Deno.env.get('ODOO_PASSWORD');
    const ODOO_API_KEY = Deno.env.get('ODOO_API_KEY');

    if (!ODOO_URL || !ODOO_USERNAME || !ODOO_PASSWORD || !ODOO_API_KEY) {
      throw new Error('Odoo credentials not configured');
    }

    console.log('Calling Odoo API:', { model, method, argsCount: args?.length });

    // Authenticate with Odoo
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: 'con-formgroup',
          login: ODOO_USERNAME,
          password: ODOO_PASSWORD,
          api_key: ODOO_API_KEY,
        },
      }),
    });

    const authData = await authResponse.json();
    console.log('Odoo auth response:', JSON.stringify(authData, null, 2));

    if (!authData.result || !authData.result.uid) {
      const errorDetails = authData.error ? JSON.stringify(authData.error) : 'No error details';
      console.error('Odoo authentication failed. Details:', errorDetails);
      throw new Error(`Odoo authentication failed: ${errorDetails}`);
    }

    // Make the actual query
    const queryResponse = await fetch(`${ODOO_URL}/web/dataset/call_kw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': authResponse.headers.get('set-cookie') || '',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'call',
        params: {
          model,
          method,
          args,
          kwargs: {},
        },
      }),
    });

    const queryData = await queryResponse.json();
    console.log('Odoo query result:', queryData.result ? 'success' : 'failed');

    return new Response(JSON.stringify(queryData.result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in odoo-query:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
