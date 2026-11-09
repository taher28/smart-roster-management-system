import { describe, it, expect } from 'vitest';
import {
  formatDate,
  getDaysInMonth,
  isBrandProcessOpenOnDate,
  isDatePublicHoliday,
  isEmployeeOnApprovedLeave,
  isEmployeeOnWeeklyOff,
  isEmployeeExplicitlyUnavailable,
  generateMonthlyRoster,
  EngineStatus,
} from '../rosterEngine.js';
import { detectRosterConflicts } from '../conflictDetector.js';
import {
  INITIAL_EMPLOYEES,
  INITIAL_BRANDS,
  INITIAL_PROCESSES,
  INITIAL_BRAND_PROCESSES,
  INITIAL_ASSIGNMENTS,
  INITIAL_WEEKLY_OFFS,
  INITIAL_HOLIDAYS,
  INITIAL_LEAVES,
  INITIAL_AVAILABILITY,
} from '../../mockData.js';

describe('Calendar and Operating Rules', () => {
  it('handles 365_days calendar correctly (open on Sundays and holidays)', () => {
    // Sunday
    expect(isBrandProcessOpenOnDate('365_days', '2026-11-01', false)).toBe(true);
    // Sunday with holiday
    expect(isBrandProcessOpenOnDate('365_days', '2026-11-01', true)).toBe(true);
    // Weekday
    expect(isBrandProcessOpenOnDate('365_days', '2026-11-02', false)).toBe(true);
  });

  it('handles no_holidays calendar correctly (open on Sundays, closed on holidays)', () => {
    // Sunday regular
    expect(isBrandProcessOpenOnDate('no_holidays', '2026-11-01', false)).toBe(true);
    // Weekday holiday
    expect(isBrandProcessOpenOnDate('no_holidays', '2026-11-08', true)).toBe(false);
    // Regular weekday
    expect(isBrandProcessOpenOnDate('no_holidays', '2026-11-02', false)).toBe(true);
  });

  it('handles no_sundays_holidays calendar correctly (closed on Sundays and holidays)', () => {
    // Sunday (2026-11-01 is Sunday)
    expect(isBrandProcessOpenOnDate('no_sundays_holidays', '2026-11-01', false)).toBe(false);
    // Weekday holiday
    expect(isBrandProcessOpenOnDate('no_sundays_holidays', '2026-11-08', true)).toBe(false);
    // Regular Monday (2026-11-02 is Monday)
    expect(isBrandProcessOpenOnDate('no_sundays_holidays', '2026-11-02', false)).toBe(true);
  });

  it('recognizes company-wide and brand-specific holidays', () => {
    const holidays = [
      { holiday_date: '2026-11-08', brand_id: null, name: 'Diwali' },
      { holiday_date: '2026-11-15', brand_id: 'brand-1', name: 'Brand Founder Day' },
    ];

    expect(isDatePublicHoliday('2026-11-08', 'brand-1', holidays)).toBe(true);
    expect(isDatePublicHoliday('2026-11-08', 'brand-2', holidays)).toBe(true);
    expect(isDatePublicHoliday('2026-11-15', 'brand-1', holidays)).toBe(true);
    expect(isDatePublicHoliday('2026-11-15', 'brand-2', holidays)).toBe(false);
    expect(isDatePublicHoliday('2026-11-20', 'brand-1', holidays)).toBe(false);
  });
});

describe('Availability and Leave Rules', () => {
  it('identifies approved leaves and ignores pending/rejected leaves', () => {
    const leaves = [
      { employee_id: 'emp-1', start_date: '2026-11-10', end_date: '2026-11-12', status: 'approved' },
      { employee_id: 'emp-2', start_date: '2026-11-10', end_date: '2026-11-12', status: 'pending' },
      { employee_id: 'emp-3', start_date: '2026-11-10', end_date: '2026-11-12', status: 'rejected' },
    ];

    expect(isEmployeeOnApprovedLeave('emp-1', '2026-11-11', leaves)).toBe(true);
    expect(isEmployeeOnApprovedLeave('emp-1', '2026-11-13', leaves)).toBe(false);
    expect(isEmployeeOnApprovedLeave('emp-2', '2026-11-11', leaves)).toBe(false);
    expect(isEmployeeOnApprovedLeave('emp-3', '2026-11-11', leaves)).toBe(false);
  });

  it('identifies employee weekly offs by day of week', () => {
    const weeklyOffs = [
      { employee_id: 'emp-1', day_of_week: 0 }, // Sunday
      { employee_id: 'emp-1', day_of_week: 6 }, // Saturday
    ];

    // 2026-11-01 is Sunday (day 0)
    expect(isEmployeeOnWeeklyOff('emp-1', '2026-11-01', weeklyOffs)).toBe(true);
    // 2026-11-07 is Saturday (day 6)
    expect(isEmployeeOnWeeklyOff('emp-1', '2026-11-07', weeklyOffs)).toBe(true);
    // 2026-11-02 is Monday (day 1)
    expect(isEmployeeOnWeeklyOff('emp-1', '2026-11-02', weeklyOffs)).toBe(false);
  });

  it('identifies explicit unavailability blocks', () => {
    const availability = [
      { employee_id: 'emp-1', start_date: '2026-11-20', end_date: '2026-11-25' },
    ];

    expect(isEmployeeExplicitlyUnavailable('emp-1', '2026-11-22', availability)).toBe(true);
    expect(isEmployeeExplicitlyUnavailable('emp-1', '2026-11-19', availability)).toBe(false);
    expect(isEmployeeExplicitlyUnavailable('emp-1', '2026-11-26', availability)).toBe(false);
  });
});

