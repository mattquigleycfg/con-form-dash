/**
 * Working Hours Calculation Utility
 * 
 * Calculates business hours between two dates, excluding weekends
 * and hours outside of working hours (9 AM - 5 PM, Monday-Friday).
 */

export interface WorkingHoursConfig {
  workDayStartHour: number; // 9 AM
  workDayEndHour: number;   // 5 PM (17:00)
  hoursPerWorkDay: number;  // 8 hours
}

const DEFAULT_CONFIG: WorkingHoursConfig = {
  workDayStartHour: 9,
  workDayEndHour: 17,
  hoursPerWorkDay: 8,
};

/**
 * Check if a date falls on a weekend (Saturday or Sunday)
 */
function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Get the start of the working day for a given date
 */
function getWorkDayStart(date: Date, config: WorkingHoursConfig): Date {
  const result = new Date(date);
  result.setHours(config.workDayStartHour, 0, 0, 0);
  return result;
}

/**
 * Get the end of the working day for a given date
 */
function getWorkDayEnd(date: Date, config: WorkingHoursConfig): Date {
  const result = new Date(date);
  result.setHours(config.workDayEndHour, 0, 0, 0);
  return result;
}

/**
 * Get the next working day (skip weekends)
 */
function getNextWorkDay(date: Date): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + 1);
  result.setHours(0, 0, 0, 0);
  
  // Skip weekends
  while (isWeekend(result)) {
    result.setDate(result.getDate() + 1);
  }
  
  return result;
}

/**
 * Calculate working hours between two dates
 * 
 * @param startDate - Start timestamp (ISO string or Date)
 * @param endDate - End timestamp (ISO string or Date)
 * @param config - Working hours configuration (optional)
 * @returns Number of working hours between the two dates
 * 
 * @example
 * // Monday 10 AM to Monday 3 PM = 5 working hours
 * calculateWorkingHours('2024-01-08T10:00:00', '2024-01-08T15:00:00')
 * 
 * // Friday 4 PM to Monday 10 AM = 2 hours (Friday) + 1 hour (Monday) = 3 hours
 * calculateWorkingHours('2024-01-05T16:00:00', '2024-01-08T10:00:00')
 */
export function calculateWorkingHours(
  startDate: string | Date,
  endDate: string | Date,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  // Validate inputs
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('Invalid date provided to calculateWorkingHours');
    return 0;
  }

  if (end <= start) {
    return 0;
  }

  let totalHours = 0;
  let currentDate = new Date(start);

  // Process each day from start to end
  while (currentDate < end) {
    // Skip weekends
    if (isWeekend(currentDate)) {
      currentDate = getNextWorkDay(currentDate);
      continue;
    }

    const workDayStart = getWorkDayStart(currentDate, config);
    const workDayEnd = getWorkDayEnd(currentDate, config);
    const nextDay = getNextWorkDay(currentDate);

    // Determine the actual start time for this day
    const dayStartTime = currentDate > workDayStart ? currentDate : workDayStart;
    
    // Determine the actual end time for this day
    let dayEndTime: Date;
    if (end < nextDay) {
      // End date is within this day
      dayEndTime = end < workDayEnd ? end : workDayEnd;
    } else {
      // End date is on a future day
      dayEndTime = workDayEnd;
    }

    // Calculate hours for this day
    if (dayStartTime < dayEndTime && dayStartTime < workDayEnd && dayEndTime > workDayStart) {
      const hoursThisDay = (dayEndTime.getTime() - dayStartTime.getTime()) / (1000 * 60 * 60);
      totalHours += Math.max(0, Math.min(hoursThisDay, config.hoursPerWorkDay));
    }

    // Move to next day
    currentDate = nextDay;
  }

  return totalHours;
}

/**
 * Calculate working days between two dates (excluding weekends)
 */
export function calculateWorkingDays(
  startDate: string | Date,
  endDate: string | Date
): number {
  const start = typeof startDate === 'string' ? new Date(startDate) : new Date(startDate);
  const end = typeof endDate === 'string' ? new Date(endDate) : new Date(endDate);

  if (end <= start) return 0;

  let workingDays = 0;
  let currentDate = new Date(start);
  currentDate.setHours(0, 0, 0, 0);

  while (currentDate < end) {
    if (!isWeekend(currentDate)) {
      workingDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return workingDays;
}

/**
 * Format working hours for display
 * 
 * @example
 * formatWorkingHours(12.5) => "12.5 hrs"
 * formatWorkingHours(40) => "5 days"
 * formatWorkingHours(1.5, true) => "1d 4h" (1 day + 4 hours)
 */
export function formatWorkingHours(
  hours: number,
  showDays: boolean = false,
  config: WorkingHoursConfig = DEFAULT_CONFIG
): string {
  if (hours === 0) return "0 hrs";
  
  if (showDays && hours >= config.hoursPerWorkDay) {
    const days = Math.floor(hours / config.hoursPerWorkDay);
    const remainingHours = Math.round(hours % config.hoursPerWorkDay);
    
    if (remainingHours === 0) {
      return `${days}d`;
    }
    return `${days}d ${remainingHours}h`;
  }
  
  return `${hours.toFixed(1)} hrs`;
}

