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
      const { data: stageData, error } = await supabase.functions.invoke('odoo-query', {
        body: {
          model: 'project.task.type',
          method: 'search_read',
          args: [
            [],
            ['name', 'sequence', 'fold']
          ]
        }
      });

      if (error) throw error;

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
