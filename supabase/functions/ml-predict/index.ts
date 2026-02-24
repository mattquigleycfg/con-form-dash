import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

const ML_SERVICE_URL = Deno.env.get('ML_SERVICE_URL') || 'http://localhost:8000';
const ML_API_KEY = Deno.env.get('ML_API_KEY') || '';

interface MLRequest {
  prediction_type: string;
  job_id?: string;
  job_ids?: string[];
  vendor_name?: string;
  product_id?: string;
  product_category?: string;
  amount?: number;
  quantity?: number;
  periods?: number;
  weeks?: number;
  batch?: boolean;
  model_name?: string;
  method?: string;
  granularity?: string;
  service_level?: number;
  reorder_model?: string;
  force_refresh?: boolean;
}

async function callMLService(endpoint: string, body: any): Promise<any> {
  const response = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ML-API-Key': ML_API_KEY,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ML service error (${response.status}): ${errorText}`);
  }

  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const request: MLRequest = await req.json();
    const { prediction_type, job_id, job_ids, batch } = request;

    let result: any;

    switch (prediction_type) {
      case 'cost':
        if (batch) {
          result = await callMLService('/predict/cost/batch', { job_ids });
        } else if (job_id) {
          result = await callMLService('/predict/cost', { job_id });
        } else {
          result = await callMLService('/predict/cost/batch', {});
        }
        break;

      case 'anomaly':
        if (batch || !job_id) {
          result = await callMLService('/predict/anomaly/batch', {});
        } else {
          result = await callMLService('/predict/anomaly', { job_id });
        }
        break;

      case 'waste':
        if (batch || !job_id) {
          result = await callMLService('/predict/waste/batch', {});
        } else {
          result = await callMLService('/predict/waste', { job_id });
        }
        break;

      case 'overrun':
        if (batch || !job_id) {
          result = await callMLService('/predict/overrun/batch', {});
        } else {
          result = await callMLService('/predict/overrun', { job_id });
        }
        break;

      case 'lead_time':
        result = await callMLService('/predict/lead-time', {
          vendor_name: request.vendor_name || '',
          product_category: request.product_category || 'unknown',
          amount: request.amount || 0,
          quantity: request.quantity || 0,
        });
        break;

      case 'demand':
        if (request.product_id) {
          result = await callMLService('/predict/demand', {
            product_id: request.product_id,
            periods: request.periods || 6,
          });
        } else {
          result = await callMLService('/predict/demand/all', {});
        }
        break;

      case 'customers':
        result = await callMLService('/predict/customers', {});
        break;

      case 'suppliers':
        result = await callMLService('/predict/suppliers', {});
        break;

      case 'supplier-analytics':
        result = await callMLService('/predict/supplier-analytics', {});
        break;

      case 'supplier-detail':
        result = await callMLService('/predict/supplier-detail', {
          vendor_name: request.vendor_name || '',
        });
        break;

      case 'lead-time-distribution':
        result = await callMLService('/predict/lead-time-distribution', {});
        break;

      case 'demand/analytics':
        result = await callMLService('/predict/demand/analytics', {
          product_id: request.product_id,
          method: request.method || 'auto',
          granularity: request.granularity || 'monthly',
          periods: request.periods || 6,
        });
        break;

      case 'mrp-netting':
        result = await callMLService('/predict/mrp-netting', {
          product_id: request.product_id,
          weeks: request.weeks || 12,
        });
        break;

      case 'reorder-rules':
        result = await callMLService('/predict/reorder-rules', {
          product_id: request.product_id,
          service_level: request.service_level || 0.95,
          reorder_model: request.reorder_model || 'eoq',
        });
        break;

      case 'insights':
        result = await callMLService('/insights', { job_id });
        break;

      case 'installation-analysis':
        result = await callMLService('/analyze/installations', {
          force_refresh: request.force_refresh || false,
        });
        break;

      case 'installation-analysis-refresh':
        result = await callMLService('/analyze/installations/refresh', {});
        break;

      case 'freight-analysis':
        result = await callMLService('/analyze/freight', {
          force_refresh: request.force_refresh || false,
        });
        break;

      case 'freight-analysis-refresh':
        result = await callMLService('/analyze/freight/refresh', {});
        break;

      case 'train':
        if (request.model_name) {
          result = await callMLService(`/train/${request.model_name}`, {});
        } else {
          result = await callMLService('/train', {});
        }
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown prediction type: ${prediction_type}` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('ML predict error:', error);

    // Fallback: try to serve cached predictions from Supabase
    try {
      const requestBody = await req.clone().json().catch(() => ({}));
      if (requestBody.job_id) {
        const supabase = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { data: cached } = await supabase
          .from('ml_predictions')
          .select('*')
          .eq('job_id', requestBody.job_id)
          .gt('expires_at', new Date().toISOString());

        if (cached && cached.length > 0) {
          return new Response(
            JSON.stringify({
              predictions: cached,
              source: 'cache',
              ml_service_error: error instanceof Error ? error.message : 'ML service unavailable',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }
    } catch {
      // Cache fallback also failed
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        predictions: [],
        source: 'error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }
});
