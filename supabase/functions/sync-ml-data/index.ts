import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
};

async function queryOdoo(model: string, method: string, args: any[]): Promise<any> {
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/odoo-query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model, method, args }),
  });
  return response.json();
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { sync_type = 'all' } = await req.json().catch(() => ({}));

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const results: Record<string, any> = {};

    // ── Sync PO Delivery History ──────────────────────────────────────────
    if (sync_type === 'all' || sync_type === 'po_delivery') {
      console.log('Syncing PO delivery history...');
      try {
        const purchaseOrders = await queryOdoo('purchase.order', 'search_read', [
          [['state', 'in', ['purchase', 'done']]],
          ['id', 'name', 'partner_id', 'amount_total', 'state', 'date_order', 'date_approve'],
        ]);

        if (Array.isArray(purchaseOrders)) {
          let synced = 0;
          for (const po of purchaseOrders) {
            // Fetch PO lines for planned delivery dates
            const lines = await queryOdoo('purchase.order.line', 'search_read', [
              [['order_id', '=', po.id]],
              ['product_id', 'product_qty', 'date_planned', 'price_subtotal'],
            ]);

            const earliestPlanned = Array.isArray(lines) && lines.length > 0
              ? lines.reduce((min: string, l: any) => l.date_planned && l.date_planned < min ? l.date_planned : min, lines[0]?.date_planned || '')
              : null;

            const totalQty = Array.isArray(lines)
              ? lines.reduce((sum: number, l: any) => sum + (l.product_qty || 0), 0)
              : 0;

            // Fetch stock pickings to find actual delivery date
            const pickings = await queryOdoo('stock.picking', 'search_read', [
              [['origin', '=', po.name], ['state', '=', 'done']],
              ['date_done', 'scheduled_date'],
            ]);

            const actualDate = Array.isArray(pickings) && pickings.length > 0
              ? pickings[0].date_done?.split(' ')[0]
              : null;

            const orderDate = po.date_order?.split(' ')[0] || null;
            const plannedDate = earliestPlanned?.split(' ')[0] || null;

            let leadTimeDays: number | null = null;
            let isOnTime: boolean | null = null;

            if (orderDate && actualDate) {
              const orderMs = new Date(orderDate).getTime();
              const actualMs = new Date(actualDate).getTime();
              leadTimeDays = Math.round((actualMs - orderMs) / (1000 * 60 * 60 * 24));
            }

            if (plannedDate && actualDate) {
              isOnTime = new Date(actualDate) <= new Date(plannedDate);
            }

            // Get product category from first line
            let productCategory = 'unknown';
            if (Array.isArray(lines) && lines.length > 0 && lines[0].product_id) {
              const productName = Array.isArray(lines[0].product_id) ? lines[0].product_id[1] : '';
              productCategory = productName.split(' ')[0] || 'unknown';
            }

            const { error } = await supabase.from('po_delivery_history').upsert({
              odoo_po_id: po.id,
              po_name: po.name,
              vendor_name: Array.isArray(po.partner_id) ? po.partner_id[1] : String(po.partner_id),
              product_category: productCategory,
              amount_total: po.amount_total || 0,
              quantity: totalQty,
              order_date: orderDate,
              planned_date: plannedDate,
              actual_date: actualDate,
              lead_time_days: leadTimeDays,
              is_on_time: isOnTime,
            }, { onConflict: 'odoo_po_id' });

            if (!error) synced++;
          }
          results.po_delivery = { synced, total: purchaseOrders.length };
          console.log(`PO delivery: synced ${synced}/${purchaseOrders.length}`);
        }
      } catch (e) {
        console.error('PO delivery sync error:', e);
        results.po_delivery = { error: String(e) };
      }
    }

    // ── Sync Production/Manufacturing History ─────────────────────────────
    if (sync_type === 'all' || sync_type === 'production') {
      console.log('Syncing production history...');
      try {
        const manufacturingOrders = await queryOdoo('mrp.production', 'search_read', [
          [['state', 'in', ['done', 'progress', 'confirmed']]],
          ['id', 'name', 'product_id', 'product_qty', 'date_planned_start',
           'date_deadline', 'state', 'origin'],
        ]);

        if (Array.isArray(manufacturingOrders)) {
          let synced = 0;
          for (const mo of manufacturingOrders) {
            const plannedStart = mo.date_planned_start?.split(' ')[0] || null;
            const actualEnd = mo.state === 'done' ? (mo.date_deadline?.split(' ')[0] || null) : null;

            let durationDays: number | null = null;
            if (plannedStart && actualEnd) {
              const startMs = new Date(plannedStart).getTime();
              const endMs = new Date(actualEnd).getTime();
              durationDays = Math.round((endMs - startMs) / (1000 * 60 * 60 * 24));
            }

            const { error } = await supabase.from('production_history').upsert({
              odoo_mo_id: mo.id,
              mo_name: mo.name,
              product_name: Array.isArray(mo.product_id) ? mo.product_id[1] : String(mo.product_id),
              product_qty: mo.product_qty || 0,
              planned_start: plannedStart,
              actual_start: plannedStart,
              actual_end: actualEnd,
              duration_days: durationDays,
              state: mo.state,
              sale_order_origin: mo.origin || null,
            }, { onConflict: 'odoo_mo_id' });

            if (!error) synced++;
          }
          results.production = { synced, total: manufacturingOrders.length };
          console.log(`Production: synced ${synced}/${manufacturingOrders.length}`);
        }
      } catch (e) {
        console.error('Production sync error:', e);
        results.production = { error: String(e) };
      }
    }

    // ── Sync Demand History (Sale Order Lines) ────────────────────────────
    if (sync_type === 'all' || sync_type === 'demand') {
      console.log('Syncing demand history...');
      try {
        const saleOrders = await queryOdoo('sale.order', 'search_read', [
          [['state', 'in', ['sale', 'done']]],
          ['id', 'name', 'partner_id', 'date_order'],
        ]);

        if (Array.isArray(saleOrders)) {
          let synced = 0;
          for (const so of saleOrders) {
            const lines = await queryOdoo('sale.order.line', 'search_read', [
              [['order_id', '=', so.id]],
              ['product_id', 'product_uom_qty', 'price_subtotal'],
            ]);

            if (!Array.isArray(lines)) continue;

            for (const line of lines) {
              if (!line.product_id) continue;

              const productId = Array.isArray(line.product_id) ? String(line.product_id[0]) : String(line.product_id);
              const productName = Array.isArray(line.product_id) ? line.product_id[1] : '';
              const orderDate = so.date_order?.split(' ')[0] || null;

              if (!orderDate) continue;

              const { error } = await supabase.from('demand_history').upsert({
                product_id: productId,
                product_name: productName,
                order_date: orderDate,
                quantity: line.product_uom_qty || 0,
                revenue: line.price_subtotal || 0,
                customer_name: Array.isArray(so.partner_id) ? so.partner_id[1] : String(so.partner_id),
                sale_order_name: so.name,
              }, { onConflict: 'product_id,order_date,sale_order_name' });

              if (!error) synced++;
            }
          }
          results.demand = { synced, sale_orders: saleOrders.length };
          console.log(`Demand: synced ${synced} lines from ${saleOrders.length} orders`);
        }
      } catch (e) {
        console.error('Demand sync error:', e);
        results.demand = { error: String(e) };
      }
    }

    // ── Aggregate Vendor Metrics ──────────────────────────────────────────
    if (sync_type === 'all' || sync_type === 'vendor_metrics') {
      console.log('Aggregating vendor metrics...');
      try {
        const { data: poHistory } = await supabase
          .from('po_delivery_history')
          .select('*');

        if (poHistory && poHistory.length > 0) {
          const vendorMap = new Map<string, any>();

          for (const po of poHistory) {
            const vendor = po.vendor_name;
            if (!vendor) continue;

            if (!vendorMap.has(vendor)) {
              vendorMap.set(vendor, {
                total_orders: 0,
                total_value: 0,
                lead_times: [],
                on_time_count: 0,
                delays: [],
                last_order_date: null,
              });
            }

            const v = vendorMap.get(vendor)!;
            v.total_orders++;
            v.total_value += po.amount_total || 0;

            if (po.lead_time_days != null) {
              v.lead_times.push(po.lead_time_days);
            }

            if (po.is_on_time === true) {
              v.on_time_count++;
            }

            if (po.actual_date && po.planned_date) {
              const delay = Math.max(0,
                (new Date(po.actual_date).getTime() - new Date(po.planned_date).getTime()) / (1000 * 60 * 60 * 24)
              );
              v.delays.push(delay);
            }

            if (!v.last_order_date || (po.order_date && po.order_date > v.last_order_date)) {
              v.last_order_date = po.order_date;
            }
          }

          let synced = 0;
          for (const [vendor, stats] of vendorMap.entries()) {
            const avgLeadTime = stats.lead_times.length > 0
              ? stats.lead_times.reduce((a: number, b: number) => a + b, 0) / stats.lead_times.length
              : 0;

            const onTimeRate = stats.total_orders > 0
              ? stats.on_time_count / stats.total_orders
              : 0;

            const avgDelay = stats.delays.length > 0
              ? stats.delays.reduce((a: number, b: number) => a + b, 0) / stats.delays.length
              : 0;

            const { error } = await supabase.from('vendor_metrics').upsert({
              vendor_name: vendor,
              total_orders: stats.total_orders,
              total_value: stats.total_value,
              avg_lead_time: avgLeadTime,
              on_time_rate: onTimeRate,
              avg_delay_days: avgDelay,
              last_order_date: stats.last_order_date,
              updated_at: new Date().toISOString(),
            }, { onConflict: 'vendor_name' });

            if (!error) synced++;
          }
          results.vendor_metrics = { synced, vendors: vendorMap.size };
          console.log(`Vendor metrics: aggregated ${synced} vendors`);
        }
      } catch (e) {
        console.error('Vendor metrics error:', e);
        results.vendor_metrics = { error: String(e) };
      }
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('ML data sync error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
