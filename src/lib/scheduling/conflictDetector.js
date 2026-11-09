/**
 * DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
 * REAL-TIME CONFLICT DETECTOR
 *
 * Evaluates any roster state (generated or manually edited) against operational rules:
 * - Minimum process coverage failures
 * - Double-booking across different brands on same day
 * - Approved leave and comp-off clashes
 * - Scheduled weekly off violations
 * - Explicit unavailability periods
 * - Inactive employee assignments
 * - Assignments to closed brand-processes (holidays/Sundays)
 * - Ineligible employee assignments
 */

import {
  getDaysInMonth,
  isBrandProcessOpenOnDate,
  isDatePublicHoliday,
  isEmployeeOnApprovedLeave,
  isEmployeeOnWeeklyOff,
  isEmployeeExplicitlyUnavailable,
} from './rosterEngine.js';

export function detectRosterConflicts({
  entries = [],
  dayResults = [],
  month,
  year,
  employees = [],
  brands = [],
  processes = [],
  brandProcesses = [],
  assignments = [],
  weeklyOffs = [],
  holidays = [],
  leaves = [],
  availability = [],
}) {
  const conflicts = [];
  const seenConflictKeys = new Set();

  function pushConflict(conflict) {
    const key = [
      conflict.code,
      conflict.work_date,
      conflict.employee_id || '',
      conflict.brand_id || '',
      conflict.brand_process_id || '',
    ].join('|');
    if (seenConflictKeys.has(key)) return;
    seenConflictKeys.add(key);
    conflicts.push(conflict);
  }
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const processMap = new Map(processes.map((p) => [p.id, p]));
  const brandProcessMap = new Map(brandProcesses.map((bp) => [bp.id, bp]));

  // 1. Check for Double-Booking (Employee working for multiple brands on the same date)
  const empDateBrands = new Map(); // key: `${work_date}_${employee_id}` -> Set of brandIds
  for (const entry of entries) {
    const key = `${entry.work_date}_${entry.employee_id}`;
    if (!empDateBrands.has(key)) {
      empDateBrands.set(key, new Set());
    }
    empDateBrands.get(key).add(entry.brand_id);
  }

  for (const [key, brandSet] of empDateBrands.entries()) {
    if (brandSet.size > 1) {
      const separator = key.indexOf('_');
      const dateStr = key.slice(0, separator);
      const empId = key.slice(separator + 1);
      const emp = employeeMap.get(empId);
      const brandNames = Array.from(brandSet)
        .map((bId) => brandMap.get(bId)?.name || bId)
        .join(', ');

      pushConflict({
        work_date: dateStr,
        employee_id: empId,
        brand_id: Array.from(brandSet)[0],
        code: 'DOUBLE_BOOKING',
        severity: 'critical',
        explanation: `${emp?.full_name || 'Employee'} is scheduled across ${brandSet.size} different brands on ${dateStr}: ${brandNames}.`,
        recommendation: `Remove ${emp?.full_name || 'employee'} from one of the overlapping brands to ensure single-brand compliance.`,
      });
    }
  }

  // 2. Check for Employee Working while on Leave, Weekly Off, Unavailable, Inactive, or Closed Day
  for (const entry of entries) {
    const emp = employeeMap.get(entry.employee_id);
    const brand = brandMap.get(entry.brand_id);
    if (!emp) continue;

    if (!emp.is_active) {
      pushConflict({
        work_date: entry.work_date,
        employee_id: emp.id,
        brand_id: entry.brand_id,
        code: 'INACTIVE_EMPLOYEE_SCHEDULED',
        severity: 'critical',
        explanation: `${emp.full_name} is marked Inactive but is scheduled to work on ${brand?.name || 'brand'} on ${entry.work_date}.`,
        recommendation: `Reactivate ${emp.full_name} in Employees directory or reassign shift to an active team member.`,
      });
    }

    if (isEmployeeOnApprovedLeave(emp.id, entry.work_date, leaves)) {
      pushConflict({
        work_date: entry.work_date,
        employee_id: emp.id,
        brand_id: entry.brand_id,
        code: 'APPROVED_LEAVE_VIOLATION',
        severity: 'critical',
        explanation: `${emp.full_name} has an Approved Leave / Comp-off on ${entry.work_date} but is scheduled to work.`,
        recommendation: `Unassign ${emp.full_name} on this date or revoke/reschedule the approved leave.`,
      });
    }

    if (isEmployeeOnWeeklyOff(emp.id, entry.work_date, weeklyOffs)) {
      pushConflict({
        work_date: entry.work_date,
        employee_id: emp.id,
        brand_id: entry.brand_id,
        code: 'WEEKLY_OFF_VIOLATION',
        severity: 'critical',
        explanation: `${emp.full_name} is scheduled on their designated Weekly Off on ${entry.work_date}.`,
        recommendation: `Remove ${emp.full_name} from this date to respect their mandatory weekly rest day.`,
      });
    }

    if (isEmployeeExplicitlyUnavailable(emp.id, entry.work_date, availability)) {
      pushConflict({
        work_date: entry.work_date,
        employee_id: emp.id,
        brand_id: entry.brand_id,
        code: 'UNAVAILABLE_RESOURCE',
        severity: 'critical',
        explanation: `${emp.full_name} is blocked as Unavailable on ${entry.work_date}.`,
        recommendation: `Replace with an available team member.`,
      });
    }

    // Check if brand is entirely closed on this date under its operating calendar
    const brandBPs = brandProcesses.filter((bp) => bp.brand_id === entry.brand_id && bp.is_active);
    if (brandBPs.length > 0) {
      const hasAnyOpenBP = brandBPs.some((bp) => {
        const isHol = isDatePublicHoliday(entry.work_date, entry.brand_id, holidays);
        return isBrandProcessOpenOnDate(bp.calendar_rule, entry.work_date, isHol);
      });
      if (!hasAnyOpenBP) {
        pushConflict({
          work_date: entry.work_date,
          employee_id: entry.employee_id,
          brand_id: entry.brand_id,
          code: 'CLOSED_DAY_ASSIGNMENT',
          severity: 'critical',
          explanation: `${brand?.name || 'Brand'} is completely closed on ${entry.work_date} (Sunday / Holiday rule), but ${emp.full_name} is scheduled.`,
          recommendation: `Remove shift for this closed operational date.`,
        });
      }
    }
  }

  // 3. Check for Ineligible Assignment (Employee scheduled to brand with zero active assignment to any of its processes)
  const empBrandEligibility = new Map(); // key: `${employee_id}_${brand_id}` -> boolean
  for (const a of assignments) {
    if (!a.is_active) continue;
    const bp = brandProcessMap.get(a.brand_process_id);
    if (bp) {
      empBrandEligibility.set(`${a.employee_id}_${bp.brand_id}`, true);
    }
  }

  for (const entry of entries) {
    const isEligible = empBrandEligibility.has(`${entry.employee_id}_${entry.brand_id}`);
    if (!isEligible) {
      const emp = employeeMap.get(entry.employee_id);
      const brand = brandMap.get(entry.brand_id);
      pushConflict({
        work_date: entry.work_date,
        employee_id: entry.employee_id,
        brand_id: entry.brand_id,
        code: 'INELIGIBLE_ASSIGNMENT',
        severity: 'critical',
        explanation: `${emp?.full_name || 'Employee'} is not formally assigned to ${brand?.name || 'brand'} in the Assignments directory.`,
        recommendation: `Add formal assignment linking ${emp?.full_name} to ${brand?.name} or remove shift.`,
      });
    }
  }

  // 4. Check for Understaffed Open Brand Processes
  // Map of date_bpId -> assigned count from entries
  const coverageMap = new Map();
  for (const entry of entries) {
    const bps = brandProcesses.filter((bp) => bp.brand_id === entry.brand_id && bp.is_active);
    for (const bp of bps) {
      // Check if employee has assignment to bp
      const hasAssign = assignments.some(
        (a) => a.is_active && a.employee_id === entry.employee_id && a.brand_process_id === bp.id
      );
      if (hasAssign) {
        const key = `${entry.work_date}_${bp.id}`;
        coverageMap.set(key, (coverageMap.get(key) || 0) + 1);
      }
    }
  }

  // Evaluate every brand process for every date in month
  const dates = Array.from(new Set(entries.map((e) => e.work_date)));
  for (const dateStr of dates) {
    for (const bp of brandProcesses) {
      if (!bp.is_active) continue;
      const brand = brandMap.get(bp.brand_id);
      const process = processMap.get(bp.process_id);
      if (!brand || !process) continue;

      const isHoliday = isDatePublicHoliday(dateStr, bp.brand_id, holidays);
      const isOpen = isBrandProcessOpenOnDate(bp.calendar_rule, dateStr, isHoliday);
      if (!isOpen) continue;

      const assignedCount = coverageMap.get(`${dateStr}_${bp.id}`) || 0;
      if (assignedCount < bp.min_staff) {
        const deficit = bp.min_staff - assignedCount;
        pushConflict({
          work_date: dateStr,
          brand_id: bp.brand_id,
          brand_name: brand.name,
          process_id: bp.process_id,
          process_name: process.name,
          brand_process_id: bp.id,
          code: 'UNDERSTAFFED_PROCESS',
          severity: 'critical',
          required_staff: bp.min_staff,
          assigned_staff: assignedCount,
          explanation: `${brand.name} [${process.code}] requires ${bp.min_staff} staff on ${dateStr}, but only ${assignedCount} assigned (deficit: ${deficit}).`,
          recommendation: `Assign ${deficit} additional qualified team member(s) to ${brand.name} ${process.code}.`,
        });
      }
    }
  }

  return conflicts;
}
