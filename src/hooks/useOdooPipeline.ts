import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export const useOdooPipeline = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const { toast } = useToast();

  const fetchPipelineData = async () => {
    setIsLoading(true);
    
    try {
      const { data: opportunities, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'crm.lead',
          method: 'search_read',
          args: [
            [['type', '=', 'opportunity']],
            ['stage_id', 'expected_revenue']
          ]
        }
      });

      if (error) throw error;

      // Aggregate by stage
      const stageMap: Record<string, { count: number; value: number }> = {};
      
      opportunities?.forEach((opp: any) => {
        const stageName = opp.stage_id[1];
        if (!stageMap[stageName]) {
          stageMap[stageName] = { count: 0, value: 0 };
        }
        stageMap[stageName].count += 1;
        stageMap[stageName].value += opp.expected_revenue || 0;
      });

      // Convert to array
      const data: PipelineStage[] = Object.entries(stageMap).map(([stage, stats]) => ({
        stage,
        count: stats.count,
        value: Math.round(stats.value)
      }));

      setPipelineData(data);
      return data;
    } catch (error) {
      console.error('Pipeline sync error:', error);
      toast({
        title: "Pipeline sync failed",
        description: error instanceof Error ? error.message : "Failed to sync pipeline data",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPipelineData();
  }, []);

  return { pipelineData, isLoading, refetch: fetchPipelineData };
};
