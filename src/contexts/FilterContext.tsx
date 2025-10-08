import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

export interface DateRange {
  preset: string;
  startDate: Date | null;
  endDate: Date | null;
}

export interface FilterState {
  dateRange: DateRange;
  opportunityStage: string[];
  dealStatus: string[];
  salesRep: string[];
  dealValue: { min: number; max: number };
  probability: { min: number; max: number };
  searchQuery: string;
  customFilters: Record<string, any>;
}

export interface FilterTemplate {
  id: string;
  name: string;
  filters: Partial<FilterState>;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  resetFilters: () => void;
  applyTemplate: (template: FilterTemplate) => void;
  saveTemplate: (name: string) => void;
  templates: FilterTemplate[];
  deleteTemplate: (id: string) => void;
  isFiltered: boolean;
}

const defaultFilters: FilterState = {
  dateRange: {
    preset: 'all',
    startDate: null,
    endDate: null,
  },
  opportunityStage: [],
  dealStatus: [],
  salesRep: [],
  dealValue: { min: 0, max: 1000000 },
  probability: { min: 0, max: 100 },
  searchQuery: '',
  customFilters: {},
};

const FilterContext = createContext<FilterContextType | undefined>(undefined);

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within FilterProvider');
  }
  return context;
};

export const FilterProvider = ({ children }: { children: ReactNode }) => {
  const [filters, setFiltersState] = useState<FilterState>(() => {
    const saved = localStorage.getItem('salesDashboardFilters');
    return saved ? JSON.parse(saved) : defaultFilters;
  });

  const [templates, setTemplates] = useState<FilterTemplate[]>(() => {
    const saved = localStorage.getItem('salesDashboardTemplates');
    return saved ? JSON.parse(saved) : [
      {
        id: 'high-value',
        name: 'High Value Deals',
        filters: {
          dealValue: { min: 50000, max: 1000000 },
          opportunityStage: ['Proposal', 'Negotiation'],
          probability: { min: 70, max: 100 },
        },
      },
      {
        id: 'this-quarter',
        name: 'This Quarter Performance',
        filters: {
          dateRange: {
            preset: 'quarter',
            startDate: getQuarterStart(),
            endDate: new Date(),
          },
          dealStatus: ['Open', 'Won'],
        },
      },
    ];
  });

  const { toast } = useToast();

  useEffect(() => {
    localStorage.setItem('salesDashboardFilters', JSON.stringify(filters));
  }, [filters]);

  useEffect(() => {
    localStorage.setItem('salesDashboardTemplates', JSON.stringify(templates));
  }, [templates]);

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFiltersState(defaultFilters);
    toast({
      title: 'Filters Reset',
      description: 'All filters have been cleared',
    });
  };

  const applyTemplate = (template: FilterTemplate) => {
    setFiltersState((prev) => ({ ...prev, ...template.filters }));
    toast({
      title: 'Template Applied',
      description: `"${template.name}" filter template has been applied`,
    });
  };

  const saveTemplate = (name: string) => {
    const newTemplate: FilterTemplate = {
      id: Date.now().toString(),
      name,
      filters: { ...filters },
    };
    setTemplates((prev) => [...prev, newTemplate]);
    toast({
      title: 'Template Saved',
      description: `"${name}" has been saved to your templates`,
    });
  };

  const deleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
    toast({
      title: 'Template Deleted',
      description: 'Filter template has been removed',
    });
  };

  const isFiltered =
    filters.dateRange.preset !== 'all' ||
    filters.opportunityStage.length > 0 ||
    filters.dealStatus.length > 0 ||
    filters.salesRep.length > 0 ||
    filters.dealValue.min > 0 ||
    filters.dealValue.max < 1000000 ||
    filters.probability.min > 0 ||
    filters.probability.max < 100 ||
    filters.searchQuery !== '';

  return (
    <FilterContext.Provider
      value={{
        filters,
        setFilters,
        resetFilters,
        applyTemplate,
        saveTemplate,
        templates,
        deleteTemplate,
        isFiltered,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

function getQuarterStart(): Date {
  const now = new Date();
  const quarter = Math.floor(now.getMonth() / 3);
  return new Date(now.getFullYear(), quarter * 3, 1);
}
