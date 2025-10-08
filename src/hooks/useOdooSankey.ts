import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SankeyNode {
  name: string;
}

export interface SankeyLink {
  source: number;
  target: number;
  value: number;
}

export interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

export const useOdooSankey = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [sankeyData, setSankeyData] = useState<SankeyData>({ nodes: [], links: [] });
  const { toast } = useToast();

  const fetchSankeyData = async () => {
    setIsLoading(true);
    
    try {
      const { data: opportunities, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [['type', '=', 'opportunity']],
            ['user_id', 'stage_id', 'expected_revenue', 'probability', 'partner_id']
          ]
        }
      });

      if (error) throw error;

      // Define node categories
      const salesReps = new Set<string>();
      const stages = new Set<string>();
      const outcomes = new Set<string>();
      const retentionCategories = ["High Value Retained", "Medium Value Retained", "Low Value Retained", "Lost"];

      // Map for tracking values
      const repToStage = new Map<string, Map<string, number>>();
      const stageToOutcome = new Map<string, Map<string, number>>();
      const outcomeToRetention = new Map<string, Map<string, number>>();

      opportunities?.forEach((opp: any) => {
        const salesRep = opp.user_id ? opp.user_id[1] : "Unassigned";
        const stage = opp.stage_id[1];
        const revenue = opp.expected_revenue || 0;
        
        // Determine outcome based on probability
        let outcome: string;
        if (opp.probability >= 90) outcome = "Closed Won";
        else if (opp.probability <= 10) outcome = "Closed Lost";
        else outcome = "In Progress";

        // Determine retention category based on outcome and revenue
        let retention: string;
        if (outcome === "Closed Won") {
          if (revenue >= 100000) retention = "High Value Retained";
          else if (revenue >= 50000) retention = "Medium Value Retained";
          else retention = "Low Value Retained";
        } else if (outcome === "Closed Lost") {
          retention = "Lost";
        } else {
          retention = "Low Value Retained"; // In progress treated as potential retention
        }

        salesReps.add(salesRep);
        stages.add(stage);
        outcomes.add(outcome);

        // Sales Rep -> Stage
        if (!repToStage.has(salesRep)) repToStage.set(salesRep, new Map());
        const stageMap = repToStage.get(salesRep)!;
        stageMap.set(stage, (stageMap.get(stage) || 0) + 1);

        // Stage -> Outcome
        if (!stageToOutcome.has(stage)) stageToOutcome.set(stage, new Map());
        const outcomeMap = stageToOutcome.get(stage)!;
        outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);

        // Outcome -> Retention
        if (!outcomeToRetention.has(outcome)) outcomeToRetention.set(outcome, new Map());
        const retentionMap = outcomeToRetention.get(outcome)!;
        retentionMap.set(retention, (retentionMap.get(retention) || 0) + 1);
      });

      // Build nodes array
      const nodes: SankeyNode[] = [
        ...Array.from(salesReps).map(s => ({ name: s })),
        ...Array.from(stages).map(s => ({ name: s })),
        ...Array.from(outcomes).map(o => ({ name: o })),
        ...retentionCategories.map(r => ({ name: r }))
      ];

      // Build links array
      const links: SankeyLink[] = [];
      const nodeIndex = (name: string) => nodes.findIndex(n => n.name === name);

      // Sales Rep -> Stage links
      repToStage.forEach((stages, rep) => {
        stages.forEach((value, stage) => {
          links.push({
            source: nodeIndex(rep),
            target: nodeIndex(stage),
            value
          });
        });
      });

      // Stage -> Outcome links
      stageToOutcome.forEach((outcomes, stage) => {
        outcomes.forEach((value, outcome) => {
          links.push({
            source: nodeIndex(stage),
            target: nodeIndex(outcome),
            value
          });
        });
      });

      // Outcome -> Retention links
      outcomeToRetention.forEach((retentions, outcome) => {
        retentions.forEach((value, retention) => {
          links.push({
            source: nodeIndex(outcome),
            target: nodeIndex(retention),
            value
          });
        });
      });

      setSankeyData({ nodes, links });
      return { nodes, links };
    } catch (error) {
      console.error('Sankey data fetch error:', error);
      toast({
        title: "Failed to fetch Sankey data",
        description: error instanceof Error ? error.message : "Failed to fetch Sankey data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSankeyData();
  }, []);

  return { sankeyData, isLoading, refetch: fetchSankeyData };
};
