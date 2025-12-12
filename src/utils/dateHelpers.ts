import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  subWeeks,
  subMonths,
  format,
  isWithinInterval,
} from "date-fns";

export type DatePeriod = "week" | "month" | "quarter" | "ytd" | "year";

/**
 * Get Australian Financial Year start (July 1)
 */
export function getFinancialYearStart(date: Date = new Date()): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() : date.getFullYear() - 1;
  return new Date(year, 6, 1); // July 1
}

/**
 * Get Australian Financial Year end (June 30)
 */
export function getFinancialYearEnd(date: Date = new Date()): Date {
  const year = date.getMonth() >= 6 ? date.getFullYear() + 1 : date.getFullYear();
  return new Date(year, 5, 30, 23, 59, 59); // June 30
}

/**
 * Get date range for a given period
 */
export function getDateRange(period: DatePeriod, referenceDate: Date = new Date()): { start: Date; end: Date } {
  switch (period) {
    case "week":
      return {
        start: startOfWeek(referenceDate, { weekStartsOn: 1 }), // Monday
        end: endOfWeek(referenceDate, { weekStartsOn: 1 }), // Sunday
      };
    case "month":
      return {
        start: startOfMonth(referenceDate),
        end: endOfMonth(referenceDate),
      };
    case "quarter":
      return {
        start: startOfQuarter(referenceDate),
        end: endOfQuarter(referenceDate),
      };
    case "ytd":
      return {
        start: getFinancialYearStart(referenceDate),
        end: referenceDate,
      };
    case "year":
      return {
        start: getFinancialYearStart(referenceDate),
        end: getFinancialYearEnd(referenceDate),
      };
  }
}

/**
 * Get previous period date range for comparison
 */
export function getPreviousPeriodRange(
  period: DatePeriod,
  referenceDate: Date = new Date()
): { start: Date; end: Date } {
  switch (period) {
    case "week":
      const prevWeekDate = subWeeks(referenceDate, 1);
      return {
        start: startOfWeek(prevWeekDate, { weekStartsOn: 1 }),
        end: endOfWeek(prevWeekDate, { weekStartsOn: 1 }),
      };
    case "month":
      const prevMonthDate = subMonths(referenceDate, 1);
      return {
        start: startOfMonth(prevMonthDate),
        end: endOfMonth(prevMonthDate),
      };
    case "quarter":
      const prevQuarterDate = subMonths(referenceDate, 3);
      return {
        start: startOfQuarter(prevQuarterDate),
        end: endOfQuarter(prevQuarterDate),
      };
    case "ytd":
    case "year":
      // Previous financial year
      const prevYearStart = getFinancialYearStart(referenceDate);
      prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
      const prevYearEnd = getFinancialYearEnd(referenceDate);
      prevYearEnd.setFullYear(prevYearEnd.getFullYear() - 1);
      return { start: prevYearStart, end: prevYearEnd };
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(start: Date, end: Date): string {
  const startMonth = format(start, "MMM d");
  const endMonth = format(end, "MMM d, yyyy");
  return `${startMonth} - ${endMonth}`;
}

/**
 * Format period label
 */
export function getPeriodLabel(period: DatePeriod): string {
  const labels: Record<DatePeriod, string> = {
    week: "This Week",
    month: "This Month",
    quarter: "This Quarter",
    ytd: "YTD",
    year: "Financial Year",
  };
  return labels[period];
}

/**
 * Check if a date is within the current financial year
 */
export function isInCurrentFinancialYear(date: Date): boolean {
  const fyStart = getFinancialYearStart();
  const fyEnd = getFinancialYearEnd();
  return isWithinInterval(date, { start: fyStart, end: fyEnd });
}

/**
 * Get ISO date string for Odoo queries
 */
export function toOdooDate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/**
 * Get ISO datetime string for Odoo queries
 */
export function toOdooDateTime(date: Date): string {
  return date.toISOString();
}

