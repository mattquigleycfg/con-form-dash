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
            ['source_id', 'stage_id', 'expected_revenue', 'probability']
          ]
        }
      });

      if (error) throw error;

      // Define node categories
      const sources = new Set<string>();
      const stages = new Set<string>();
      const outcomes = new Set<string>();
      const revenueBuckets = ["<$10K", "$10K-$50K", "$50K-$100K", ">$100K"];

      // Map for tracking values
      const sourceToStage = new Map<string, Map<string, number>>();
      const stageToOutcome = new Map<string, Map<string, number>>();
      const outcomeToRevenue = new Map<string, Map<string, number>>();

      opportunities?.forEach((opp: any) => {
        const source = opp.source_id ? opp.source_id[1] : "Unknown";
        const stage = opp.stage_id[1];
        const revenue = opp.expected_revenue || 0;
        
        // Determine outcome based on probability
        let outcome: string;
        if (opp.probability >= 90) outcome = "Closed Won";
        else if (opp.probability <= 10) outcome = "Closed Lost";
        else outcome = "Ongoing";

        // Determine revenue bucket
        let bucket: string;
        if (revenue < 10000) bucket = "<$10K";
        else if (revenue < 50000) bucket = "$10K-$50K";
        else if (revenue < 100000) bucket = "$50K-$100K";
        else bucket = ">$100K";

        sources.add(source);
        stages.add(stage);
        outcomes.add(outcome);

        // Source -> Stage
        if (!sourceToStage.has(source)) sourceToStage.set(source, new Map());
        const stageMap = sourceToStage.get(source)!;
        stageMap.set(stage, (stageMap.get(stage) || 0) + 1);

        // Stage -> Outcome
        if (!stageToOutcome.has(stage)) stageToOutcome.set(stage, new Map());
        const outcomeMap = stageToOutcome.get(stage)!;
        outcomeMap.set(outcome, (outcomeMap.get(outcome) || 0) + 1);

        // Outcome -> Revenue Bucket (only for won deals)
        if (outcome === "Closed Won") {
          if (!outcomeToRevenue.has(outcome)) outcomeToRevenue.set(outcome, new Map());
          const revenueMap = outcomeToRevenue.get(outcome)!;
          revenueMap.set(bucket, (revenueMap.get(bucket) || 0) + revenue);
        }
      });

      // Build nodes array
      const nodes: SankeyNode[] = [
        ...Array.from(sources).map(s => ({ name: s })),
        ...Array.from(stages).map(s => ({ name: s })),
        ...Array.from(outcomes).map(o => ({ name: o })),
        ...revenueBuckets.map(b => ({ name: b }))
      ];

      // Build links array
      const links: SankeyLink[] = [];
      const nodeIndex = (name: string) => nodes.findIndex(n => n.name === name);

      // Source -> Stage links
      sourceToStage.forEach((stages, source) => {
        stages.forEach((value, stage) => {
          links.push({
            source: nodeIndex(source),
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

      // Outcome -> Revenue Bucket links
      outcomeToRevenue.forEach((buckets, outcome) => {
        buckets.forEach((value, bucket) => {
          links.push({
            source: nodeIndex(outcome),
            target: nodeIndex(bucket),
            value: Math.round(value / 1000) // Convert to thousands
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