describe('Assessment Target Acceptance Criteria Scenarios', () => {
  // Scenario 1: A successfully generated feasible monthly roster for a properly staffed scenario
  it('Scenario 1: generates a 100% FEASIBLE roster when properly staffed and aligned with calendar', () => {
    const testEmployees = [
      { id: 'emp-1', full_name: 'Ananya Iyer', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-iris', name: 'Iris Eyewear', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
    ];
    // Iris operates no_sundays_holidays (Monday-Saturday)
    const testBrandProcesses = [
      { id: 'bp-iris', brand_id: 'brand-iris', process_id: 'proc-cs', min_staff: 1, calendar_rule: 'no_sundays_holidays', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-1', brand_process_id: 'bp-iris', is_primary: true, is_active: true },
    ];
    // Employee has Sunday off, perfectly matching the closed Sunday calendar rule
    const testWeeklyOffs = [
      { employee_id: 'emp-1', day_of_week: 0 },
    ];

    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: testEmployees,
      brands: testBrands,
      processes: testProcesses,
      brandProcesses: testBrandProcesses,
      assignments: testAssignments,
      weeklyOffs: testWeeklyOffs,
      holidays: [],
      leaves: [],
      availability: [],
    });

    expect(result.status).toBe(EngineStatus.FEASIBLE);
    expect(result.conflicts.length).toBe(0);
    expect(result.stats.coveragePercentage).toBe(100);
    expect(result.stats.totalFilledShifts).toBe(result.stats.totalRequiredShifts);
  });

  // Scenario 2: Single-resource brand coverage failure when its dedicated employee becomes unavailable
  it('Scenario 2: flags coverage failure and conflict when single-resource employee is unavailable', () => {
    const testEmployees = [
      { id: 'emp-vikram', full_name: 'Vikram Patel', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-bolt', name: 'Bolt Mobility', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
    ];
    // 365_days operating calendar
    const testBrandProcesses = [
      { id: 'bp-bolt', brand_id: 'brand-bolt', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-vikram', brand_process_id: 'bp-bolt', is_primary: true, is_active: true },
    ];
    // Vikram on approved leave Nov 12-14
    const testLeaves = [
      { employee_id: 'emp-vikram', start_date: '2026-11-12', end_date: '2026-11-14', status: 'approved' },
    ];

    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: testEmployees,
      brands: testBrands,
      processes: testProcesses,
      brandProcesses: testBrandProcesses,
      assignments: testAssignments,
      weeklyOffs: [],
      holidays: [],
      leaves: testLeaves,
      availability: [],
    });

    expect(result.status).toBe(EngineStatus.INFEASIBLE);
    const leaveConflicts = result.conflicts.filter(
      (c) => c.work_date >= '2026-11-12' && c.work_date <= '2026-11-14'
    );
    expect(leaveConflicts.length).toBe(3);
    expect(leaveConflicts[0].code).toBe('APPROVED_LEAVE_OR_OFF_CONFLICT');
    expect(leaveConflicts[0].explanation).toContain('Approved Leave');
    expect(leaveConflicts[0].recommendation).toContain('backup resource');
  });

  // Scenario 3: Multi-resource brand continuing coverage when one employee becomes unavailable
  it('Scenario 3: multi-resource brand retains 100% coverage when one employee is on leave', () => {
    const testEmployees = [
      { id: 'emp-1', full_name: 'Specialist Alpha', is_active: true },
      { id: 'emp-2', full_name: 'Specialist Beta', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-multi', name: 'Multi Brand', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
    ];
    // min_staff = 1
    const testBrandProcesses = [
      { id: 'bp-multi', brand_id: 'brand-multi', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-1', brand_process_id: 'bp-multi', is_primary: true, is_active: true },
      { id: 'a-2', employee_id: 'emp-2', brand_process_id: 'bp-multi', is_primary: false, is_active: true },
    ];
    // Specialist Alpha takes leave Nov 10 to Nov 20
    const testLeaves = [
      { employee_id: 'emp-1', start_date: '2026-11-10', end_date: '2026-11-20', status: 'approved' },
    ];

    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: testEmployees,
      brands: testBrands,
      processes: testProcesses,
      brandProcesses: testBrandProcesses,
      assignments: testAssignments,
      weeklyOffs: [],
      holidays: [],
      leaves: testLeaves,
      availability: [],
    });

    // Coverage is maintained by Specialist Beta during Alpha's leave
    expect(result.status).toBe(EngineStatus.FEASIBLE);
    expect(result.conflicts.length).toBe(0);
    expect(result.stats.coveragePercentage).toBe(100);

    // Verify Specialist Beta was scheduled during Nov 10-20
    const betaNov15 = result.entries.find(
      (e) => e.employee_id === 'emp-2' && e.work_date === '2026-11-15'
    );
    expect(betaNov15).toBeDefined();
  });

  // Scenario 4: Genuinely infeasible staffing scenario (Full Assessment Dataset)
  it('Scenario 4: reports INFEASIBLE and exact metrics for standard baseline dataset', () => {
    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: INITIAL_EMPLOYEES,
      brands: INITIAL_BRANDS,
      processes: INITIAL_PROCESSES,
      brandProcesses: INITIAL_BRAND_PROCESSES,
      assignments: INITIAL_ASSIGNMENTS,
      weeklyOffs: INITIAL_WEEKLY_OFFS,
      holidays: INITIAL_HOLIDAYS,
      leaves: INITIAL_LEAVES,
      availability: INITIAL_AVAILABILITY,
    });

    // Verification of exact simulation metrics:
    expect(result.status).toBe(EngineStatus.INFEASIBLE);
    expect(result.stats.totalRequiredShifts).toBe(870);
    expect(result.stats.totalFilledShifts).toBe(768);
    expect(result.stats.totalRequiredShifts - result.stats.totalFilledShifts).toBe(102);
    expect(result.conflicts.length).toBe(101);
    expect(result.entries.length).toBe(746);
    expect(result.stats.coveragePercentage).toBe(88); // 88.28% rounded

    // Vikram Patel's leave conflict check
    const vikramConflict = result.conflicts.find(
      (c) => c.work_date === '2026-11-12' && c.explanation.includes('Vikram Patel')
    );
    expect(vikramConflict).toBeDefined();
    expect(vikramConflict.recommendation).toContain('backup resource');
  });

  // Scenario 5: Search budget exhausted scenario
  it('Scenario 5: reports SEARCH_LIMIT_REACHED when search budget is artificially constrained', () => {
    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: INITIAL_EMPLOYEES,
      brands: INITIAL_BRANDS,
      processes: INITIAL_PROCESSES,
      brandProcesses: INITIAL_BRAND_PROCESSES,
      assignments: INITIAL_ASSIGNMENTS,
      weeklyOffs: INITIAL_WEEKLY_OFFS,
      holidays: INITIAL_HOLIDAYS,
      leaves: INITIAL_LEAVES,
      availability: INITIAL_AVAILABILITY,
      options: { searchLimit: 1 }, // Budget of 1 step
    });

    expect(result.status).toBe(EngineStatus.SEARCH_LIMIT_REACHED);
    expect(result.searchLimitReached).toBe(true);
  });
});

