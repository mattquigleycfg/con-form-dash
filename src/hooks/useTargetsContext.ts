import { useMonthlyTargets } from "./useMonthlyTargets";
import { useSalespersonTargets, SALESPEOPLE } from "./useSalespersonTargets";
import { useMemo } from "react";

/**
 * Hook that provides target data for use across the application
 * Combines team and salesperson targets for easy access
 */
export const useTargetsContext = () => {
  const { targets: teamTargets, isLoading: isTeamLoading } = useMonthlyTargets("FY25-26");
  const { targets: salespersonTargets, isLoading: isSalespersonLoading } = useSalespersonTargets({
    financialYear: "FY25-26",
    periodType: "monthly",
  });

  // Get current month's team target for CFG
  const currentMonthTeamTarget = useMemo(() => {
    const now = new Date();
    const currentMonth = teamTargets.find(t => {
      const targetDate = new Date(t.month_date);
      return targetDate.getMonth() === now.getMonth() && targetDate.getFullYear() === now.getFullYear();
    });
    return currentMonth?.cfg_sales_target || 0;
  }, [teamTargets]);

  // Get current month's salesperson targets
  const currentMonthSalespersonTargets = useMemo(() => {
    const now = new Date();
    return SALESPEOPLE.map(name => {
      const target = salespersonTargets.find(t => 
        t.salesperson_name === name && 
        new Date(t.period_start_date).getMonth() === now.getMonth() &&
        new Date(t.period_start_date).getFullYear() === now.getFullYear()
      );
      return {
        name,
        target: target?.cfg_sales_target || 0,
        actual: target?.cfg_sales_actual || 0,
        variance: target?.cfg_sales_variance || 0,
      };
    });
  }, [salespersonTargets]);

  // Get quarterly targets
  const currentQuarterTeamTarget = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    
    // Financial year starts in July (month 6)
    let quarter: string;
    if (currentMonth >= 6 && currentMonth <= 8) quarter = 'Q1'; // Jul-Sep
    else if (currentMonth >= 9 && currentMonth <= 11) quarter = 'Q2'; // Oct-Dec
    else if (currentMonth >= 0 && currentMonth <= 2) quarter = 'Q3'; // Jan-Mar
    else quarter = 'Q4'; // Apr-Jun
    
    const quarterMonths = teamTargets.filter(t => {
      const month = t.month.substring(0, 3); // Get month abbreviation
      switch(quarter) {
        case 'Q1': return ['Jul', 'Aug', 'Sep'].includes(month);
        case 'Q2': return ['Oct', 'Nov', 'Dec'].includes(month);
        case 'Q3': return ['Jan', 'Feb', 'Mar'].includes(month);
        case 'Q4': return ['Apr', 'May', 'Jun'].includes(month);
        default: return false;
      }
    });
    
    return quarterMonths.reduce((sum, t) => sum + t.cfg_sales_target, 0);
  }, [teamTargets]);

  // Get yearly target
  const yearlyTeamTarget = useMemo(() => {
    return teamTargets.reduce((sum, t) => sum + t.cfg_sales_target, 0);
  }, [teamTargets]);

  return {
    // Team targets
    teamTargets,
    currentMonthTeamTarget,
    currentQuarterTeamTarget,
    yearlyTeamTarget,
    
    // Salesperson targets
    salespersonTargets,
    currentMonthSalespersonTargets,
    
    // Loading states
    isLoading: isTeamLoading || isSalespersonLoading,
  };
};

