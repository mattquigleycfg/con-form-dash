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
  {
    type: "function",
    function: {
      name: "query_sales_orders",
      description: "Query sales orders from Odoo. Use this to get revenue data, deal information, and sales by salesperson. Returns sales orders with fields: id, name, amount_total, date_order, state, user_id (salesperson), partner_id (customer).",
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
            description: "Filter by order state. Common values: 'sale' (confirmed), 'done' (completed), 'cancel' (cancelled). Leave empty for all states.",
          },
        },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_crm_leads",
      description: "Query CRM opportunities/leads from Odoo. Use this to get pipeline data, opportunity stages, and deal probabilities. Returns leads with fields: id, name, expected_revenue, probability, stage_id, user_id (salesperson), type, partner_id (customer).",
      parameters: {
        type: "object",
        properties: {
          opportunity_only: {
            type: "boolean",
            description: "If true, only returns opportunities (type='opportunity'). Default true.",
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
  {
    type: "function",
    function: {
      name: "query_products",
      description: "Query product catalog from Odoo. Use this to get product information, pricing, categories, and inventory data. Returns products with fields: id, name, list_price, standard_price (cost), categ_id (category), qty_available (stock), type.",
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
  {
    type: "function",
    function: {
      name: "query_invoices",
      description: "Query invoices from Odoo. Use this to get invoice data, payment status, and amounts. Returns invoices with fields: id, name, invoice_date, amount_total, state, payment_state, partner_id (customer).",
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
];

// Execute tool calls by invoking odoo-query function
async function executeToolCall(toolName: string, toolArgs: any) {
  console.log(`Executing tool: ${toolName}`, toolArgs);

  try {
    if (toolName === "query_sales_orders") {
      const filters: any[] = [];
      
      // Add date filter
      if (toolArgs.date_filter) {
        filters.push(['date_order', '>=', toolArgs.date_filter]);
      }
      
      // Add end date filter if provided
      if (toolArgs.end_date_filter) {
        filters.push(['date_order', '<=', toolArgs.end_date_filter]);
      }
      
      // Add state filter
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      } else {
        // Default to confirmed/done orders
        filters.push(['state', 'in', ['sale', 'done']]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'sale.order',
          method: 'search_read',
          args: [
            filters,
            ['name', 'amount_total', 'date_order', 'state', 'user_id', 'partner_id']
          ]
        }
      });

      if (error) throw error;

      // Filter by salesperson name if provided
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

    if (toolName === "query_crm_leads") {
      const filters: any[] = [];
      
      // Default to opportunities only
      if (toolArgs.opportunity_only !== false) {
        filters.push(['type', '=', 'opportunity']);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            filters,
            ['name', 'expected_revenue', 'probability', 'stage_id', 'user_id', 'type', 'partner_id']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      // Filter by salesperson name if provided
      if (toolArgs.salesperson_name && results.length > 0) {
        const searchName = toolArgs.salesperson_name.toLowerCase();
        results = results.filter((lead: any) => 
          lead.user_id && lead.user_id[1].toLowerCase().includes(searchName)
        );
      }

      // Filter by stage name if provided
      if (toolArgs.stage_name && results.length > 0) {
        const searchStage = toolArgs.stage_name.toLowerCase();
        results = results.filter((lead: any) => 
          lead.stage_id && lead.stage_id[1].toLowerCase().includes(searchStage)
        );
      }

      console.log(`Found ${results.length} CRM leads/opportunities`);
      return JSON.stringify(results);
    }

    if (toolName === "query_products") {
      const filters: any[] = [];

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'product.product',
          method: 'search_read',
          args: [
            filters,
            ['name', 'list_price', 'standard_price', 'categ_id', 'qty_available', 'type', 'active']
          ]
        }
      });

      if (error) throw error;

      let results = data || [];
      
      // Filter by product name if provided
      if (toolArgs.product_name && results.length > 0) {
        const searchName = toolArgs.product_name.toLowerCase();
        results = results.filter((product: any) => 
          product.name && product.name.toLowerCase().includes(searchName)
        );
      }

      // Filter by category name if provided
      if (toolArgs.category_name && results.length > 0) {
        const searchCategory = toolArgs.category_name.toLowerCase();
        results = results.filter((product: any) => 
          product.categ_id && product.categ_id[1].toLowerCase().includes(searchCategory)
        );
      }

      // Filter by availability if requested
      if (toolArgs.available_only && results.length > 0) {
        results = results.filter((product: any) => 
          product.qty_available && product.qty_available > 0
        );
      }

      console.log(`Found ${results.length} products`);
      return JSON.stringify(results);
    }

    if (toolName === "query_customers") {
      const filters: any[] = [];
      
      // Default to customers only
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
      
      // Filter by customer name if provided
      if (toolArgs.customer_name && results.length > 0) {
        const searchName = toolArgs.customer_name.toLowerCase();
        results = results.filter((partner: any) => 
          partner.name && partner.name.toLowerCase().includes(searchName)
        );
      }

      console.log(`Found ${results.length} customers`);
      return JSON.stringify(results);
    }

    if (toolName === "query_invoices") {
      const filters: any[] = [['move_type', '=', 'out_invoice']]; // Customer invoices only
      
      // Add date filter
      if (toolArgs.date_filter) {
        filters.push(['invoice_date', '>=', toolArgs.date_filter]);
      }
      
      // Add end date filter if provided
      if (toolArgs.end_date_filter) {
        filters.push(['invoice_date', '<=', toolArgs.end_date_filter]);
      }
      
      // Add state filter
      if (toolArgs.state_filter && toolArgs.state_filter.length > 0) {
        filters.push(['state', 'in', toolArgs.state_filter]);
      }

      // Add payment state filter
      if (toolArgs.payment_state) {
        filters.push(['payment_state', '=', toolArgs.payment_state]);
      }

      const { data, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'account.move',
          method: 'search_read',
          args: [
            filters,
            ['name', 'invoice_date', 'amount_total', 'state', 'payment_state', 'partner_id']
          ]
        }
      });

      if (error) throw error;

      console.log(`Found ${data?.length || 0} invoices`);
      return JSON.stringify(data || []);
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
        content: `You are a helpful sales analytics assistant with direct access to Odoo ERP data. You can query real sales orders and CRM opportunities to provide accurate, data-driven insights.

CURRENT DATE CONTEXT:
- Today's date: ${currentDate}
- Current year: ${currentYear}
- Current quarter: Q${currentQuarter} ${currentYear}
- Q1 ${currentYear}: ${quarters.Q1.start} to ${quarters.Q1.end}
- Q2 ${currentYear}: ${quarters.Q2.start} to ${quarters.Q2.end}
- Q3 ${currentYear}: ${quarters.Q3.start} to ${quarters.Q3.end}
- Q4 ${currentYear}: ${quarters.Q4.start} to ${quarters.Q4.end}

IMPORTANT INSTRUCTIONS:
- When asked about "last quarter" or "Q2" without a year, use the most recent completed quarter or the quarter from the current year
- When asked about sales data, revenue, deals, or salesperson performance, ALWAYS use the available tools to query real Odoo data
- For date ranges, use the date_filter parameter with ISO format (YYYY-MM-DD)
- When querying by salesperson, use their first name or full name in the salesperson_name parameter
- Format currency amounts nicely (e.g., $458,250 instead of 458250)
- Provide clear, actionable insights based on the actual data
- If tool execution fails, explain what went wrong and suggest alternatives

AVAILABLE DATA:
- Sales Orders: Contains confirmed and completed sales with revenue amounts, salespeople, and customers
- CRM Leads/Opportunities: Contains pipeline data with stages, probabilities, expected revenue, and salespeople
- Products: Product catalog with pricing, categories, stock levels, and product types
- Customers: Customer/partner information including contact details and company data
- Invoices: Invoice data with amounts, payment status, dates, and customers

EXAMPLES:
- "Q2 sales" → Use query_sales_orders with date_filter: '>=${quarters.Q2.start}' and add filter for date_order '<=${quarters.Q2.end}'
- "Last 3 months" → Calculate 3 months back from ${currentDate}
- "Joel Boustani's sales last 3 months" → Use query_sales_orders with date_filter and salesperson_name: "Joel"
- "Pipeline by stage" → Use query_crm_leads to get all opportunities and analyze by stage_id
- "Top performers this year" → Use query_sales_orders with date_filter: '>=${currentYear}-01-01'
- "Show me our products" → Use query_products to get product catalog
- "Which products are in stock?" → Use query_products with available_only: true
- "Customer list" → Use query_customers to get all customers
- "Unpaid invoices" → Use query_invoices with payment_state: 'not_paid'`
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
