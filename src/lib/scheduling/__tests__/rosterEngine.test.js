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

describe('Roster Generator Core Engine', () => {
  it('allocates single-resource brands and covers all assigned processes simultaneously', () => {
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

    // Verify employee is scheduled 1 shift per day for the brand
    const daysInNov = 30;
    expect(result.entries.length).toBe(daysInNov);

    // Verify both processes are marked as covered (count = 1) for each day
    for (const res of result.dayResults) {
      expect(res.count).toBe(1);
      expect(res.is_open).toBe(true);
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

  it('correctly handles multi-resource brand staffing requirements', () => {
    const testEmployees = [
      { id: 'emp-1', full_name: 'Emp 1', is_active: true },
      { id: 'emp-2', full_name: 'Emp 2', is_active: true },
      { id: 'emp-3', full_name: 'Emp 3', is_active: true },
    ];
    const testBrands = [
      { id: 'brand-multi', name: 'Multi Brand', is_active: true },
    ];
    const testProcesses = [
      { id: 'proc-cs', code: 'CS', name: 'Customer Support' },
    ];
    const testBrandProcesses = [
      { id: 'bp-1', brand_id: 'brand-multi', process_id: 'proc-cs', min_staff: 2, calendar_rule: '365_days', is_active: true },
    ];
    const testAssignments = [
      { id: 'a-1', employee_id: 'emp-1', brand_process_id: 'bp-1', is_primary: true, is_active: true },
      { id: 'a-2', employee_id: 'emp-2', brand_process_id: 'bp-1', is_primary: true, is_active: true },
      { id: 'a-3', employee_id: 'emp-3', brand_process_id: 'bp-1', is_primary: false, is_active: true },
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
    // Each day needs 2 staff, so 30 * 2 = 60 entries
    expect(result.entries.length).toBe(60);
    expect(result.conflicts.length).toBe(0);
  });

  it('stops and reports SEARCH_LIMIT_REACHED if search limit is exhausted', () => {
    // Provide a small artificial search limit
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
      options: { searchLimit: 1 }, // Artificially low limit
    });

    expect(result.status).toBe(EngineStatus.SEARCH_LIMIT_REACHED);
    expect(result.searchLimitReached).toBe(true);
  });

  it('runs against the complete 31-employee assessment dataset and flags realistic conflicts', () => {
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

    // Verification of business requirements:
    // 1. Roster entries generated for November 2026
    expect(result.entries.length).toBeGreaterThan(0);
    // 2. Daily results calculated for every brand process
    expect(result.dayResults.length).toBeGreaterThan(0);
    // 3. Vikram Patel's approved leave on Nov 12-14 is caught as a conflict for his single-resource brand
    const vikramConflict = result.conflicts.find(
      (c) => c.work_date === '2026-11-12' && c.explanation.includes('Vikram Patel')
    );
    expect(vikramConflict).toBeDefined();
    expect(vikramConflict.recommendation).toContain('backup resource');
    // 4. Overall stats
    expect(result.stats.coveragePercentage).toBeGreaterThan(50);
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
