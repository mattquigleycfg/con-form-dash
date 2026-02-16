import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface OdooProjectStage {
  id: number;
  name: string;
  sequence: number;
  fold: boolean;
}

export const useOdooProjectStages = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [stages, setStages] = useState<OdooProjectStage[]>([]);
  const { toast } = useToast();

  const fetchStages = async () => {
    setIsLoading(true);
    
    try {
      // Primary: try fetching from project.project.stage model (custom Odoo model for project-level stages)
      let stageData: any[] | null = null;
      try {
        const { data, error } = await supabase.functions.invoke('odoo-query', {
          body: {
            model: 'project.project.stage',
            method: 'search_read',
            args: [
              [],
              ['name', 'sequence', 'fold']
            ]
          }
        });
        if (!error && data && Array.isArray(data) && data.length > 0) {
          stageData = data;
        }
      } catch {
        // project.project.stage model may not exist — fall through to fallback
        console.info('project.project.stage model not available, falling back to project records');
      }

      // Fallback: extract unique stage_id values from project.project records
      if (!stageData || stageData.length === 0) {
        try {
          const { data: projects, error } = await supabase.functions.invoke('odoo-query', {
            body: {
              model: 'project.project',
              method: 'search_read',
              args: [
                [["active", "=", true]],
                ['id', 'stage_id']
              ]
            }
          });
          if (!error && projects && Array.isArray(projects)) {
            const stageMap = new Map<number, string>();
            for (const p of projects) {
              if (p.stage_id && p.stage_id[0] && p.stage_id[1]) {
                stageMap.set(p.stage_id[0], p.stage_id[1]);
              }
            }
            stageData = Array.from(stageMap.entries()).map(([id, name], idx) => ({
              id,
              name,
              sequence: idx,
              fold: false,
            }));
          }
        } catch {
          console.error('Failed to extract stages from project.project records');
        }
      }

      const sortedStages = (stageData || [])
        .map((stage: any) => ({
          id: stage.id,
          name: stage.name,
          sequence: stage.sequence || 0,
          fold: stage.fold || false
        }))
        .filter((stage: OdooProjectStage) => !stage.fold)
        .sort((a: OdooProjectStage, b: OdooProjectStage) => a.sequence - b.sequence);

      setStages(sortedStages);
      return sortedStages;
    } catch (error) {
      console.error('Project stages fetch error:', error);
      toast({
        title: "Failed to fetch project stages",
        description: error instanceof Error ? error.message : "Failed to fetch Odoo project stages",
        variant: "destructive",
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStages();
  }, []);

  return { stages, isLoading, refetch: fetchStages };
};
