import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const { model, method, args, kwargs } = await req.json();
    
    let ODOO_URL = Deno.env.get('ODOO_URL');
    const ODOO_USERNAME = Deno.env.get('ODOO_USERNAME');
    const ODOO_PASSWORD = Deno.env.get('ODOO_PASSWORD');
    const ODOO_API_KEY = Deno.env.get('ODOO_API_KEY');

    if (!ODOO_URL || !ODOO_USERNAME || !ODOO_PASSWORD) {
      console.error('Missing Odoo credentials:', {
        hasUrl: !!ODOO_URL,
        hasUsername: !!ODOO_USERNAME,
        hasPassword: !!ODOO_PASSWORD
      });
      return new Response(
        JSON.stringify({ error: 'Odoo credentials not configured. Please check your environment variables.' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Remove trailing slash from URL if present
    ODOO_URL = ODOO_URL.replace(/\/$/, '');

    console.log('Calling Odoo API:', { 
      url: ODOO_URL,
      model, 
      method, 
      argsCount: args?.length 
    });

    // Authenticate with Odoo
    const authResponse = await fetch(`${ODOO_URL}/web/session/authenticate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        params: {
          db: 'con-formgroup-main-10348162',
          login: ODOO_USERNAME,
          password: ODOO_PASSWORD,
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
          kwargs: kwargs || {},
        },
      }),
    });

    const queryData = await queryResponse.json();
    const ok = queryResponse.ok && queryData && typeof queryData === 'object' && 'result' in queryData;
    
    console.log('Odoo query response status:', queryResponse.status);
    console.log('Odoo query result:', ok ? `success (${Array.isArray(queryData.result) ? queryData.result.length : 'non-array'} items)` : 'failed');

    // Check if response is OK and has 'result' property (even if result is empty array or null)
    if (!ok) {
      const errorMsg = (queryData && (queryData.error?.data?.message || queryData.error?.message)) || 'Odoo returned no result';
      const errorDetails = {
        message: errorMsg,
        model,
        method,
        odooError: queryData?.error || null,
        requestStatus: queryResponse.status,
        hasResult: 'result' in (queryData || {}),
        resultValue: queryData?.result
      };
      
      console.error('Odoo query failed:');
      console.error('  Model:', model);
      console.error('  Method:', method);
      console.error('  Args:', JSON.stringify(args));
      console.error('  Error:', JSON.stringify(queryData?.error || {}, null, 2));
      
      return new Response(JSON.stringify({ 
        error: errorMsg,
        details: errorDetails
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

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
