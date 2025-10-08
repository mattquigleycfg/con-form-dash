import { useMemo } from 'react';
import { useFilters } from '@/contexts/FilterContext';

export function useFilteredData<T extends Record<string, any>>(
  data: T[],
  config: {
    dateField?: string;
    stageField?: string;
    statusField?: string;
    userField?: string;
    valueField?: string;
    probabilityField?: string;
    searchFields?: string[];
  }
) {
  const { filters } = useFilters();

  return useMemo(() => {
    if (!data) return [];

    let filtered = [...data];

    // Date range filter
    if (filters.dateRange.startDate && filters.dateRange.endDate && config.dateField) {
      filtered = filtered.filter((item) => {
        const itemDate = new Date(item[config.dateField]);
        return (
          itemDate >= filters.dateRange.startDate! &&
          itemDate <= filters.dateRange.endDate!
        );
      });
    }

    // Opportunity stage filter
    if (filters.opportunityStage.length > 0 && config.stageField) {
      filtered = filtered.filter((item) => {
        const stage = Array.isArray(item[config.stageField])
          ? item[config.stageField][1]
          : item[config.stageField];
        return filters.opportunityStage.includes(stage);
      });
    }

    // Deal status filter
    if (filters.dealStatus.length > 0 && config.statusField) {
      filtered = filtered.filter((item) =>
        filters.dealStatus.includes(item[config.statusField])
      );
    }

    // Sales rep filter
    if (filters.salesRep.length > 0 && config.userField) {
      filtered = filtered.filter((item) => {
        const userId = Array.isArray(item[config.userField])
          ? item[config.userField][0]
          : item[config.userField];
        return filters.salesRep.includes(userId?.toString());
      });
    }

    // Deal value filter
    if (config.valueField) {
      filtered = filtered.filter((item) => {
        const value = item[config.valueField] || 0;
        return value >= filters.dealValue.min && value <= filters.dealValue.max;
      });
    }

    // Probability filter
    if (config.probabilityField) {
      filtered = filtered.filter((item) => {
        const prob = item[config.probabilityField] || 0;
        return prob >= filters.probability.min && prob <= filters.probability.max;
      });
    }

    // Search query filter
    if (filters.searchQuery && config.searchFields) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter((item) =>
        config.searchFields!.some((field) =>
          item[field]?.toString().toLowerCase().includes(query)
        )
      );
    }

    return filtered;
  }, [data, filters, config]);
}