describe('Multi-Process and Inactivity Rules', () => {
  it('covers multiple eligible processes on same brand without double counting shift', () => {
    const testEmployees = [
      { id: 'emp-1', full_name: 'Test Specialist', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-1', name: 'Alpha Brand', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
      { id: 'proc-acc', code: 'ACC', name: 'Abandoned Cart Conversion' },
    ];
    const testBrandProcesses = [
      { id: 'bp-1', brand_id: 'brand-1', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
      { id: 'bp-2', brand_id: 'brand-1', process_id: 'proc-acc', min_staff: 1, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-1', brand_process_id: 'bp-1', is_primary: true, is_active: true },
      { id: 'a-2', employee_id: 'emp-1', brand_process_id: 'bp-2', is_primary: false, is_active: true },
    ];

    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: testEmployees,
      brands: testBrands,
      processes: testProcesses,
      brandProcesses: testBrandProcesses,
      assignments: testAssignments,
      weeklyOffs: [],
      holidays: [],
      leaves: [],
      availability: [],
    });

    expect(result.status).toBe(EngineStatus.FEASIBLE);
    expect(result.conflicts.length).toBe(0);
    expect(result.stats.coveragePercentage).toBe(100);

    // Exactly 30 entries (1 per day for the employee on this brand)
    expect(result.entries.length).toBe(30);

    // Both processes are satisfied (count = 1) for each day
    for (const res of result.dayResults) {
      expect(res.count).toBe(1);
    }
  });

  it('never schedules inactive employees', () => {
    const testEmployees = [
      { id: 'emp-inactive', full_name: 'Inactive Staff', is_active: false },
    ];
    const testBrands = [
      { id: 'brand-1', name: 'Beta Brand', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
    ];
    const testBrandProcesses = [
      { id: 'bp-1', brand_id: 'brand-1', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-inactive', brand_process_id: 'bp-1', is_primary: true, is_active: true },
    ];

    const result = generateMonthlyRoster({
      year: 2026,
      month: 11,
      employees: testEmployees,
      brands: testBrands,
      processes: testProcesses,
      brandProcesses: testBrandProcesses,
      assignments: testAssignments,
    });

    expect(result.status).toBe(EngineStatus.INFEASIBLE);
    expect(result.entries.length).toBe(0);
    expect(result.conflicts.length).toBeGreaterThan(0);
    expect(result.conflicts[0].code).toBe('APPROVED_LEAVE_OR_OFF_CONFLICT');
    expect(result.conflicts[0].explanation).toContain('Inactive');
  });
});

describe('Conflict Detection Module', () => {
  it('detects cross-brand double booking accurately', () => {
    const entries = [
      { employee_id: 'emp-1', brand_id: 'brand-a', work_date: '2026-11-05' },
      { employee_id: 'emp-1', brand_id: 'brand-b', work_date: '2026-11-05' },
    ];
    const employees = [{ id: 'emp-1', full_name: 'Overbooked Specialist', is_active: true }];
    const brands = [
      { id: 'brand-a', name: 'Brand Alpha' },
      { id: 'brand-b', name: 'Brand Beta' },
    ];

    const conflicts = detectRosterConflicts({
      entries,
      employees,
      brands,
      processes: [],
      brandProcesses: [],
      assignments: [],
      weeklyOffs: [],
      holidays: [],
      leaves: [],
      availability: [],
    });

    const doubleBooking = conflicts.find((c) => c.code === 'DOUBLE_BOOKING');
    expect(doubleBooking).toBeDefined();
    expect(doubleBooking.explanation).toContain('Brand Alpha');
    expect(doubleBooking.explanation).toContain('Brand Beta');
  });

  it('detects approved leave violation in manual roster entries', () => {
    const entries = [{ employee_id: 'emp-1', brand_id: 'brand-a', work_date: '2026-11-10' }];
    const employees = [{ id: 'emp-1', full_name: 'John Doe', is_active: true }];
    const leaves = [
      { employee_id: 'emp-1', start_date: '2026-11-09', end_date: '2026-11-11', status: 'approved' },
    ];

    const conflicts = detectRosterConflicts({
      entries,
      employees,
      brands: [{ id: 'brand-a', name: 'Brand A' }],
      processes: [],
      brandProcesses: [],
      assignments: [],
      leaves,
    });

    const leaveConflict = conflicts.find((c) => c.code === 'APPROVED_LEAVE_VIOLATION');
    expect(leaveConflict).toBeDefined();
    expect(leaveConflict.explanation).toContain('John Doe');
  });

  it('detects scheduled weekly off violation in manual roster entries', () => {
    // 2026-11-01 is Sunday
    const entries = [{ employee_id: 'emp-1', brand_id: 'brand-a', work_date: '2026-11-01' }];
    const employees = [{ id: 'emp-1', full_name: 'Jane Smith', is_active: true }];
    const weeklyOffs = [{ employee_id: 'emp-1', day_of_week: 0 }]; // Sunday off

    const conflicts = detectRosterConflicts({
      entries,
      employees,
      brands: [{ id: 'brand-a', name: 'Brand A' }],
      processes: [],
      brandProcesses: [],
      assignments: [],
      weeklyOffs,
    });

    const offConflict = conflicts.find((c) => c.code === 'WEEKLY_OFF_VIOLATION');
    expect(offConflict).toBeDefined();
  });
});


describe('Regression: Solver Must Not Report Infeasibility Due to Greedy Failure', () => {
  it('finds valid assignment when greedy choice would cause false infeasibility', () => {
    const testEmployees = [
      { id: 'e1', full_name: 'Employee One', is_active: true },
      { id: 'e2', full_name: 'Employee Two', is_active: true },
      { id: 'e3', full_name: 'Employee Three', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-a', name: 'Brand A', is_active: true },
      { id: 'brand-b', name: 'Brand B', is_active: true },
      { id: 'brand-c', name: 'Brand C', is_active: true },
    ];
    const testProcesses = [{ id: 'proc-cs', code: 'CS', name: 'Customer Support' }];
    const testBrandProcesses = [
      { id: 'bp-a', brand_id: 'brand-a', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
      { id: 'bp-b', brand_id: 'brand-b', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
      { id: 'bp-c', brand_id: 'brand-c', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-a1', employee_id: 'e1', brand_process_id: 'bp-a', is_active: true, is_primary: true },
      { id: 'a-a2', employee_id: 'e2', brand_process_id: 'bp-a', is_active: true, is_primary: false },
      { id: 'a-b1', employee_id: 'e1', brand_process_id: 'bp-b', is_active: true, is_primary: true },
      { id: 'a-b3', employee_id: 'e3', brand_process_id: 'bp-b', is_active: true, is_primary: false },
      { id: 'a-c1', employee_id: 'e1', brand_process_id: 'bp-c', is_active: true, is_primary: true },
      { id: 'a-c3', employee_id: 'e3', brand_process_id: 'bp-c', is_active: true, is_primary: false },
    ];
    const result = generateMonthlyRoster({
      year: 2026, month: 11,
      employees: testEmployees, brands: testBrands,
      processes: testProcesses, brandProcesses: testBrandProcesses,
      assignments: testAssignments,
      weeklyOffs: [], holidays: [], leaves: [], availability: [],
    });
    expect(result.status).toBe(EngineStatus.FEASIBLE);
    expect(result.conflicts.length).toBe(0);
    expect(result.stats.coveragePercentage).toBe(100);
    for (const dateStr of ['2026-11-02', '2026-11-10', '2026-11-25']) {
      const dayEntries = result.entries.filter((e) => e.work_date === dateStr);
      const brandsScheduled = new Set(dayEntries.map((e) => e.brand_id));
      expect(brandsScheduled.size).toBe(3);
      const empBrands = new Map();
      for (const e of dayEntries) {
        expect(empBrands.has(e.employee_id)).toBe(false);
        empBrands.set(e.employee_id, e.brand_id);
      }
    }
  });
});

describe('Regression: Conflict Detection on Completely Empty Dates', () => {
  it('detects understaffing on dates that have zero roster entries', () => {
    const brandProcesses = [{ id: 'bp-open', brand_id: 'brand-open', process_id: 'proc-cs', min_staff: 1, calendar_rule: '365_days', is_active: true }];
    const brands = [{ id: 'brand-open', name: 'Open Brand' }];
    const processes = [{ id: 'proc-cs', code: 'CS', name: 'Customer Support' }];
    const conflicts = detectRosterConflicts({
      entries: [], month: 11, year: 2026,
      employees: [], brands, processes, brandProcesses,
      assignments: [], weeklyOffs: [], holidays: [], leaves: [], availability: [],
    });
    const understaffed = conflicts.filter((c) => c.code === 'UNDERSTAFFED_PROCESS');
    expect(understaffed.length).toBe(30);
    expect(understaffed[0].work_date).toBe('2026-11-01');
    expect(understaffed[29].work_date).toBe('2026-11-30');
  });

  it('does not flag closed Sundays as understaffed when entries are empty', () => {
    const brandProcesses = [{ id: 'bp-nosun', brand_id: 'brand-nosun', process_id: 'proc-cs', min_staff: 1, calendar_rule: 'no_sundays_holidays', is_active: true }];
    const brands = [{ id: 'brand-nosun', name: 'Weekday Brand' }];
    const processes = [{ id: 'proc-cs', code: 'CS', name: 'Customer Support' }];
    const conflicts = detectRosterConflicts({
      entries: [], month: 11, year: 2026,
      employees: [], brands, processes, brandProcesses,
      assignments: [], weeklyOffs: [], holidays: [], leaves: [], availability: [],
    });
    const understaffed = conflicts.filter((c) => c.code === 'UNDERSTAFFED_PROCESS');
    expect(understaffed.length).toBe(25);
    const sundayConflicts = understaffed.filter((c) => new Date(c.work_date + 'T00:00:00').getDay() === 0);
    expect(sundayConflicts.length).toBe(0);
  });
});
