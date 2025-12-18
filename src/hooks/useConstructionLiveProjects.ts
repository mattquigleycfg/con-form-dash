import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveProjectMetrics {
  nswProjects: number;
  vicProjects: number;
  qldProjects: number;
  totalValue: number;
  projectsByState: {
    state: string;
    count: number;
    value: number;
  }[];
}

interface SaleOrder {
  id: number;
  name: string;
  partner_id: [number, string];
  amount_total: number;
  state: string; // 'sale', 'done'
  invoice_status: string; // 'to invoice', 'invoiced', 'no'
  date_order: string;
}

interface Partner {
  id: number;
  state_id: [number, string] | false;
}

// Map Australian states to their abbreviations
const STATE_MAP: Record<string, string> = {
  'New South Wales': 'NSW',
  'Victoria': 'VIC',
  'Queensland': 'QLD',
  'South Australia': 'SA',
  'Western Australia': 'WA',
  'Tasmania': 'TAS',
  'Northern Territory': 'NT',
  'Australian Capital Territory': 'ACT',
};

/**
 * Fetches "Closed Won / Not Invoiced" sales orders from Odoo
 * These are orders in 'sale' or 'done' state that haven't been fully invoiced
 */
async function fetchLiveProjects(): Promise<SaleOrder[]> {
  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "sale.order",
      method: "search_read",
      args: [
        [
          ["state", "in", ["sale", "done"]], // Confirmed orders
          ["|", ["invoice_status", "=", "to invoice"], ["invoice_status", "=", "no"]], // Not fully invoiced
        ],
        [
          "id",
          "name",
          "partner_id",
          "amount_total",
          "state",
          "invoice_status",
          "date_order",
        ],
      ],
      kwargs: {
        order: "date_order desc",
        limit: 1000,
      },
    },
  });

  if (error) throw error;
  console.log(`🏗️ Live Projects: Found ${data?.length || 0} orders`);
  return data as SaleOrder[];
}

/**
 * Fetches partner details to get state information
 */
async function fetchPartnerStates(partnerIds: number[]): Promise<Map<number, string>> {
  if (partnerIds.length === 0) return new Map();

  const { data, error } = await supabase.functions.invoke("odoo-query", {
    body: {
      model: "res.partner",
      method: "search_read",
      args: [
        [["id", "in", partnerIds]],
        ["id", "state_id"],
      ],
    },
  });

  if (error) throw error;

  const stateMap = new Map<number, string>();
  (data as Partner[])?.forEach((partner) => {
    if (partner.state_id && partner.state_id[1]) {
      // Map full state name to abbreviation
      const fullStateName = partner.state_id[1];
      const stateAbbr = Object.entries(STATE_MAP).find(
        ([fullName]) => fullStateName.includes(fullName)
      )?.[1];
      
      if (stateAbbr) {
        stateMap.set(partner.id, stateAbbr);
      }
    }
  });

  console.log(`📍 Mapped ${stateMap.size} partners to states`);
  return stateMap;
}

/**
 * Aggregates projects by state
 */
function aggregateProjectsByState(
  orders: SaleOrder[],
  stateMap: Map<number, string>
): LiveProjectMetrics {
  const stateAggregation = new Map<string, { count: number; value: number }>();

  orders.forEach((order) => {
    const partnerId = order.partner_id[0];
    const state = stateMap.get(partnerId);

    if (state) {
      const existing = stateAggregation.get(state) || { count: 0, value: 0 };
      stateAggregation.set(state, {
        count: existing.count + 1,
        value: existing.value + order.amount_total,
      });
    }
  });

  // Extract NSW, VIC, QLD specifically
  const nsw = stateAggregation.get("NSW") || { count: 0, value: 0 };
  const vic = stateAggregation.get("VIC") || { count: 0, value: 0 };
  const qld = stateAggregation.get("QLD") || { count: 0, value: 0 };

  // Calculate total value across all states
  const totalValue = Array.from(stateAggregation.values()).reduce(
    (sum, state) => sum + state.value,
    0
  );

  const projectsByState = Array.from(stateAggregation.entries()).map(
    ([state, { count, value }]) => ({
      state,
      count,
      value,
    })
  );

  console.log(`📊 Live Projects by State:`, {
    NSW: nsw.count,
    VIC: vic.count,
    QLD: qld.count,
    Total: totalValue,
  });

  return {
    nswProjects: nsw.count,
    vicProjects: vic.count,
    qldProjects: qld.count,
    totalValue,
    projectsByState,
  };
}

/**
 * Hook to fetch and aggregate live construction projects by state
 * "Live" = Closed Won (state = 'sale' or 'done') but Not Fully Invoiced
 */
export function useConstructionLiveProjects() {
  return useQuery({
    queryKey: ["construction-live-projects"],
    queryFn: async (): Promise<LiveProjectMetrics> => {
      // Step 1: Fetch live projects (closed won, not invoiced)
      const orders = await fetchLiveProjects();

      if (orders.length === 0) {
        return {
          nswProjects: 0,
          vicProjects: 0,
          qldProjects: 0,
          totalValue: 0,
          projectsByState: [],
        };
      }

      // Step 2: Get unique partner IDs
      const partnerIds = [...new Set(orders.map((o) => o.partner_id[0]))];

      // Step 3: Fetch partner states
      const stateMap = await fetchPartnerStates(partnerIds);

      // Step 4: Aggregate by state
      return aggregateProjectsByState(orders, stateMap);
    },
    staleTime: 1000 * 60 * 10, // 10 minutes
    refetchInterval: 1000 * 60 * 10, // Auto-refresh every 10 minutes
  });
}

