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

**GENERAL:**
- query_customers: Customer/partner information with contact details

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
