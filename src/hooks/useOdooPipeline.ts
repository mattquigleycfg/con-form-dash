import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useOdooOpportunities } from "./useOdooOpportunities";

export interface PipelineStage {
  stage: string;
  count: number;
  value: number;
}

export const useOdooPipeline = () => {
  const [pipelineData, setPipelineData] = useState<PipelineStage[]>([]);
  const { opportunities, isLoading } = useOdooOpportunities();

  useEffect(() => {
    // Aggregate filtered opportunities by stage
    const stageMap: Record<string, { count: number; value: number }> = {};
    
    opportunities.forEach((opp) => {
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
  }, [opportunities]);

  return { pipelineData, isLoading };
};
