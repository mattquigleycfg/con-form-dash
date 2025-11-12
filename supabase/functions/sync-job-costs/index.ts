import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalyticLine {
  id: number;
  name: string;
  amount: number;
  unit_amount: number;
  date: string;
  account_id: [number, string];
  product_id: [number, string] | false;
  employee_id: [number, string] | false;
  category: string;
}

interface PurchaseOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  state: string;
  analytic_account_id: [number, string] | false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting job costs sync...');

    // Fetch all jobs with analytic_account_id
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('id, analytic_account_id, project_analytic_account_id, sale_order_name')
      .not('analytic_account_id', 'is', null);

    if (jobsError) throw jobsError;

    console.log(`Found ${jobs?.length || 0} jobs with analytic accounts`);

    let totalSynced = 0;

    for (const job of jobs || []) {
      try {
        // Collect all analytic account IDs for this job
        const analyticAccountIds: number[] = [];
        if (job.analytic_account_id) {
          analyticAccountIds.push(job.analytic_account_id);
        }
        if (job.project_analytic_account_id && job.project_analytic_account_id !== job.analytic_account_id) {
          analyticAccountIds.push(job.project_analytic_account_id);
          console.log(`📋 Job ${job.sale_order_name} has separate project analytic account:`, {
            soAccount: job.analytic_account_id,
            projectAccount: job.project_analytic_account_id
          });
        }

        console.log(`Syncing costs for job ${job.sale_order_name} (analytic accounts: ${analyticAccountIds.join(', ')})`);

        // Build filter for analytic lines
        const accountFilter = analyticAccountIds.length === 1
          ? [['account_id', '=', analyticAccountIds[0]]]
          : [['account_id', 'in', analyticAccountIds]];

        // Fetch analytic lines from all relevant accounts
        const analyticResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/odoo-query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'account.analytic.line',
            method: 'search_read',
            args: [
              accountFilter,
              ['id', 'name', 'amount', 'unit_amount', 'date', 'product_id', 'employee_id', 'category'],
            ],
          }),
        });

        const analyticLines = await analyticResponse.json() as AnalyticLine[];
        console.log(`Found ${analyticLines.length} analytic lines for job ${job.sale_order_name} across ${analyticAccountIds.length} account(s)`);
        
        // Filter to only negative amounts (costs) - positive amounts are customer invoices
        const costLines = analyticLines.filter(line => line.amount < 0);
        console.log(`Filtered to ${costLines.length} cost lines (negative amounts only)`);
        
        if (false) { // Disabled move type fetching since move_id field doesn't exist in Odoo v16
          const movesResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/odoo-query`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'account.move',
              method: 'search_read',
              args: [
                [['id', 'in', moveIds]],
                ['id', 'move_type'],
              ],
            }),
          });
          
          const moves = await movesResponse.json() as any[];
          const moveTypeMap = new Map(moves.map(m => [m.id, m.move_type]));
          
          // Enrich analytic lines with move_type
          analyticLines.forEach(line => {
            if (line.move_id && line.move_id[0]) {
              line.move_type = moveTypeMap.get(line.move_id[0]);
            }
          });
        }

        // Check which lines are already imported
        const { data: existingCosts } = await supabase
          .from('job_non_material_costs')
          .select('description')
          .eq('job_id', job.id)
          .eq('is_from_odoo', true);

        const existingDescriptions = new Set(existingCosts?.map(c => c.description) || []);

        // Import new analytic lines - filter out customer invoices
        for (const line of analyticLines) {
          // Skip if already imported
          const lineDescription = `${line.name} (${line.date})`;
          if (existingDescriptions.has(lineDescription)) continue;

          // Only import if there's a cost (amount !== 0)
          if (line.amount === 0) continue;
          
          // Filter out customer invoices and only keep actual costs/expenses
          // 1. Exclude positive amounts (typically revenue/customer invoices)
          if (line.amount > 0) continue;
          
          // 2. Exclude customer invoice types if move_type is available
          if (line.move_type) {
            const customerInvoiceTypes = ['out_invoice', 'out_receipt', 'out_refund'];
            if (customerInvoiceTypes.includes(line.move_type)) {
              console.log(`Skipping customer invoice line: ${lineDescription}`);
              continue;
            }
          }
          
          // 3. Check journal type - exclude sales journals
          if (line.journal_id && line.journal_id[1]) {
            const journalName = line.journal_id[1].toLowerCase();
            if (journalName.includes('sales') || journalName.includes('customer')) {
              console.log(`Skipping sales journal line: ${lineDescription}`);
              continue;
            }
          }

          const productName = line.product_id ? line.product_id[1] : '';
          const amount = Math.abs(line.amount); // Always use absolute value

          // Determine cost type based on product name or category
          let costType: "installation" | "freight" | "cranage" | "travel" | "accommodation" | "other" = "other";
          const nameUpper = productName.toUpperCase();
          
          if (nameUpper.includes('INSTALLATION')) costType = 'installation';
          else if (nameUpper.includes('FREIGHT')) costType = 'freight';
          else if (nameUpper.includes('CRANAGE')) costType = 'cranage';
          else if (nameUpper.includes('ACCOMMODATION')) costType = 'accommodation';
          else if (nameUpper.includes('TRAVEL')) costType = 'travel';

          await supabase.from('job_non_material_costs').insert({
            job_id: job.id,
            cost_type: costType,
            description: lineDescription,
            amount: amount,
            is_from_odoo: true,
          });

          totalSynced++;
        }

        // Fetch purchase orders for this analytic account
        const poResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/odoo-query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'purchase.order',
            method: 'search_read',
            args: [
              [
                ['analytic_account_id', '=', job.analytic_account_id],
                ['state', 'in', ['purchase', 'done']]
              ],
              ['id', 'name', 'partner_id', 'amount_total', 'state'],
            ],
          }),
        });

        const purchaseOrders = await poResponse.json() as PurchaseOrder[];
        console.log(`Found ${purchaseOrders.length} purchase orders for job ${job.sale_order_name}`);

        // Check which POs are already imported
        const { data: existingPOs } = await supabase
          .from('job_purchase_orders')
          .select('odoo_po_id')
          .eq('job_id', job.id);

        const existingPOIds = new Set(existingPOs?.map(po => po.odoo_po_id) || []);

        // Import new purchase orders
        for (const po of purchaseOrders) {
          if (existingPOIds.has(po.id)) continue;

          await supabase.from('job_purchase_orders').insert({
            job_id: job.id,
            odoo_po_id: po.id,
            po_name: po.name,
            vendor_name: po.partner_id[1],
            amount_total: po.amount_total,
            cost_category: 'material', // Default to material, can be updated manually
          });

          totalSynced++;
        }

      } catch (error) {
        console.error(`Error syncing job ${job.sale_order_name}:`, error);
      }
    }

    console.log(`Sync complete! Total items synced: ${totalSynced}`);

    return new Response(
      JSON.stringify({
        success: true,
        jobs_synced: jobs?.length || 0,
        items_synced: totalSynced,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in sync-job-costs:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
