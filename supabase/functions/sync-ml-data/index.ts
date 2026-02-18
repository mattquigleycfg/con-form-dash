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

  const data = await response.json();

  if (!response.ok || (data && typeof data === 'object' && 'error' in data)) {
    const msg = data?.error || `Odoo query failed: HTTP ${response.status}`;
    throw new Error(`${model}.${method}: ${msg}`);
  }

  return data;
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

        if (Array.isArray(purchaseOrders) && purchaseOrders.length > 0) {
          const poIds = purchaseOrders.map((po: any) => po.id);
          const poNames = purchaseOrders.map((po: any) => po.name);

          // Batch-fetch all PO lines and pickings in two calls instead of N+1
          const [allLines, allPickings] = await Promise.all([
            queryOdoo('purchase.order.line', 'search_read', [
              [['order_id', 'in', poIds]],
              ['order_id', 'product_id', 'product_qty', 'date_planned', 'price_subtotal'],
            ]),
            queryOdoo('stock.picking', 'search_read', [
              [['origin', 'in', poNames], ['state', '=', 'done']],
              ['origin', 'date_done', 'scheduled_date'],
            ]),
          ]);

          // Index lines by PO id
          const linesByPO = new Map<number, any[]>();
          if (Array.isArray(allLines)) {
            for (const line of allLines) {
              const poId = Array.isArray(line.order_id) ? line.order_id[0] : line.order_id;
              if (!linesByPO.has(poId)) linesByPO.set(poId, []);
              linesByPO.get(poId)!.push(line);
            }
          }

          // Index pickings by origin PO name (first match wins)
          const pickingByOrigin = new Map<string, any>();
          if (Array.isArray(allPickings)) {
            for (const p of allPickings) {
              if (p.origin && !pickingByOrigin.has(p.origin)) {
                pickingByOrigin.set(p.origin, p);
              }
            }
          }

          let synced = 0;
          const upsertBatch: any[] = [];

          for (const po of purchaseOrders) {
            const lines = linesByPO.get(po.id) || [];

            const earliestPlanned = lines.length > 0
              ? lines.reduce((min: string, l: any) => l.date_planned && l.date_planned < min ? l.date_planned : min, lines[0]?.date_planned || '')
              : null;

            const totalQty = lines.reduce((sum: number, l: any) => sum + (l.product_qty || 0), 0);

            const picking = pickingByOrigin.get(po.name);
            const actualDate = picking?.date_done?.split(' ')[0] || null;

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

            let productCategory = 'unknown';
            if (lines.length > 0 && lines[0].product_id) {
              const productName = Array.isArray(lines[0].product_id) ? lines[0].product_id[1] : '';
              productCategory = productName.split(' ')[0] || 'unknown';
            }

            upsertBatch.push({
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
            });
          }

          // Upsert in batches of 200
          for (let i = 0; i < upsertBatch.length; i += 200) {
            const chunk = upsertBatch.slice(i, i + 200);
            const { error, count } = await supabase
              .from('po_delivery_history')
              .upsert(chunk, { onConflict: 'odoo_po_id', count: 'exact' });
            if (!error) synced += chunk.length;
            else console.error('Upsert batch error:', error);
          }

          results.po_delivery = { synced, total: purchaseOrders.length };
          console.log(`PO delivery: synced ${synced}/${purchaseOrders.length}`);
        } else {
          results.po_delivery = { synced: 0, total: 0 };
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

    // ── Sync Supplier Product Metrics (per-vendor-per-product) ───────────
    if (sync_type === 'all' || sync_type === 'supplier_product_metrics') {
      console.log('Syncing supplier product metrics...');
      try {
        const allLines = await queryOdoo('purchase.order.line', 'search_read', [
          [['state', 'in', ['purchase', 'done']]],
          ['order_id', 'partner_id', 'product_id', 'product_qty', 'price_unit',
           'price_subtotal', 'date_planned', 'date_order'],
        ]);

        // Fetch stock.move for actual receipt dates (more accurate than stock.picking)
        let stockMoves: any[] = [];
        try {
          stockMoves = await queryOdoo('stock.move', 'search_read', [
            [['state', '=', 'done'], ['picking_code', '=', 'incoming']],
            ['product_id', 'origin', 'date', 'product_uom_qty'],
          ]);
          if (!Array.isArray(stockMoves)) stockMoves = [];
        } catch (e) {
          console.warn('stock.move query failed (may not have access):', e);
        }

        // Index stock moves by origin for lookup
        const movesByOrigin = new Map<string, any[]>();
        for (const mv of stockMoves) {
          if (mv.origin) {
            if (!movesByOrigin.has(mv.origin)) movesByOrigin.set(mv.origin, []);
            movesByOrigin.get(mv.origin)!.push(mv);
          }
        }

        if (Array.isArray(allLines) && allLines.length > 0) {
          // Group by vendor+product
          const vpMap = new Map<string, any>();

          for (const line of allLines) {
            const vendorName = Array.isArray(line.partner_id) ? line.partner_id[1] : String(line.partner_id || '');
            const productId = Array.isArray(line.product_id) ? String(line.product_id[0]) : String(line.product_id || '');
            const productName = Array.isArray(line.product_id) ? line.product_id[1] : '';
            if (!vendorName || !productId) continue;

            const key = `${vendorName}||${productId}`;
            if (!vpMap.has(key)) {
              vpMap.set(key, {
                vendor_name: vendorName,
                product_id: productId,
                product_name: productName,
                lead_times: [],
                delays: [],
                prices: [] as { date: string; price: number }[],
                on_time_count: 0,
                total_orders: 0,
                total_qty: 0,
                total_spend: 0,
                last_order_date: null as string | null,
              });
            }

            const vp = vpMap.get(key)!;
            vp.total_orders++;
            vp.total_qty += line.product_qty || 0;
            vp.total_spend += line.price_subtotal || 0;

            const orderDate = (line.date_order || '').split(' ')[0] || null;
            const plannedDate = (line.date_planned || '').split(' ')[0] || null;

            if (line.price_unit && orderDate) {
              vp.prices.push({ date: orderDate, price: line.price_unit });
            }

            if (orderDate && (!vp.last_order_date || orderDate > vp.last_order_date)) {
              vp.last_order_date = orderDate;
            }

            // Try to find actual receipt date from stock.move
            const poName = Array.isArray(line.order_id) ? line.order_id[1] : '';
            const moves = movesByOrigin.get(poName) || [];
            const matchingMove = moves.find((m: any) => {
              const moveProductId = Array.isArray(m.product_id) ? String(m.product_id[0]) : String(m.product_id);
              return moveProductId === productId;
            });

            const actualDate = matchingMove?.date?.split(' ')[0] || null;

            if (orderDate && actualDate) {
              const lt = Math.round((new Date(actualDate).getTime() - new Date(orderDate).getTime()) / (1000 * 60 * 60 * 24));
              if (lt > 0) vp.lead_times.push(lt);
            }

            if (plannedDate && actualDate) {
              const isOnTime = new Date(actualDate) <= new Date(plannedDate);
              if (isOnTime) vp.on_time_count++;
              const delay = Math.max(0, (new Date(actualDate).getTime() - new Date(plannedDate).getTime()) / (1000 * 60 * 60 * 24));
              vp.delays.push(delay);
            }
          }

          // Calculate metrics and upsert
          const upsertBatch: any[] = [];
          for (const [, stats] of vpMap.entries()) {
            const avgLT = stats.lead_times.length > 0
              ? stats.lead_times.reduce((a: number, b: number) => a + b, 0) / stats.lead_times.length
              : 0;

            const ltStddev = stats.lead_times.length > 1
              ? Math.sqrt(stats.lead_times.reduce((sum: number, lt: number) => sum + Math.pow(lt - avgLT, 2), 0) / (stats.lead_times.length - 1))
              : 0;

            const onTimeRate = stats.total_orders > 0
              ? stats.on_time_count / stats.total_orders
              : 0;

            const avgDelay = stats.delays.length > 0
              ? stats.delays.reduce((a: number, b: number) => a + b, 0) / stats.delays.length
              : 0;

            const avgPrice = stats.prices.length > 0
              ? stats.prices.reduce((s: number, p: any) => s + p.price, 0) / stats.prices.length
              : 0;

            // Price trend: compare last 3 months vs prior 3 months
            let priceTrend = 0;
            if (stats.prices.length >= 2) {
              const sorted = [...stats.prices].sort((a: any, b: any) => a.date.localeCompare(b.date));
              const mid = Math.floor(sorted.length / 2);
              const oldAvg = sorted.slice(0, mid).reduce((s: number, p: any) => s + p.price, 0) / mid;
              const newAvg = sorted.slice(mid).reduce((s: number, p: any) => s + p.price, 0) / (sorted.length - mid);
              if (oldAvg > 0) priceTrend = ((newAvg - oldAvg) / oldAvg) * 100;
            }

            upsertBatch.push({
              vendor_name: stats.vendor_name,
              product_id: stats.product_id,
              product_name: stats.product_name,
              avg_lead_time: Math.round(avgLT * 10) / 10,
              lead_time_stddev: Math.round(ltStddev * 10) / 10,
              on_time_rate: Math.round(onTimeRate * 1000) / 1000,
              avg_delay_days: Math.round(avgDelay * 10) / 10,
              avg_unit_price: Math.round(avgPrice * 100) / 100,
              price_trend_pct: Math.round(priceTrend * 10) / 10,
              total_orders: stats.total_orders,
              total_qty: stats.total_qty,
              total_spend: Math.round(stats.total_spend * 100) / 100,
              last_order_date: stats.last_order_date,
              updated_at: new Date().toISOString(),
            });
          }

          let synced = 0;
          for (let i = 0; i < upsertBatch.length; i += 200) {
            const chunk = upsertBatch.slice(i, i + 200);
            const { error } = await supabase
              .from('supplier_product_metrics')
              .upsert(chunk, { onConflict: 'vendor_name,product_id' });
            if (!error) synced += chunk.length;
            else console.error('Supplier product metrics upsert error:', error);
          }

          results.supplier_product_metrics = { synced, total: vpMap.size };
          console.log(`Supplier product metrics: synced ${synced}/${vpMap.size}`);
        } else {
          results.supplier_product_metrics = { synced: 0, total: 0 };
        }
      } catch (e) {
        console.error('Supplier product metrics sync error:', e);
        results.supplier_product_metrics = { error: String(e) };
      }
    }

    // ── Sync Inventory Snapshot (stock.quant) ─────────────────────────────
    if (sync_type === 'all' || sync_type === 'inventory') {
      console.log('Syncing inventory snapshot...');
      try {
        const quants = await queryOdoo('stock.quant', 'search_read', [
          [['location_id.usage', '=', 'internal']],
          ['product_id', 'location_id', 'quantity', 'reserved_quantity'],
        ]);

        if (Array.isArray(quants) && quants.length > 0) {
          // Aggregate by product + location
          const invMap = new Map<string, any>();
          for (const q of quants) {
            const productId = Array.isArray(q.product_id) ? String(q.product_id[0]) : String(q.product_id);
            const productName = Array.isArray(q.product_id) ? q.product_id[1] : '';
            const locName = Array.isArray(q.location_id) ? q.location_id[1] : String(q.location_id);
            const warehouse = locName.split('/')[0] || locName;
            const key = `${productId}||${warehouse}`;

            if (!invMap.has(key)) {
              invMap.set(key, {
                product_id: productId,
                product_name: productName,
                warehouse_name: warehouse,
                qty_on_hand: 0,
                qty_reserved: 0,
              });
            }
            const inv = invMap.get(key)!;
            inv.qty_on_hand += q.quantity || 0;
            inv.qty_reserved += q.reserved_quantity || 0;
          }

          const upsertBatch: any[] = [];
          for (const [, inv] of invMap.entries()) {
            upsertBatch.push({
              ...inv,
              qty_available: inv.qty_on_hand - inv.qty_reserved,
              snapshot_at: new Date().toISOString(),
            });
          }

          let synced = 0;
          for (let i = 0; i < upsertBatch.length; i += 200) {
            const chunk = upsertBatch.slice(i, i + 200);
            const { error } = await supabase
              .from('inventory_snapshot')
              .upsert(chunk, { onConflict: 'product_id,warehouse_name' });
            if (!error) synced += chunk.length;
            else console.error('Inventory snapshot upsert error:', error);
          }

          results.inventory = { synced, total: invMap.size };
          console.log(`Inventory: synced ${synced}/${invMap.size} product-warehouse combos`);
        } else {
          results.inventory = { synced: 0, total: 0 };
        }
      } catch (e) {
        console.error('Inventory sync error:', e);
        results.inventory = { error: String(e) };
      }
    }

    // ── Sync Odoo Reorder Rules (stock.warehouse.orderpoint) ──────────────
    if (sync_type === 'all' || sync_type === 'orderpoints') {
      console.log('Syncing Odoo reorder rules...');
      try {
        const orderpoints = await queryOdoo('stock.warehouse.orderpoint', 'search_read', [
          [['active', '=', true]],
          ['id', 'product_id', 'warehouse_id', 'product_min_qty', 'product_max_qty',
           'qty_multiple', 'lead_days_date'],
        ]);

        if (Array.isArray(orderpoints) && orderpoints.length > 0) {
          const upsertBatch: any[] = [];
          for (const op of orderpoints) {
            const productId = Array.isArray(op.product_id) ? String(op.product_id[0]) : String(op.product_id);
            const productName = Array.isArray(op.product_id) ? op.product_id[1] : '';
            const warehouseName = Array.isArray(op.warehouse_id) ? op.warehouse_id[1] : String(op.warehouse_id || '');

            upsertBatch.push({
              product_id: productId,
              product_name: productName,
              warehouse_name: warehouseName,
              odoo_orderpoint_id: op.id,
              odoo_min_qty: op.product_min_qty || 0,
              odoo_max_qty: op.product_max_qty || 0,
              odoo_qty_multiple: op.qty_multiple || 1,
              odoo_lead_days: op.lead_days_date || 0,
              updated_at: new Date().toISOString(),
            });
          }

          let synced = 0;
          for (let i = 0; i < upsertBatch.length; i += 200) {
            const chunk = upsertBatch.slice(i, i + 200);
            const { error } = await supabase
              .from('reorder_rules')
              .upsert(chunk, { onConflict: 'product_id,warehouse_name' });
            if (!error) synced += chunk.length;
            else console.error('Reorder rules upsert error:', error);
          }

          results.orderpoints = { synced, total: orderpoints.length };
          console.log(`Reorder rules: synced ${synced}/${orderpoints.length}`);
        } else {
          results.orderpoints = { synced: 0, total: 0 };
        }
      } catch (e) {
        console.error('Reorder rules sync error:', e);
        results.orderpoints = { error: String(e) };
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
