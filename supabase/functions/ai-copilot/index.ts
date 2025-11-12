import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client for calling odoo-query function
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Define tools for the AI to query Odoo data
const tools = [
  // ========== SALES MODULE ==========
  {
    type: "function",
    function: {
      name: "query_sales_orders",
      description: "Query sales orders and quotations from Odoo. IMPORTANT: In Odoo, quotations are sales orders in 'draft' or 'sent' state, while confirmed sales orders are in 'sale' or 'done' state. Use this to get revenue data, deal information, and sales by salesperson. Returns sales orders with fields: id, name, amount_total, date_order, state, user_id (salesperson), partner_id (customer), margin (profit margin), note (description/notes).",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for orders (>=), e.g., '2024-07-01'. Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for orders (<=), e.g., '2024-09-30'. Use ISO date format YYYY-MM-DD. Optional - only use for specific date ranges like quarters.",
          },
          salesperson_name: {
            type: "string",
            description: "Filter by salesperson name (case-insensitive partial match). Leave empty to get all salespeople.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by order state. Values: 'draft' (quotation), 'sent' (quotation sent), 'sale' (confirmed sales order), 'done' (completed), 'cancel' (cancelled). Leave empty for all states. To get only quotations use ['draft', 'sent']. To get only confirmed orders use ['sale', 'done'].",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_order_lines",
      description: "Query order lines (products) from sales orders/quotations. CRITICAL: Use this to analyze product sales over time periods (e.g., 'highest selling product last month'). Can filter by date range, order, or product. Returns order lines with: id, order_id, product_id, name (description), product_uom_qty (quantity), price_unit, price_subtotal, margin (profit), discount, order date.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for the order date (>=), e.g., '2024-07-01'. Use ISO date format YYYY-MM-DD. Use this to analyze products sold in specific time periods.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for the order date (<=), e.g., '2024-09-30'. Use ISO date format YYYY-MM-DD. Use with date_filter to get products from specific time ranges.",
          },
          order_name: {
            type: "string",
            description: "Filter by order reference/name (e.g., 'S00123'). Leave empty to get all order lines.",
          },
          product_name: {
            type: "string",
            description: "Filter by product name (case-insensitive partial match). Leave empty for all products.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by order state. Values: 'draft', 'sent', 'sale', 'done', 'cancel'. Typically use ['sale', 'done'] for confirmed orders. Leave empty for all states.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_activities",
      description: "Query calendar activities and tasks from Odoo. Use for sales activities, overdue tasks, scheduled calls/meetings. Returns activities with: id, summary, date_deadline, activity_type_id (type like call/meeting/todo), user_id (assigned to), res_model (related record type), res_id, state (overdue/today/planned/done).",
      parameters: {
        type: "object",
        properties: {
          overdue_only: {
            type: "boolean",
            description: "If true, only returns overdue activities (date_deadline < today). Default false.",
          },
          user_name: {
            type: "string",
            description: "Filter by assigned user name. Leave empty for all users.",
          },
          activity_type: {
            type: "string",
            description: "Filter by activity type name (e.g., 'Call', 'Meeting', 'To Do'). Leave empty for all types.",
          },
          opportunity_ids: {
            type: "array",
            items: { type: "number" },
            description: "Filter activities by opportunity/lead IDs. Only returns activities linked to these CRM opportunities (res_model='crm.lead'). Use this with query_crm_leads to get activities for specific opportunities.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_crm_leads",
      description: "Query CRM opportunities/leads from Odoo. Use this to get pipeline data, opportunity stages, and deal probabilities. Returns leads with fields: id, name, expected_revenue, probability, stage_id, user_id (salesperson), type, partner_id (customer), active (true if not won/lost).",
      parameters: {
        type: "object",
        properties: {
          opportunity_only: {
            type: "boolean",
            description: "If true, only returns opportunities (type='opportunity'). Default true.",
          },
          active_only: {
            type: "boolean",
            description: "If true, only returns active/open opportunities (not Won or Lost). Use this to filter for opportunities that are still in progress. Default false.",
          },
          salesperson_name: {
            type: "string",
            description: "Filter by salesperson name. Leave empty to get all salespeople.",
          },
          stage_name: {
            type: "string",
            description: "Filter by stage name (e.g., 'New', 'Qualified', 'Proposition', 'Won', 'Lost'). Leave empty for all stages.",
          },
        },
      },
    },
  },
  
  // ========== ACCOUNTING MODULE ==========
  {
    type: "function",
    function: {
      name: "query_invoices",
      description: "Query customer invoices (out_invoice) from Odoo. Use this to get invoice data, payment status, and amounts. Returns invoices with fields: id, name, invoice_date, amount_total, amount_untaxed, amount_tax, state, payment_state, partner_id (customer), invoice_user_id (salesperson).",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for invoices (>=), e.g., '2024-07-01'. Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for invoices (<=). Use ISO date format YYYY-MM-DD. Optional.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by invoice state. Common values: 'draft', 'posted' (validated), 'cancel'. Leave empty for all states.",
          },
          payment_state: {
            type: "string",
            description: "Filter by payment state: 'not_paid', 'in_payment', 'paid', 'partial', 'reversed'. Leave empty for all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_vendor_bills",
      description: "Query vendor bills (in_invoice) from Odoo. Use to analyze supplier payments, costs, and vendor invoices. Returns bills with: id, name, invoice_date, amount_total, amount_untaxed, state, payment_state, partner_id (vendor), ref (vendor reference).",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          vendor_name: {
            type: "string",
            description: "Filter by vendor name. Leave empty for all vendors.",
          },
          payment_state: {
            type: "string",
            description: "Filter by payment state: 'not_paid', 'paid', 'partial', etc.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_payments",
      description: "Query payments (account.payment) from Odoo. Use to analyze incoming/outgoing payments, payment methods, and cash flow. Returns payments with: id, name, date, amount, payment_type (inbound/outbound), partner_type (customer/supplier), partner_id, state, payment_method_line_id.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          payment_type: {
            type: "string",
            description: "Filter by payment type: 'inbound' (customer payments) or 'outbound' (vendor payments). Leave empty for all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_journal_entries",
      description: "Query journal entries (account.move) from Odoo. Use for accounting entries, ledger analysis. Returns entries with: id, name, date, ref, journal_id, state, amount_total, move_type.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          journal_name: {
            type: "string",
            description: "Filter by journal name. Leave empty for all journals.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_expenses",
      description: "Query employee expenses (hr.expense) from Odoo. Use for expense reports, reimbursements, cost analysis. Returns expenses with: id, name, date, total_amount, employee_id, state, payment_mode, product_id (expense category).",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          employee_name: {
            type: "string",
            description: "Filter by employee name. Leave empty for all employees.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'draft', 'reported', 'approved', 'done', 'refused'. Leave empty for all.",
          },
        },
      },
    },
  },
  
  // ========== INVENTORY MODULE ==========
  {
    type: "function",
    function: {
      name: "query_products",
      description: "Query product catalog from Odoo. Use this to get product information, pricing, categories, and inventory data. Returns products with fields: id, name, list_price, standard_price (cost), categ_id (category), qty_available (stock), type, barcode.",
      parameters: {
        type: "object",
        properties: {
          product_name: {
            type: "string",
            description: "Filter by product name (case-insensitive partial match). Leave empty to get all products.",
          },
          category_name: {
            type: "string",
            description: "Filter by category name. Leave empty for all categories.",
          },
          available_only: {
            type: "boolean",
            description: "If true, only returns products with qty_available > 0. Default false.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_stock_moves",
      description: "Query stock movements (stock.move) from Odoo. Use for inventory transfers, stock changes, product movements. Returns moves with: id, name, product_id, product_uom_qty, location_id (from), location_dest_id (to), date, state, origin.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          product_name: {
            type: "string",
            description: "Filter by product name. Leave empty for all products.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'draft', 'waiting', 'confirmed', 'assigned', 'done', 'cancel'. Leave empty for all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_stock_pickings",
      description: "Query stock pickings/transfers (stock.picking) from Odoo. Use for delivery orders, receipts, internal transfers. Returns pickings with: id, name, picking_type_id (operation type), partner_id, scheduled_date, date_done, state, origin, location_id, location_dest_id.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for scheduled_date (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for scheduled_date (<=). Use ISO date format YYYY-MM-DD.",
          },
          picking_type: {
            type: "string",
            description: "Filter by operation type name (e.g., 'Delivery Orders', 'Receipts', 'Internal Transfers'). Leave empty for all.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'draft', 'waiting', 'confirmed', 'assigned', 'done', 'cancel'. Leave empty for all.",
          },
        },
      },
    },
  },
  
  // ========== PURCHASE MODULE ==========
  {
    type: "function",
    function: {
      name: "query_purchase_orders",
      description: "Query purchase orders (purchase.order) from Odoo. Use for supplier orders, procurement analysis, purchasing data. Returns POs with: id, name, date_order, amount_total, amount_untaxed, state, partner_id (vendor), user_id (buyer), date_approve, notes.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter (<=). Use ISO date format YYYY-MM-DD.",
          },
          vendor_name: {
            type: "string",
            description: "Filter by vendor name. Leave empty for all vendors.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'draft', 'sent', 'to approve', 'purchase' (confirmed), 'done', 'cancel'. Leave empty for all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_purchase_order_lines",
      description: "Query purchase order lines (purchase.order.line) from Odoo. Use to analyze products purchased, supplier pricing. Returns PO lines with: id, order_id, product_id, name, product_qty, price_unit, price_subtotal, date_planned, product_uom.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for order date (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for order date (<=). Use ISO date format YYYY-MM-DD.",
          },
          product_name: {
            type: "string",
            description: "Filter by product name. Leave empty for all products.",
          },
        },
      },
    },
  },
  
  // ========== MANUFACTURING MODULE ==========
  {
    type: "function",
    function: {
      name: "query_manufacturing_orders",
      description: "Query manufacturing orders (mrp.production) from Odoo. Use for production data, work orders, manufacturing status. Returns MOs with: id, name, product_id, product_qty, date_planned_start, date_deadline, state, user_id, bom_id (bill of materials), origin.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for date_planned_start (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for date_planned_start (<=). Use ISO date format YYYY-MM-DD.",
          },
          product_name: {
            type: "string",
            description: "Filter by product name. Leave empty for all products.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'draft', 'confirmed', 'progress' (in progress), 'done', 'cancel'. Leave empty for all.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_work_orders",
      description: "Query work orders (mrp.workorder) from Odoo. Use for detailed manufacturing operations, work center performance. Returns work orders with: id, name, production_id, workcenter_id, state, date_planned_start, date_planned_finished, duration_expected.",
      parameters: {
        type: "object",
        properties: {
          date_filter: {
            type: "string",
            description: "Start date filter for date_planned_start (>=). Use ISO date format YYYY-MM-DD.",
          },
          end_date_filter: {
            type: "string",
            description: "End date filter for date_planned_start (<=). Use ISO date format YYYY-MM-DD.",
          },
          workcenter_name: {
            type: "string",
            description: "Filter by work center name. Leave empty for all work centers.",
          },
          state_filter: {
            type: "array",
            items: { type: "string" },
            description: "Filter by state: 'pending', 'ready', 'progress', 'done', 'cancel'. Leave empty for all.",
          },
        },
      },
    },
  },
  
  // ========== JOB COSTING MODULE ==========
  {
    type: "function",
    function: {
      name: "query_jobs",
      description: "Query jobs from Supabase job costing system. Use this to analyze project budgets, track costs, and identify budget variances. Returns jobs with: id, sale_order_name, customer_name, total_budget, total_actual, material_budget, material_actual, non_material_budget, non_material_actual, status, project_stage, dates, variance calculations.",
      parameters: {
        type: "object",
        properties: {
          over_budget: {
            type: "boolean",
            description: "If true, only returns jobs where actual costs exceed budget (total_actual > total_budget). Default false.",
          },
          under_budget: {
            type: "boolean",
            description: "If true, only returns jobs where actual costs are under budget. Default false.",
          },
          variance_threshold: {
            type: "number",
            description: "Only return jobs with variance percentage exceeding this threshold (e.g., 10 for 10%). Can be positive (overruns) or negative (under budget).",
          },
          status: {
            type: "string",
            description: "Filter by job status. Leave empty for all statuses.",
          },
          project_stage: {
            type: "string",
            description: "Filter by project stage name (partial match). Leave empty for all stages.",
          },
          salesperson_name: {
            type: "string",
            description: "Filter by salesperson name (partial match). Leave empty for all.",
          },
          project_manager: {
            type: "string",
            description: "Filter by project manager name (partial match). Leave empty for all.",
          },
          customer_name: {
            type: "string",
            description: "Filter by customer name (partial match). Leave empty for all.",
          },
          date_from: {
            type: "string",
            description: "Filter jobs created on or after this date. Use ISO format YYYY-MM-DD.",
          },
          date_to: {
            type: "string",
            description: "Filter jobs created on or before this date. Use ISO format YYYY-MM-DD.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_job_details",
      description: "Get comprehensive details for a specific job including full budget breakdown, actual costs by category, analytic lines summary, and project information. Use this for detailed job analysis.",
      parameters: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The UUID of the job to query. Required.",
          },
          include_analytic_lines: {
            type: "boolean",
            description: "If true, includes summary of analytic lines (cost entries). Default false.",
          },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_job_analytic_lines",
      description: "Query analytic cost entries for a job from Odoo. Returns detailed cost lines including vendor bills, employee expenses, and time tracking. Use this to analyze specific cost entries and identify anomalies.",
      parameters: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The UUID of the job in Supabase. The function will resolve to the corresponding Odoo analytic account. Required.",
          },
          date_from: {
            type: "string",
            description: "Filter entries on or after this date. Use ISO format YYYY-MM-DD.",
          },
          date_to: {
            type: "string",
            description: "Filter entries on or before this date. Use ISO format YYYY-MM-DD.",
          },
          category: {
            type: "string",
            description: "Filter by cost category (e.g., 'material', 'labor', 'expense'). Leave empty for all.",
          },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_job_bom",
      description: "Get Bill of Materials (BOM) data for a job. Returns BOM components, quantities, costs, and material breakdown. Use this to analyze material requirements and costs.",
      parameters: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The UUID of the job. The function will find the associated product's BOM. Required.",
          },
          sale_order_id: {
            type: "number",
            description: "Alternative: Query BOM by Odoo sale order ID instead of job_id.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "compare_similar_jobs",
      description: "Find and compare similar jobs based on various criteria. Returns comparative metrics like budget accuracy, margins, and timelines. Use this for benchmarking and learning from past projects.",
      parameters: {
        type: "object",
        properties: {
          job_id: {
            type: "string",
            description: "The UUID of the reference job to compare against. Required.",
          },
          match_criteria: {
            type: "array",
            items: { type: "string" },
            description: "Criteria for matching: 'customer' (same customer), 'budget_range' (similar budget ±30%), 'salesperson' (same sales person). Default: all criteria.",
          },
          limit: {
            type: "number",
            description: "Maximum number of similar jobs to return. Default 5.",
          },
        },
        required: ["job_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "analyze_cost_trends",
      description: "Analyze cost patterns and trends across multiple jobs. Returns aggregated metrics like average margins, budget accuracy rates, and common cost categories. Use this for high-level insights and identifying patterns.",
      parameters: {
        type: "object",
        properties: {
          date_from: {
            type: "string",
            description: "Analyze jobs created on or after this date. Use ISO format YYYY-MM-DD.",
          },
          date_to: {
            type: "string",
            description: "Analyze jobs created on or before this date. Use ISO format YYYY-MM-DD.",
          },
          group_by: {
            type: "string",
            description: "Group results by: 'customer', 'salesperson', 'project_manager', 'month'. Default: overall summary.",
          },
          customer_name: {
            type: "string",
            description: "Filter to specific customer (partial match).",
          },
        },
      },
    },
  },
  
  // ========== GENERAL ==========
  {
    type: "function",
    function: {
      name: "query_customers",
      description: "Query customer/partner data from Odoo. Use this to get customer information, contact details, and company data. Returns partners with fields: id, name, email, phone, city, country_id, is_company, customer_rank.",
      parameters: {
        type: "object",
        properties: {
          customer_name: {
            type: "string",
            description: "Filter by customer name (case-insensitive partial match). Leave empty to get all customers.",
          },
          customers_only: {
            type: "boolean",
            description: "If true, only returns customers (customer_rank > 0). Default true.",
          },
        },
      },
    },
  },
];

// Execute tool calls by invoking odoo-query function
async function executeToolCall(toolName: string, toolArgs: any) {
  console.log(`Executing tool: ${toolName}`, toolArgs);

  try {
    // ========== SALES MODULE ==========
    if (toolName === "query_sales_orders") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date_order', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date_order', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            filters,
            ['name', 'amount_total', 'date_order', 'state', 'user_id', 'partner_id', 'margin', 'note', 'amount_untaxed']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      if (toolArgs.salesperson_name && results.length > 0) {
        const searchName = toolArgs.salesperson_name.toLowerCase();
        results = results.filter((order: any) => 
          order.user_id && order.user_id[1].toLowerCase().includes(searchName)
        );
      }

      console.log(`Found ${results.length} sales orders`);
      return JSON.stringify(results);
    }

    if (toolName === "query_order_lines") {
      let orderIds: number[] | null = null;
      
      if (toolArgs.date_filter || toolArgs.end_date_filter || toolArgs.state_filter) {
        const orderFilters: any[] = [];
        
        if (toolArgs.date_filter) {
          orderFilters.push(['date_order', '>=', toolArgs.date_filter]);
        }
        if (toolArgs.end_date_filter) {
          orderFilters.push(['date_order', '<=', toolArgs.end_date_filter]);
        }
        if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
          orderFilters.push(['state', 'in', toolArgs.state_filter]);
        }
        
        const { data: orders, error: orderError } = await supabase.functions.invoke('odoo-query', {
          body: {
            model: 'sale.order',
            method: 'search_read',
            args: [
              orderFilters,
              ['id', 'name', 'date_order']
            ]
          }
        });
        
        if (orderError) throw orderError;
        orderIds = orders?.map((o: any) => o.id) || [];
        
        if (orderIds !== null && orderIds.length === 0) {
          return JSON.stringify([]);
        }
      }

      const filters: any[] = [];
      if (orderIds !== null) {
        filters.push(['order_id', 'in', orderIds]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order.line',
          method: 'search_read',
          args: [
            filters,
            ['order_id', 'product_id', 'name', 'product_uom_qty', 'price_unit', 'price_subtotal', 'margin', 'discount']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.order_name && results.length > 0) {
        const searchOrder = toolArgs.order_name.toLowerCase();
        results = results.filter((line: any) => 
          line.order_id && line.order_id[1].toLowerCase().includes(searchOrder)
        );
      }

      if (toolArgs.product_name && results.length > 0) {
        const searchProduct = toolArgs.product_name.toLowerCase();
        results = results.filter((line: any) => 
          (line.product_id && line.product_id[1].toLowerCase().includes(searchProduct)) ||
          (line.name && line.name.toLowerCase().includes(searchProduct))
        );
      }

      console.log(`Found ${results.length} order lines`);
      return JSON.stringify(results);
    }

    if (toolName === "query_activities") {
      const filters: any[] = [];
      
      if (toolArgs.overdue_only) {
        const today = new Date().toISOString().split('T')[0];
        filters.push(['date_deadline', '<', today]);
      }

      if (toolArgs.opportunity_ids && toolArgs.opportunity_ids.length > 0) {
        filters.push(['res_model', '=', 'crm.lead']);
        filters.push(['res_id', 'in', toolArgs.opportunity_ids]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'mail.activity',
          method: 'search_read',
          args: [
            filters,
            ['summary', 'date_deadline', 'activity_type_id', 'user_id', 'res_model', 'res_id', 'state']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.user_name && results.length > 0) {
        const searchUser = toolArgs.user_name.toLowerCase();
        results = results.filter((activity: any) => 
          activity.user_id && activity.user_id[1].toLowerCase().includes(searchUser)
        );
      }

      if (toolArgs.activity_type && results.length > 0) {
        const searchType = toolArgs.activity_type.toLowerCase();
        results = results.filter((activity: any) => 
          activity.activity_type_id && activity.activity_type_id[1].toLowerCase().includes(searchType)
        );
      }

      console.log(`Found ${results.length} activities`);
      return JSON.stringify(results);
    }

    if (toolName === "query_crm_leads") {
      const filters: any[] = [];
      
      if (toolArgs.opportunity_only !== false) {
        filters.push(['type', '=', 'opportunity']);
      }

      if (toolArgs.active_only) {
        filters.push(['active', '=', true]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            filters,
            ['name', 'expected_revenue', 'probability', 'stage_id', 'user_id', 'type', 'partner_id', 'active']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.salesperson_name && results.length > 0) {
        const searchName = toolArgs.salesperson_name.toLowerCase();
        results = results.filter((lead: any) => 
          lead.user_id && lead.user_id[1].toLowerCase().includes(searchName)
        );
      }

      if (toolArgs.stage_name && results.length > 0) {
        const searchStage = toolArgs.stage_name.toLowerCase();
        results = results.filter((lead: any) => 
          lead.stage_id && lead.stage_id[1].toLowerCase().includes(searchStage)
        );
      }

      // If active_only, filter out won/lost stages as additional safeguard
      if (toolArgs.active_only && results.length > 0) {
        results = results.filter((lead: any) => {
          const stageName = lead.stage_id ? lead.stage_id[1].toLowerCase() : '';
          return !stageName.includes('won') && !stageName.includes('lost');
        });
      }

      console.log(`Found ${results.length} CRM leads`);
      return JSON.stringify(results);
    }

    // ========== ACCOUNTING MODULE ==========
    if (toolName === "query_invoices") {
      const filters: any[] = [['move_type', '=', 'out_invoice']];
      
      if (toolArgs.date_filter) {
        filters.push(['invoice_date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['invoice_date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }
      if (toolArgs.payment_state) {
        filters.push(['payment_state', '=', toolArgs.payment_state]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.move',
          method: 'search_read',
          args: [
            filters,
            ['name', 'invoice_date', 'amount_total', 'amount_untaxed', 'amount_tax', 'state', 'payment_state', 'partner_id', 'invoice_user_id']
          ]
        }
      });

      if (error) throw error;

      console.log(`Found ${data?.length || 0} invoices`);
      return JSON.stringify(data || []);
    }

    if (toolName === "query_vendor_bills") {
      const filters: any[] = [['move_type', '=', 'in_invoice']];
      
      if (toolArgs.date_filter) {
        filters.push(['invoice_date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['invoice_date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.payment_state) {
        filters.push(['payment_state', '=', toolArgs.payment_state]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.move',
          method: 'search_read',
          args: [
            filters,
            ['name', 'invoice_date', 'amount_total', 'amount_untaxed', 'state', 'payment_state', 'partner_id', 'ref']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.vendor_name && results.length > 0) {
        const searchVendor = toolArgs.vendor_name.toLowerCase();
        results = results.filter((bill: any) => 
          bill.partner_id && bill.partner_id[1].toLowerCase().includes(searchVendor)
        );
      }

      console.log(`Found ${results.length} vendor bills`);
      return JSON.stringify(results);
    }

    if (toolName === "query_payments") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.payment_type) {
        filters.push(['payment_type', '=', toolArgs.payment_type]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.payment',
          method: 'search_read',
          args: [
            filters,
            ['name', 'date', 'amount', 'payment_type', 'partner_type', 'partner_id', 'state', 'payment_method_line_id']
          ]
        }
      });

      if (error) throw error;

      console.log(`Found ${data?.length || 0} payments`);
      return JSON.stringify(data || []);
    }

    if (toolName === "query_journal_entries") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date', '<=', toolArgs.end_date_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.move',
          method: 'search_read',
          args: [
            filters,
            ['name', 'date', 'ref', 'journal_id', 'state', 'amount_total', 'move_type']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.journal_name && results.length > 0) {
        const searchJournal = toolArgs.journal_name.toLowerCase();
        results = results.filter((entry: any) => 
          entry.journal_id && entry.journal_id[1].toLowerCase().includes(searchJournal)
        );
      }

      console.log(`Found ${results.length} journal entries`);
      return JSON.stringify(results);
    }

    if (toolName === "query_expenses") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'hr.expense',
          method: 'search_read',
          args: [
            filters,
            ['name', 'date', 'total_amount', 'employee_id', 'state', 'payment_mode', 'product_id']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.employee_name && results.length > 0) {
        const searchEmployee = toolArgs.employee_name.toLowerCase();
        results = results.filter((expense: any) => 
          expense.employee_id && expense.employee_id[1].toLowerCase().includes(searchEmployee)
        );
      }

      console.log(`Found ${results.length} expenses`);
      return JSON.stringify(results);
    }

    // ========== INVENTORY MODULE ==========
    if (toolName === "query_products") {
      const filters: any[] = [];

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'product.product',
          method: 'search_read',
          args: [
            filters,
            ['name', 'list_price', 'standard_price', 'categ_id', 'qty_available', 'type', 'active', 'barcode']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.product_name && results.length > 0) {
        const searchName = toolArgs.product_name.toLowerCase();
        results = results.filter((product: any) => 
          product.name && product.name.toLowerCase().includes(searchName)
        );
      }

      if (toolArgs.category_name && results.length > 0) {
        const searchCategory = toolArgs.category_name.toLowerCase();
        results = results.filter((product: any) => 
          product.categ_id && product.categ_id[1].toLowerCase().includes(searchCategory)
        );
      }

      if (toolArgs.available_only && results.length > 0) {
        results = results.filter((product: any) => 
          product.qty_available && product.qty_available > 0
        );
      }

      console.log(`Found ${results.length} products`);
      return JSON.stringify(results);
    }

    if (toolName === "query_stock_moves") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'stock.move',
          method: 'search_read',
          args: [
            filters,
            ['name', 'product_id', 'product_uom_qty', 'location_id', 'location_dest_id', 'date', 'state', 'origin']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.product_name && results.length > 0) {
        const searchProduct = toolArgs.product_name.toLowerCase();
        results = results.filter((move: any) => 
          move.product_id && move.product_id[1].toLowerCase().includes(searchProduct)
        );
      }

      console.log(`Found ${results.length} stock moves`);
      return JSON.stringify(results);
    }

    if (toolName === "query_stock_pickings") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['scheduled_date', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['scheduled_date', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'stock.picking',
          method: 'search_read',
          args: [
            filters,
            ['name', 'picking_type_id', 'partner_id', 'scheduled_date', 'date_done', 'state', 'origin', 'location_id', 'location_dest_id']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.picking_type && results.length > 0) {
        const searchType = toolArgs.picking_type.toLowerCase();
        results = results.filter((picking: any) => 
          picking.picking_type_id && picking.picking_type_id[1].toLowerCase().includes(searchType)
        );
      }

      console.log(`Found ${results.length} stock pickings`);
      return JSON.stringify(results);
    }

    // ========== PURCHASE MODULE ==========
    if (toolName === "query_purchase_orders") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date_order', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date_order', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'purchase.order',
          method: 'search_read',
          args: [
            filters,
            ['name', 'date_order', 'amount_total', 'amount_untaxed', 'state', 'partner_id', 'user_id', 'date_approve', 'notes']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.vendor_name && results.length > 0) {
        const searchVendor = toolArgs.vendor_name.toLowerCase();
        results = results.filter((po: any) => 
          po.partner_id && po.partner_id[1].toLowerCase().includes(searchVendor)
        );
      }

      console.log(`Found ${results.length} purchase orders`);
      return JSON.stringify(results);
    }

    if (toolName === "query_purchase_order_lines") {
      let orderIds: number[] | null = null;
      
      if (toolArgs.date_filter || toolArgs.end_date_filter) {
        const orderFilters: any[] = [];
        
        if (toolArgs.date_filter) {
          orderFilters.push(['date_order', '>=', toolArgs.date_filter]);
        }
        if (toolArgs.end_date_filter) {
          orderFilters.push(['date_order', '<=', toolArgs.end_date_filter]);
        }
        
        const { data: orders, error: orderError } = await supabase.functions.invoke('odoo-query', {
          body: {
            model: 'purchase.order',
            method: 'search_read',
            args: [
              orderFilters,
              ['id']
            ]
          }
        });
        
        if (orderError) throw orderError;
        orderIds = orders?.map((o: any) => o.id) || [];
        
        if (orderIds !== null && orderIds.length === 0) {
          return JSON.stringify([]);
        }
      }

      const filters: any[] = [];
      if (orderIds !== null) {
        filters.push(['order_id', 'in', orderIds]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'purchase.order.line',
          method: 'search_read',
          args: [
            filters,
            ['order_id', 'product_id', 'name', 'product_qty', 'price_unit', 'price_subtotal', 'date_planned', 'product_uom']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.product_name && results.length > 0) {
        const searchProduct = toolArgs.product_name.toLowerCase();
        results = results.filter((line: any) => 
          (line.product_id && line.product_id[1].toLowerCase().includes(searchProduct)) ||
          (line.name && line.name.toLowerCase().includes(searchProduct))
        );
      }

      console.log(`Found ${results.length} purchase order lines`);
      return JSON.stringify(results);
    }

    // ========== MANUFACTURING MODULE ==========
    if (toolName === "query_manufacturing_orders") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date_planned_start', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date_planned_start', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'mrp.production',
          method: 'search_read',
          args: [
            filters,
            ['name', 'product_id', 'product_qty', 'date_planned_start', 'date_deadline', 'state', 'user_id', 'bom_id', 'origin']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.product_name && results.length > 0) {
        const searchProduct = toolArgs.product_name.toLowerCase();
        results = results.filter((mo: any) => 
          mo.product_id && mo.product_id[1].toLowerCase().includes(searchProduct)
        );
      }

      console.log(`Found ${results.length} manufacturing orders`);
      return JSON.stringify(results);
    }

    if (toolName === "query_work_orders") {
      const filters: any[] = [];
      
      if (toolArgs.date_filter) {
        filters.push(['date_planned_start', '>=', toolArgs.date_filter]);
      }
      if (toolArgs.end_date_filter) {
        filters.push(['date_planned_start', '<=', toolArgs.end_date_filter]);
      }
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'mrp.workorder',
          method: 'search_read',
          args: [
            filters,
            ['name', 'production_id', 'workcenter_id', 'state', 'date_planned_start', 'date_planned_finished', 'duration_expected']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.workcenter_name && results.length > 0) {
        const searchWorkcenter = toolArgs.workcenter_name.toLowerCase();
        results = results.filter((wo: any) => 
          wo.workcenter_id && wo.workcenter_id[1].toLowerCase().includes(searchWorkcenter)
        );
      }

      console.log(`Found ${results.length} work orders`);
      return JSON.stringify(results);
    }

    // ========== GENERAL ==========
    if (toolName === "query_customers") {
      const filters: any[] = [];
      
      if (toolArgs.customers_only !== false) {
        filters.push(['customer_rank', '>', 0]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'res.partner',
          method: 'search_read',
          args: [
            filters,
            ['name', 'email', 'phone', 'city', 'country_id', 'is_company', 'customer_rank']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      if (toolArgs.customer_name && results.length > 0) {
        const searchName = toolArgs.customer_name.toLowerCase();
        results = results.filter((partner: any) => 
          partner.name && partner.name.toLowerCase().includes(searchName)
        );
      }

      console.log(`Found ${results.length} customers`);
      return JSON.stringify(results);
    }

    // ========== JOB COSTING MODULE ==========
    if (toolName === "query_jobs") {
      const { data: jobs, error } = await supabase
        .from('jobs')
        .select('*');

      if (error) throw error;

      let results = jobs || [];
      
      // Apply filters
      if (toolArgs.over_budget) {
        results = results.filter((job: any) => job.total_actual > job.total_budget);
      }
      
      if (toolArgs.under_budget) {
        results = results.filter((job: any) => job.total_actual < job.total_budget);
      }
      
      if (toolArgs.variance_threshold !== undefined) {
        results = results.filter((job: any) => {
          const variance = ((job.total_actual - job.total_budget) / job.total_budget) * 100;
          return Math.abs(variance) >= Math.abs(toolArgs.variance_threshold);
        });
      }
      
      if (toolArgs.status) {
        const searchStatus = toolArgs.status.toLowerCase();
        results = results.filter((job: any) => 
          job.status && job.status.toLowerCase().includes(searchStatus)
        );
      }
      
      if (toolArgs.project_stage) {
        const searchStage = toolArgs.project_stage.toLowerCase();
        results = results.filter((job: any) => 
          job.project_stage_name && job.project_stage_name.toLowerCase().includes(searchStage)
        );
      }
      
      if (toolArgs.salesperson_name) {
        const searchName = toolArgs.salesperson_name.toLowerCase();
        results = results.filter((job: any) => 
          job.sales_person_name && job.sales_person_name.toLowerCase().includes(searchName)
        );
      }
      
      if (toolArgs.project_manager) {
        const searchPM = toolArgs.project_manager.toLowerCase();
        results = results.filter((job: any) => 
          job.project_manager_name && job.project_manager_name.toLowerCase().includes(searchPM)
        );
      }
      
      if (toolArgs.customer_name) {
        const searchCustomer = toolArgs.customer_name.toLowerCase();
        results = results.filter((job: any) => 
          job.customer_name && job.customer_name.toLowerCase().includes(searchCustomer)
        );
      }
      
      if (toolArgs.date_from) {
        results = results.filter((job: any) => job.created_at >= toolArgs.date_from);
      }
      
      if (toolArgs.date_to) {
        results = results.filter((job: any) => job.created_at <= toolArgs.date_to);
      }
      
      // Add variance calculations
      results = results.map((job: any) => ({
        ...job,
        variance: job.total_actual - job.total_budget,
        variance_percent: job.total_budget > 0 
          ? ((job.total_actual - job.total_budget) / job.total_budget) * 100 
          : 0,
        material_variance: job.material_actual - job.material_budget,
        material_variance_percent: job.material_budget > 0 
          ? ((job.material_actual - job.material_budget) / job.material_budget) * 100 
          : 0,
        non_material_variance: job.non_material_actual - job.non_material_budget,
        non_material_variance_percent: job.non_material_budget > 0 
          ? ((job.non_material_actual - job.non_material_budget) / job.non_material_budget) * 100 
          : 0,
      }));
      
      console.log(`Found ${results.length} jobs`);
      return JSON.stringify(results);
    }

    if (toolName === "query_job_details") {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', toolArgs.job_id)
        .single();

      if (error) throw error;
      if (!job) return JSON.stringify({ error: 'Job not found' });
      
      // Add variance calculations
      const jobDetails = {
        ...job,
        variance: job.total_actual - job.total_budget,
        variance_percent: job.total_budget > 0 
          ? ((job.total_actual - job.total_budget) / job.total_budget) * 100 
          : 0,
        material_variance: job.material_actual - job.material_budget,
        material_variance_percent: job.material_budget > 0 
          ? ((job.material_actual - job.material_budget) / job.material_budget) * 100 
          : 0,
        non_material_variance: job.non_material_actual - job.non_material_budget,
        non_material_variance_percent: job.non_material_budget > 0 
          ? ((job.non_material_actual - job.non_material_budget) / job.non_material_budget) * 100 
          : 0,
      };
      
      // Optionally include analytic lines summary
      if (toolArgs.include_analytic_lines && job.analytic_account_id) {
        try {
          const accountIds = [job.analytic_account_id];
          if (job.project_analytic_account_id && job.project_analytic_account_id !== job.analytic_account_id) {
            accountIds.push(job.project_analytic_account_id);
          }
          
          const accountFilter = accountIds.length === 1
            ? [['account_id', '=', accountIds[0]]]
            : [['account_id', 'in', accountIds]];
          
          const analyticResponse = await supabase.functions.invoke('odoo-query', {
            body: {
              model: 'account.analytic.line',
              method: 'search_read',
              args: [
                accountFilter,
                ['id', 'name', 'amount', 'unit_amount', 'date', 'product_id', 'employee_id', 'category']
              ]
            }
          });
          
          if (!analyticResponse.error && analyticResponse.data) {
            const lines = analyticResponse.data;
            jobDetails.analytic_lines_count = lines.length;
            jobDetails.analytic_lines_sample = lines.slice(0, 10); // First 10 lines
          }
        } catch (err) {
          console.error('Error fetching analytic lines:', err);
        }
      }
      
      console.log(`Retrieved details for job: ${job.sale_order_name}`);
      return JSON.stringify(jobDetails);
    }

    if (toolName === "query_job_analytic_lines") {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('analytic_account_id, project_analytic_account_id, sale_order_name')
        .eq('id', toolArgs.job_id)
        .single();

      if (jobError) throw jobError;
      if (!job || !job.analytic_account_id) {
        return JSON.stringify({ error: 'Job not found or no analytic account' });
      }
      
      // Collect all analytic account IDs
      const accountIds = [job.analytic_account_id];
      if (job.project_analytic_account_id && job.project_analytic_account_id !== job.analytic_account_id) {
        accountIds.push(job.project_analytic_account_id);
      }
      
      const filters: any[] = accountIds.length === 1
        ? [['account_id', '=', accountIds[0]]]
        : [['account_id', 'in', accountIds]];
      
      if (toolArgs.date_from) {
        filters.push(['date', '>=', toolArgs.date_from]);
      }
      if (toolArgs.date_to) {
        filters.push(['date', '<=', toolArgs.date_to]);
      }
      
      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.analytic.line',
          method: 'search_read',
          args: [
            filters,
            ['id', 'name', 'amount', 'unit_amount', 'date', 'account_id', 'product_id', 'employee_id', 'category']
          ]
        }
      });
      
      if (error) throw error;
      
      let results = data || [];
      
      // Filter by category if specified
      if (toolArgs.category && results.length > 0) {
        const searchCategory = toolArgs.category.toLowerCase();
        results = results.filter((line: any) => 
          line.category && line.category.toLowerCase().includes(searchCategory)
        );
      }
      
      console.log(`Found ${results.length} analytic lines for job ${job.sale_order_name}`);
      return JSON.stringify(results);
    }

    if (toolName === "query_job_bom") {
      let saleOrderId = toolArgs.sale_order_id;
      
      // If job_id provided, resolve to sale_order_id
      if (toolArgs.job_id) {
        const { data: job, error: jobError } = await supabase
          .from('jobs')
          .select('odoo_sale_order_id')
          .eq('id', toolArgs.job_id)
          .single();
        
        if (jobError) throw jobError;
        if (!job) return JSON.stringify({ error: 'Job not found' });
        saleOrderId = job.odoo_sale_order_id;
      }
      
      if (!saleOrderId) {
        return JSON.stringify({ error: 'No sale order ID provided or found' });
      }
      
      // Get sale order lines to find products
      const { data: orderLines, error: linesError } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order.line',
          method: 'search_read',
          args: [
            [['order_id', '=', saleOrderId]],
            ['product_id', 'product_uom_qty', 'price_unit']
          ]
        }
      });
      
      if (linesError) throw linesError;
      
      // Get BOMs for products
      const bomResults = [];
      if (orderLines && orderLines.length > 0) {
        for (const line of orderLines) {
          if (!line.product_id) continue;
          
          try {
            const productId = Array.isArray(line.product_id) ? line.product_id[0] : line.product_id;
            const { data: boms, error: bomError } = await supabase.functions.invoke('odoo-query', {
              body: {
                model: 'mrp.bom',
                method: 'search_read',
                args: [
                  [['product_id', '=', productId]],
                  ['id', 'product_id', 'product_tmpl_id', 'product_qty', 'bom_line_ids']
                ]
              }
            });
            
            if (!bomError && boms && boms.length > 0) {
              // Get BOM lines
              for (const bom of boms) {
                if (bom.bom_line_ids && bom.bom_line_ids.length > 0) {
                  const { data: bomLines } = await supabase.functions.invoke('odoo-query', {
                    body: {
                      model: 'mrp.bom.line',
                      method: 'search_read',
                      args: [
                        [['id', 'in', bom.bom_line_ids]],
                        ['product_id', 'product_qty', 'product_uom_id']
                      ]
                    }
                  });
                  
                  bomResults.push({
                    bom_id: bom.id,
                    product: line.product_id,
                    lines: bomLines || []
                  });
                }
              }
            }
          } catch (err) {
            console.error('Error fetching BOM:', err);
          }
        }
      }
      
      console.log(`Found ${bomResults.length} BOMs`);
      return JSON.stringify(bomResults);
    }

    if (toolName === "compare_similar_jobs") {
      const { data: referenceJob, error: refError } = await supabase
        .from('jobs')
        .select('*')
        .eq('id', toolArgs.job_id)
        .single();

      if (refError) throw refError;
      if (!referenceJob) return JSON.stringify({ error: 'Reference job not found' });
      
      const { data: allJobs, error } = await supabase
        .from('jobs')
        .select('*')
        .neq('id', toolArgs.job_id);
      
      if (error) throw error;
      
      let matchedJobs = allJobs || [];
      const criteria = toolArgs.match_criteria || ['customer', 'budget_range', 'salesperson'];
      
      // Apply matching criteria
      matchedJobs = matchedJobs.filter((job: any) => {
        let matches = 0;
        const requiredMatches = criteria.length;
        
        if (criteria.includes('customer') && job.customer_name === referenceJob.customer_name) {
          matches++;
        }
        
        if (criteria.includes('budget_range')) {
          const budgetDiff = Math.abs(job.total_budget - referenceJob.total_budget);
          const threshold = referenceJob.total_budget * 0.3; // ±30%
          if (budgetDiff <= threshold) {
            matches++;
          }
        }
        
        if (criteria.includes('salesperson') && job.sales_person_name === referenceJob.sales_person_name) {
          matches++;
        }
        
        return matches >= Math.ceil(requiredMatches / 2); // At least half criteria must match
      });
      
      // Calculate comparative metrics
      matchedJobs = matchedJobs.map((job: any) => ({
        ...job,
        variance: job.total_actual - job.total_budget,
        variance_percent: job.total_budget > 0 
          ? ((job.total_actual - job.total_budget) / job.total_budget) * 100 
          : 0,
        similarity_score: criteria.filter(c => {
          if (c === 'customer') return job.customer_name === referenceJob.customer_name;
          if (c === 'salesperson') return job.sales_person_name === referenceJob.sales_person_name;
          if (c === 'budget_range') {
            const diff = Math.abs(job.total_budget - referenceJob.total_budget);
            return diff <= referenceJob.total_budget * 0.3;
          }
          return false;
        }).length / criteria.length,
      }));
      
      // Sort by similarity score
      matchedJobs.sort((a: any, b: any) => b.similarity_score - a.similarity_score);
      
      // Limit results
      const limit = toolArgs.limit || 5;
      matchedJobs = matchedJobs.slice(0, limit);
      
      console.log(`Found ${matchedJobs.length} similar jobs to ${referenceJob.sale_order_name}`);
      return JSON.stringify({
        reference_job: referenceJob,
        similar_jobs: matchedJobs,
      });
    }

    if (toolName === "analyze_cost_trends") {
      let query = supabase.from('jobs').select('*');
      
      if (toolArgs.date_from) {
        query = query.gte('created_at', toolArgs.date_from);
      }
      if (toolArgs.date_to) {
        query = query.lte('created_at', toolArgs.date_to);
      }
      if (toolArgs.customer_name) {
        query = query.ilike('customer_name', `%${toolArgs.customer_name}%`);
      }
      
      const { data: jobs, error } = await query;
      
      if (error) throw error;
      if (!jobs || jobs.length === 0) {
        return JSON.stringify({ message: 'No jobs found for the specified criteria' });
      }
      
      // Calculate overall metrics
      const totalJobs = jobs.length;
      const overBudget = jobs.filter((j: any) => j.total_actual > j.total_budget).length;
      const underBudget = jobs.filter((j: any) => j.total_actual < j.total_budget).length;
      
      const avgBudget = jobs.reduce((sum: number, j: any) => sum + j.total_budget, 0) / totalJobs;
      const avgActual = jobs.reduce((sum: number, j: any) => sum + j.total_actual, 0) / totalJobs;
      const avgVariance = ((avgActual - avgBudget) / avgBudget) * 100;
      
      const avgMaterialMargin = jobs.reduce((sum: number, j: any) => {
        if (j.material_budget > 0) {
          return sum + ((j.material_budget - j.material_actual) / j.material_budget) * 100;
        }
        return sum;
      }, 0) / totalJobs;
      
      const results: any = {
        summary: {
          total_jobs: totalJobs,
          jobs_over_budget: overBudget,
          jobs_under_budget: underBudget,
          budget_accuracy_rate: (underBudget / totalJobs) * 100,
          avg_budget: avgBudget,
          avg_actual: avgActual,
          avg_variance_percent: avgVariance,
          avg_material_margin_percent: avgMaterialMargin,
        }
      };
      
      // Group by criteria if specified
      if (toolArgs.group_by) {
        const groups: any = {};
        
        jobs.forEach((job: any) => {
          let groupKey = '';
          
          if (toolArgs.group_by === 'customer') {
            groupKey = job.customer_name || 'Unknown';
          } else if (toolArgs.group_by === 'salesperson') {
            groupKey = job.sales_person_name || 'Unknown';
          } else if (toolArgs.group_by === 'project_manager') {
            groupKey = job.project_manager_name || 'Unknown';
          } else if (toolArgs.group_by === 'month') {
            const date = new Date(job.created_at);
            groupKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          }
          
          if (!groups[groupKey]) {
            groups[groupKey] = [];
          }
          groups[groupKey].push(job);
        });
        
        // Calculate metrics for each group
        results.groups = Object.entries(groups).map(([key, groupJobs]: [string, any]) => {
          const count = groupJobs.length;
          const groupAvgBudget = groupJobs.reduce((sum: number, j: any) => sum + j.total_budget, 0) / count;
          const groupAvgActual = groupJobs.reduce((sum: number, j: any) => sum + j.total_actual, 0) / count;
          const groupAvgVariance = ((groupAvgActual - groupAvgBudget) / groupAvgBudget) * 100;
          
          return {
            group_name: key,
            job_count: count,
            avg_budget: groupAvgBudget,
            avg_actual: groupAvgActual,
            avg_variance_percent: groupAvgVariance,
            jobs_over_budget: groupJobs.filter((j: any) => j.total_actual > j.total_budget).length,
          };
        });
      }
      
      console.log(`Analyzed ${totalJobs} jobs`);
      return JSON.stringify(results);
    }

    return JSON.stringify({ error: `Unknown tool: ${toolName}` });
  } catch (error) {
    console.error(`Tool execution error for ${toolName}:`, error);
    return JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Tool execution failed' 
    });
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('AI Copilot request received, message count:', messages.length);

    // Get current date for date-aware queries
    const today = new Date();
    const currentDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 1-12
    
    // Calculate current quarter
    const currentQuarter = Math.ceil(currentMonth / 3);
    
    // Calculate quarter date ranges for reference
    const quarters = {
      Q1: { start: `${currentYear}-01-01`, end: `${currentYear}-03-31` },
      Q2: { start: `${currentYear}-04-01`, end: `${currentYear}-06-30` },
      Q3: { start: `${currentYear}-07-01`, end: `${currentYear}-09-30` },
      Q4: { start: `${currentYear}-10-01`, end: `${currentYear}-12-31` },
    };

    // Process conversation with tool calling
    let conversationMessages = [
      {
        role: 'system',
        content: `You are a comprehensive business analytics AI assistant with full access to Odoo ERP data across Sales, Accounting, Inventory, Purchase, and Manufacturing modules. You can query real-time operational data to provide accurate, data-driven insights.

CURRENT DATE CONTEXT:
- Today's date: ${currentDate}
- Current year: ${currentYear}
- Current quarter: Q${currentQuarter} ${currentYear}
- Q1 ${currentYear}: ${quarters.Q1.start} to ${quarters.Q1.end}
- Q2 ${currentYear}: ${quarters.Q2.start} to ${quarters.Q2.end}
- Q3 ${currentYear}: ${quarters.Q3.start} to ${quarters.Q3.end}
- Q4 ${currentYear}: ${quarters.Q4.start} to ${quarters.Q4.end}

IMPORTANT INSTRUCTIONS:
- ODOO TERMINOLOGY: In Odoo, "quotations" are sales orders with state 'draft' or 'sent'. Confirmed "sales orders" have state 'sale' or 'done'.
- When asked about "quotations", use query_sales_orders with state_filter: ['draft', 'sent']
- When asked about "confirmed orders" or "sales orders", use query_sales_orders with state_filter: ['sale', 'done']
- PRODUCT SALES ANALYSIS: Use query_order_lines with date_filter, end_date_filter, and state_filter: ['sale', 'done']
- For date ranges, use ISO format (YYYY-MM-DD) in date_filter and end_date_filter parameters
- Format currency amounts nicely (e.g., $458,250 instead of 458250)
- Format percentages nicely (e.g., 23.5% for margin)
- Provide clear, actionable insights based on actual data
- If tool execution fails, explain what went wrong and suggest alternatives

AVAILABLE DATA & TOOLS:

**SALES MODULE:**
- query_sales_orders: Sales orders & quotations with revenue, margins, salespeople, customers
- query_order_lines: Detailed product lines from orders with quantities, pricing, margins
- query_activities: Calendar activities, tasks, overdue items, scheduled calls/meetings
- query_crm_leads: CRM opportunities/leads with pipeline stages, probabilities, expected revenue

**ACCOUNTING MODULE:**
- query_invoices: Customer invoices with amounts, payment status, dates
- query_vendor_bills: Supplier bills and vendor invoices with payment tracking
- query_payments: Incoming and outgoing payments with payment methods and cash flow
- query_journal_entries: Accounting journal entries for ledger analysis
- query_expenses: Employee expenses, reimbursements, and cost tracking

**INVENTORY MODULE:**
- query_products: Product catalog with pricing, stock levels, categories, barcodes
- query_stock_moves: Stock movements and inventory transfers between locations
- query_stock_pickings: Delivery orders, receipts, and internal transfers

**PURCHASE MODULE:**
- query_purchase_orders: Purchase orders to suppliers with amounts and approval status
- query_purchase_order_lines: Detailed product lines from purchase orders with supplier pricing

**MANUFACTURING MODULE:**
- query_manufacturing_orders: Production orders with quantities, schedules, and status
- query_work_orders: Detailed work orders by work center with durations and progress

**JOB COSTING & PROJECT MANAGEMENT:**
- query_jobs: Search jobs with filters for budget status, variance, dates, teams
- query_job_details: Get comprehensive job breakdown with budget vs actual
- query_job_analytic_lines: Analyze cost entries, vendor bills, time tracking for a job
- query_job_bom: Review bill of materials and component costs
- compare_similar_jobs: Benchmark against similar historical projects
- analyze_cost_trends: Identify patterns across multiple jobs

**GENERAL:**
- query_customers: Customer/partner information with contact details

**INTELLIGENT JOB COST ANALYSIS:**
When analyzing job costs:
1. Calculate variance % = (actual - budget) / budget * 100
2. Flag variances > 10% as significant
3. Identify cost categories with largest overruns (material vs non-material)
4. Compare run rate vs remaining budget for predictions
5. Predict final costs = actual + (remaining_work * historical_burn_rate)
6. Check for duplicate analytic entries (same date, amount, description within 3 days)
7. Compare material ordered vs consumed for waste analysis
8. Benchmark margins against similar jobs (same customer, budget range, salesperson)

**COST OPTIMIZATION STRATEGIES:**
- Material: Identify over-ordering (>20% waste), suggest bulk discounts, flag unusual pricing
- Labor: Compare estimated vs actual hours, identify inefficiencies, track overtime
- Subcontractor: Compare quotes across jobs, flag premium pricing anomalies
- Overhead: Check allocation accuracy, suggest cost reductions based on patterns

When providing recommendations:
- Be specific with numbers ($XX,XXX savings expected)
- Reference similar jobs as benchmarks
- Prioritize by impact (high savings first)
- Include implementation steps

EXAMPLE QUERIES:
- "Show me overdue activities" → Use query_activities with overdue_only: true
- "Q2 sales by salesperson" → Use query_sales_orders with Q2 date filters, analyze by user_id
- "Top selling products this month" → Use query_order_lines with current month dates, group by product_id
- "Unpaid invoices" → Use query_invoices with payment_state: 'not_paid'
- "Vendor bills due this week" → Use query_vendor_bills with date filters
- "Cash flow this quarter" → Use query_payments with Q date filters, separate inbound/outbound
- "Products with low stock" → Use query_products, filter by qty_available
- "Purchase orders pending approval" → Use query_purchase_orders with state_filter: ['to approve']
- "Manufacturing orders in progress" → Use query_manufacturing_orders with state_filter: ['progress']
- "Employee expenses this month" → Use query_expenses with current month date filter
- "Stock movements today" → Use query_stock_moves with today's date
- "Deliveries scheduled this week" → Use query_stock_pickings with this week's date range
- "Jobs over budget" → Use query_jobs with over_budget: true
- "Show me job SO12345 details" → Use query_job_details with specific job_id
- "Compare this job to similar ones" → Use compare_similar_jobs with job_id
- "Analyze costs for Q3" → Use analyze_cost_trends with Q3 date range
- "What are the cost entries for this job?" → Use query_job_analytic_lines with job_id

CROSS-MODULE ANALYSIS:
- Revenue vs Costs: Combine query_sales_orders (revenue) with query_vendor_bills or query_expenses (costs)
- Inventory & Sales: Use query_products for stock, query_order_lines for demand
- Purchase vs Manufacturing: Use query_purchase_orders for materials, query_manufacturing_orders for production
- Cash Flow: Combine query_payments (inbound/outbound), query_invoices, and query_vendor_bills

Always provide comprehensive insights by leveraging multiple data sources when relevant.`
      },
      ...messages,
    ];

    // Initial AI call with tools
    let response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: conversationMessages,
        tools: tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      throw new Error('AI gateway error');
    }

    const firstResponse = await response.json();
    const choice = firstResponse.choices[0];
    
    // Check if AI wants to use tools
    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      console.log('AI requested tool calls:', choice.message.tool_calls.length);
      
      // Add assistant message with tool calls
      conversationMessages.push(choice.message);
      
      // Execute all tool calls
      for (const toolCall of choice.message.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);
        
        const toolResult = await executeToolCall(toolName, toolArgs);
        
        // Add tool response to conversation
        conversationMessages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: toolResult,
        });
      }
      
      // Make final AI call with tool results - now with streaming
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error on final call:', response.status, errorText);
        throw new Error('AI gateway error');
      }

      // Stream the final response
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    } else {
      // No tools needed, stream the direct response
      response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: conversationMessages,
          stream: true,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(
            JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
            {
              status: 429,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        if (response.status === 402) {
          return new Response(
            JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.' }),
            {
              status: 402,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        throw new Error('AI gateway error');
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }
  } catch (error) {
    console.error('Error in ai-copilot:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
