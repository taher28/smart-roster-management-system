/**
 * DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
 * DETERMINISTIC SCHEDULING ENGINE
 *
 * Implements bounded backtracking constraint satisfaction with:
 * - Minimum Remaining Values (MRV) heuristic
 * - Hard constraints (Leaves, Comp-offs, Weekly Offs, Inactive staff, Brand Calendars, Min Staffing, Single-Brand Daily Cap)
 * - Multi-process coverage rule (1 employee covers all eligible processes within a brand on that day)
 * - Soft constraints (Fair workload balancing, Primary assignment preference)
 * - Explicit status codes: FEASIBLE, INFEASIBLE, SEARCH_LIMIT_REACHED
 */

export const EngineStatus = {
  FEASIBLE: 'FEASIBLE',
  INFEASIBLE: 'INFEASIBLE',
  SEARCH_LIMIT_REACHED: 'SEARCH_LIMIT_REACHED',
};

/**
 * Format a Date object to YYYY-MM-DD
 */
export function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get all dates in a month as an array of YYYY-MM-DD strings
 */
export function getDaysInMonth(year, month) {
  // month is 1-indexed (1 = Jan, 11 = Nov, 12 = Dec)
  const daysCount = new Date(year, month, 0).getDate();
  const days = [];
  for (let day = 1; day <= daysCount; day++) {
    const d = new Date(Date.UTC(year, month - 1, day));
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

/**
 * Determines whether a brand process operates on a specific date
 * Calendar Rules:
 * - '365_days': Operates all 365 days (including Sundays and public holidays)
 * - 'no_holidays': Operates daily except public holidays
 * - 'no_sundays_holidays': Operates Monday-Saturday, closed on Sundays and public holidays
 */
export function isBrandProcessOpenOnDate(calendarRule, dateStr, isHoliday) {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = dateObj.getDay(); // 0 = Sunday
  const isSunday = dayOfWeek === 0;

  switch (calendarRule) {
    case '365_days':
      return true;
    case 'no_holidays':
      return !isHoliday;
    case 'no_sundays_holidays':
      return !isSunday && !isHoliday;
    default:
      return !isSunday && !isHoliday;
  }
}

/**
 * Check if a date is a public holiday (either company-wide or brand-specific)
 */
export function isDatePublicHoliday(dateStr, brandId, holidays = []) {
  return holidays.some(
    (h) =>
      h.holiday_date === dateStr &&
      (h.brand_id === null || h.brand_id === undefined || h.brand_id === brandId)
  );
}

/**
 * Check if employee is on approved leave or comp-off on dateStr
 */
export function isEmployeeOnApprovedLeave(employeeId, dateStr, leaves = []) {
  return leaves.some((l) => {
    if (l.employee_id !== employeeId) return false;
    if (l.status !== 'approved') return false;
    return dateStr >= l.start_date && dateStr <= l.end_date;
  });
}

/**
 * Check if employee has a weekly off on the day of week corresponding to dateStr
 */
export function isEmployeeOnWeeklyOff(employeeId, dateStr, weeklyOffs = []) {
  const dateObj = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = dateObj.getDay();
  return weeklyOffs.some(
    (wo) => wo.employee_id === employeeId && Number(wo.day_of_week) === dayOfWeek
  );
}

/**
 * Check if employee has an active availability block on dateStr
 */
export function isEmployeeExplicitlyUnavailable(employeeId, dateStr, availability = []) {
  return availability.some(
    (a) => a.employee_id === employeeId && dateStr >= a.start_date && dateStr <= a.end_date
  );
}

/**
 * Parse a HH:MM or HH:MM:SS clock time into minutes from midnight.
 * Shift windows are stored on brand-process records. They are informational:
 * the hard rule remains one brand per employee per date, not independent
 * shift-time packing.
 */
export function parseShiftMinutes(timeValue) {
  if (timeValue == null || timeValue === '') return null;
  const match = String(timeValue).trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function shiftInterval(start, end) {
  if (start == null || end == null) return null;
  const endMinute = end <= start ? end + 24 * 60 : end;
  return [start, endMinute];
}

function intervalsOverlap(a, b) {
  return a[0] < b[1] && b[0] < a[1];
}

/**
 * Half-open overlap test for two shifts. A shift that ends exactly when
 * another starts does not overlap. If end <= start, the shift crosses midnight.
 * This helper explains time overlap. It does not replace the one-brand-per-day rule.
 */
export function shiftsOverlap(startA, endA, startB, endB) {
  const a = shiftInterval(parseShiftMinutes(startA), parseShiftMinutes(endA));
  const b = shiftInterval(parseShiftMinutes(startB), parseShiftMinutes(endB));
  if (!a || !b) return false;
  const day = 24 * 60;
  const aShifts = [a, [a[0] + day, a[1] + day]];
  const bShifts = [b, [b[0] + day, b[1] + day]];
  return aShifts.some((left) => bShifts.some((right) => intervalsOverlap(left, right)));
}

export function describeShiftOverlap(startA, endA, startB, endB) {
  if (!shiftsOverlap(startA, endA, startB, endB)) return null;
  return `Shift ${startA}–${endA} overlaps shift ${startB}–${endB}.`;
}

/**
 * Core Monthly Roster Generator
 */
export function generateMonthlyRoster({
  year,
  month, // 1-indexed (e.g. 11 for Nov)
  employees = [],
  brands = [],
  processes = [],
  brandProcesses = [],
  assignments = [],
  weeklyOffs = [],
  holidays = [],
  leaves = [],
  availability = [],
  options = {},
}) {
  const searchLimit = options.searchLimit || 50000;
  let stepsCounter = 0;
  let searchLimitReached = false;

  const dates = getDaysInMonth(year, month);
  const activeEmployees = employees.filter((e) => e.is_active);
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const processMap = new Map(processes.map((p) => [p.id, p]));
  const brandProcessMap = new Map(brandProcesses.map((bp) => [bp.id, bp]));

  // Brand-processes grouped by brand
  const brandProcessByBrand = new Map();
  for (const bp of brandProcesses) {
    if (!bp.is_active) continue;
    if (!brandProcessByBrand.has(bp.brand_id)) {
      brandProcessByBrand.set(bp.brand_id, []);
    }
    brandProcessByBrand.get(bp.brand_id).push(bp);
  }

  // Active assignments by brand_process_id
  const assigneesByBrandProcess = new Map();
  for (const a of assignments) {
    if (!a.is_active) continue;
    if (!assigneesByBrandProcess.has(a.brand_process_id)) {
      assigneesByBrandProcess.set(a.brand_process_id, []);
    }
    assigneesByBrandProcess.get(a.brand_process_id).push(a);
  }

  // Precompute employee eligible brand-processes
  const empAssignedBPs = new Map();
  for (const a of assignments) {
    if (!a.is_active) continue;
    if (!empAssignedBPs.has(a.employee_id)) {
      empAssignedBPs.set(a.employee_id, new Set());
    }
    empAssignedBPs.get(a.employee_id).add(a.brand_process_id);
  }

  // Tracking structures
  const scheduledEntries = [];
  // Key: `${date}_${employeeId}` -> assigned brandId (prevents cross-brand double booking)
  const employeeDateBrand = new Map();
  // Key: `${date}_${brandProcessId}` -> Set of assigned employeeIds
  const bpAssignedOnDate = new Map();
  // Key: employeeId -> count of scheduled shifts this month (for workload balancing)
  const employeeShiftCounts = new Map();
  for (const emp of activeEmployees) {
    employeeShiftCounts.set(emp.id, 0);
  }

  // Helper: check if employee can work on dateStr
  function canEmployeeWorkDate(empId, dateStr) {
    const emp = employeeMap.get(empId);
    if (!emp || !emp.is_active) return false;
    if (isEmployeeOnApprovedLeave(empId, dateStr, leaves)) return false;
    if (isEmployeeOnWeeklyOff(empId, dateStr, weeklyOffs)) return false;
    if (isEmployeeExplicitlyUnavailable(empId, dateStr, availability)) return false;
    return true;
  }

  // ----------------------------------------------------------------------------
  // PHASE 1: Categorize Brands into Single-Resource vs Multi-Resource
  // ----------------------------------------------------------------------------
  const singleResourceBrands = [];
  const multiResourceBrands = [];

  for (const brand of brands) {
    if (!brand.is_active) continue;
    const bps = brandProcessByBrand.get(brand.id) || [];
    if (bps.length === 0) continue;

    // Collect all distinct employees assigned to this brand's processes
    const brandEmployees = new Set();
    for (const bp of bps) {
      const assigns = assigneesByBrandProcess.get(bp.id) || [];
      for (const a of assigns) {
        brandEmployees.add(a.employee_id);
      }
    }

    if (brandEmployees.size === 1) {
      singleResourceBrands.push({
        brand,
        bps,
        soleEmployeeId: Array.from(brandEmployees)[0],
      });
    } else {
      multiResourceBrands.push({
        brand,
        bps,
        employeeIds: Array.from(brandEmployees),
      });
    }
  }

  // ----------------------------------------------------------------------------
  // PHASE 2 & 3: Date-by-Date Scheduling with Bounded Backtracking & MRV
  // ----------------------------------------------------------------------------
  for (const dateStr of dates) {
    // Phase 2: Allocate Single-Resource Brands for this date
    for (const srb of singleResourceBrands) {
      const { brand, bps, soleEmployeeId } = srb;

      const openBPs = bps.filter((bp) => {
        const isHoliday = isDatePublicHoliday(dateStr, brand.id, holidays);
        return isBrandProcessOpenOnDate(bp.calendar_rule, dateStr, isHoliday);
      });

      if (openBPs.length === 0) continue;

      const canWork = canEmployeeWorkDate(soleEmployeeId, dateStr);
      const existingBrand = employeeDateBrand.get(`${dateStr}_${soleEmployeeId}`);

      if (canWork && (!existingBrand || existingBrand === brand.id)) {
        if (!existingBrand) {
          employeeDateBrand.set(`${dateStr}_${soleEmployeeId}`, brand.id);
          scheduledEntries.push({
            brand_id: brand.id,
            employee_id: soleEmployeeId,
            work_date: dateStr,
          });
          employeeShiftCounts.set(
            soleEmployeeId,
            (employeeShiftCounts.get(soleEmployeeId) || 0) + 1
          );
        }

        // Multi-process coverage rule: employee covers all open eligible processes on this brand
        for (const bp of openBPs) {
          const empEligible = empAssignedBPs.get(soleEmployeeId)?.has(bp.id);
          if (empEligible) {
            const key = `${dateStr}_${bp.id}`;
            if (!bpAssignedOnDate.has(key)) bpAssignedOnDate.set(key, new Set());
            bpAssignedOnDate.get(key).add(soleEmployeeId);
          }
        }
      }
    }

    // Phase 3: Allocate Multi-Resource Brands for this date using Bounded Backtracking + MRV
    const dateSlots = [];
    for (const mrb of multiResourceBrands) {
      const { brand, bps } = mrb;
      for (const bp of bps) {
        const isHoliday = isDatePublicHoliday(dateStr, brand.id, holidays);
        const isOpen = isBrandProcessOpenOnDate(bp.calendar_rule, dateStr, isHoliday);
        if (!isOpen) continue;

        const assignedSoFar = bpAssignedOnDate.get(`${dateStr}_${bp.id}`) || new Set();
        const needed = bp.min_staff - assignedSoFar.size;

        for (let i = 0; i < needed; i++) {
          dateSlots.push({
            dateStr,
            brandId: brand.id,
            brandProcess: bp,
          });
        }
      }
    }

    // MRV heuristic: sort slots by number of eligible available candidates
    function getCandidatesForSlot(slot) {
      const { brandId, brandProcess } = slot;
      const assigns = assigneesByBrandProcess.get(brandProcess.id) || [];
      const candidates = [];

      for (const a of assigns) {
        const empId = a.employee_id;
        if (!canEmployeeWorkDate(empId, dateStr)) continue;

        // Single brand cap: must not work for a DIFFERENT brand on this date
        const bookedBrand = employeeDateBrand.get(`${dateStr}_${empId}`);
        if (bookedBrand && bookedBrand !== brandId) continue;

        // Cannot be counted twice for the same process on the same date
        const alreadyOnBP = bpAssignedOnDate.get(`${dateStr}_${brandProcess.id}`)?.has(empId);
        if (alreadyOnBP) continue;

        candidates.push({
          employeeId: empId,
          isPrimary: a.is_primary,
          shiftCount: employeeShiftCounts.get(empId) || 0,
        });
      }

      // Soft constraints: Primary assignees first, then lowest shift count (fair distribution)
      candidates.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) {
          return a.isPrimary ? -1 : 1;
        }
        return a.shiftCount - b.shiftCount;
      });

      return candidates.map((c) => c.employeeId);
    }

    dateSlots.sort((a, b) => getCandidatesForSlot(a).length - getCandidatesForSlot(b).length);

    let bestScore = -1;
    let bestSnapshot = null;

    function coverageScoreForDate() {
      const seen = new Set();
      let score = 0;
      for (const slot of dateSlots) {
        if (seen.has(slot.brandProcess.id)) continue;
        seen.add(slot.brandProcess.id);
        const assigned = bpAssignedOnDate.get(`${dateStr}_${slot.brandProcess.id}`)?.size || 0;
        score += Math.min(assigned, slot.brandProcess.min_staff);
      }
      return score;
    }

    function captureDateSnapshot() {
      const brandAssign = [];
      for (const [key, brandId] of employeeDateBrand) {
        if (key.startsWith(`${dateStr}_`)) brandAssign.push([key, brandId]);
      }
      const processAssign = [];
      for (const [key, empSet] of bpAssignedOnDate) {
        if (key.startsWith(`${dateStr}_`)) processAssign.push([key, Array.from(empSet)]);
      }
      return {
        brandAssign,
        processAssign,
        entries: scheduledEntries
          .filter((entry) => entry.work_date === dateStr)
          .map((entry) => ({ ...entry })),
        counts: new Map(employeeShiftCounts),
      };
    }

    function restoreDateSnapshot(snapshot) {
      if (!snapshot) return;
      for (const key of Array.from(employeeDateBrand.keys())) {
        if (key.startsWith(`${dateStr}_`)) employeeDateBrand.delete(key);
      }
      for (const [key, brandId] of snapshot.brandAssign) employeeDateBrand.set(key, brandId);

      for (const key of Array.from(bpAssignedOnDate.keys())) {
        if (key.startsWith(`${dateStr}_`)) bpAssignedOnDate.delete(key);
      }
      for (const [key, empIds] of snapshot.processAssign) {
        bpAssignedOnDate.set(key, new Set(empIds));
      }

      for (let index = scheduledEntries.length - 1; index >= 0; index -= 1) {
        if (scheduledEntries[index].work_date === dateStr) scheduledEntries.splice(index, 1);
      }
      scheduledEntries.push(...snapshot.entries.map((entry) => ({ ...entry })));

      employeeShiftCounts.clear();
      for (const [empId, count] of snapshot.counts) employeeShiftCounts.set(empId, count);
    }

    function recordBest() {
      const score = coverageScoreForDate();
      if (score > bestScore) {
        bestScore = score;
        bestSnapshot = captureDateSnapshot();
      }
    }

    function slotStillRequired(slot) {
      const assigned = bpAssignedOnDate.get(`${dateStr}_${slot.brandProcess.id}`)?.size || 0;
      return assigned < slot.brandProcess.min_staff;
    }

    function undoAssignment(empId, slot, isNewToBrand, autoCoveredBPs) {
      const bpDateKey = `${dateStr}_${slot.brandProcess.id}`;
      for (const autoBPId of autoCoveredBPs) {
        bpAssignedOnDate.get(`${dateStr}_${autoBPId}`)?.delete(empId);
      }
      bpAssignedOnDate.get(bpDateKey)?.delete(empId);
      if (isNewToBrand) {
        const idx = scheduledEntries.findIndex(
          (entry) =>
            entry.brand_id === slot.brandId &&
            entry.employee_id === empId &&
            entry.work_date === dateStr
        );
        if (idx !== -1) scheduledEntries.splice(idx, 1);
        employeeDateBrand.delete(`${dateStr}_${empId}`);
        employeeShiftCounts.set(empId, Math.max(0, (employeeShiftCounts.get(empId) || 1) - 1));
      }
    }

    /**
     * Genuine backtracking. A required slot that cannot be filled fails this
     * branch so earlier choices are reconsidered. Skipping a required slot is
     * not a complete solution. Slots already filled by same-brand multi-process
     * coverage are skipped because their requirement is already met.
     */
    function solveDateSlots(slotIndex) {
      if (searchLimitReached) return false;
      if (slotIndex >= dateSlots.length) {
        recordBest();
        return true;
      }

      const slot = dateSlots[slotIndex];
      if (!slotStillRequired(slot)) {
        return solveDateSlots(slotIndex + 1);
      }

      stepsCounter += 1;
      if (stepsCounter >= searchLimit) {
        searchLimitReached = true;
        recordBest();
        return false;
      }

      const candidates = getCandidatesForSlot(slot);
      if (candidates.length === 0) {
        recordBest();
        return false;
      }

      for (const empId of candidates) {
        const dateEmpKey = `${dateStr}_${empId}`;
        const bpDateKey = `${dateStr}_${slot.brandProcess.id}`;
        const prevBrand = employeeDateBrand.get(dateEmpKey);
        if (prevBrand && prevBrand !== slot.brandId) continue;
        const isNewToBrand = !prevBrand;

        employeeDateBrand.set(dateEmpKey, slot.brandId);
        if (!bpAssignedOnDate.has(bpDateKey)) bpAssignedOnDate.set(bpDateKey, new Set());
        bpAssignedOnDate.get(bpDateKey).add(empId);
        if (isNewToBrand) {
          const alreadyListed = scheduledEntries.some(
            (entry) =>
              entry.brand_id === slot.brandId &&
              entry.employee_id === empId &&
              entry.work_date === dateStr
          );
          if (!alreadyListed) {
            scheduledEntries.push({
              brand_id: slot.brandId,
              employee_id: empId,
              work_date: dateStr,
            });
          }
          employeeShiftCounts.set(empId, (employeeShiftCounts.get(empId) || 0) + 1);
        }

        const bpsOnBrand = brandProcessByBrand.get(slot.brandId) || [];
        const autoCoveredBPs = [];
        for (const otherBP of bpsOnBrand) {
          if (otherBP.id === slot.brandProcess.id) continue;
          const otherOpen = isBrandProcessOpenOnDate(
            otherBP.calendar_rule,
            dateStr,
            isDatePublicHoliday(dateStr, slot.brandId, holidays)
          );
          if (otherOpen && empAssignedBPs.get(empId)?.has(otherBP.id)) {
            const otherKey = `${dateStr}_${otherBP.id}`;
            if (!bpAssignedOnDate.has(otherKey)) bpAssignedOnDate.set(otherKey, new Set());
            if (!bpAssignedOnDate.get(otherKey).has(empId)) {
              bpAssignedOnDate.get(otherKey).add(empId);
              autoCoveredBPs.push(otherBP.id);
            }
          }
        }

        recordBest();
        const success = solveDateSlots(slotIndex + 1);
        if (success) return true;
        undoAssignment(empId, slot, isNewToBrand, autoCoveredBPs);
        if (searchLimitReached) return false;
      }

      recordBest();
      return false;
    }

    if (dateSlots.length > 0) {
      recordBest();
      const solved = solveDateSlots(0);
      if (!solved) restoreDateSnapshot(bestSnapshot);
    }
  }

  // Deduplicate scheduledEntries by (brand_id, employee_id, work_date)
  const uniqueEntriesMap = new Map();
  for (const entry of scheduledEntries) {
    const key = `${entry.brand_id}_${entry.employee_id}_${entry.work_date}`;
    if (!uniqueEntriesMap.has(key)) {
      uniqueEntriesMap.set(key, entry);
    }
  }
  const finalRosterEntries = Array.from(uniqueEntriesMap.values());

  // ----------------------------------------------------------------------------
  // PHASE 4: Build Daily Results and Detect Coverage Conflicts
  // ----------------------------------------------------------------------------
  const dayResults = [];
  const conflicts = [];
  let totalRequiredShifts = 0;
  let totalFilledShifts = 0;

  for (const dateStr of dates) {
    for (const bp of brandProcesses) {
      if (!bp.is_active) continue;
      const brand = brandMap.get(bp.brand_id);
      const process = processMap.get(bp.process_id);
      if (!brand || !process) continue;

      const isHoliday = isDatePublicHoliday(dateStr, bp.brand_id, holidays);
      const isOpen = isBrandProcessOpenOnDate(bp.calendar_rule, dateStr, isHoliday);
      const assignedSet = bpAssignedOnDate.get(`${dateStr}_${bp.id}`) || new Set();
      const assignedCount = assignedSet.size;
      const requiredStaff = isOpen ? bp.min_staff : 0;

      if (isOpen) {
        totalRequiredShifts += requiredStaff;
        totalFilledShifts += Math.min(assignedCount, requiredStaff);
      }

      dayResults.push({
        brand_process_id: bp.id,
        work_date: dateStr,
        is_open: isOpen,
        required_staff: requiredStaff,
        count: assignedCount,
      });

      // If open but assignedCount < requiredStaff -> conflict!
      if (isOpen && assignedCount < requiredStaff) {
        // Diagnose root cause
        const assigns = assigneesByBrandProcess.get(bp.id) || [];
        const deficit = requiredStaff - assignedCount;

        if (assigns.length === 0) {
          conflicts.push({
            work_date: dateStr,
            brand_id: bp.brand_id,
            brand_name: brand.name,
            process_id: bp.process_id,
            process_name: process.name,
            brand_process_id: bp.id,
            code: 'NO_ASSIGNED_EMPLOYEE',
            severity: 'critical',
            required_staff: requiredStaff,
            available_staff: 0,
            assigned_staff: assignedCount,
            explanation: `Brand-process ${brand.name} [${process.code}] has no employees assigned to it anywhere in the company.`,
            recommendation: `Assign eligible employees to ${brand.name} ${process.code} in the Assignments directory.`,
          });
        } else {
          // Check reasons for assigned employees being unavailable
          const reasons = [];
          let availableEligibleCount = 0;
          let soleEmpId = null;

          for (const a of assigns) {
            const emp = employeeMap.get(a.employee_id);
            if (!emp) continue;
            soleEmpId = emp.id;

            if (!emp.is_active) {
              reasons.push(`${emp.full_name} is marked Inactive.`);
            } else if (isEmployeeOnApprovedLeave(emp.id, dateStr, leaves)) {
              reasons.push(`${emp.full_name} has an Approved Leave / Comp-off.`);
            } else if (isEmployeeOnWeeklyOff(emp.id, dateStr, weeklyOffs)) {
              reasons.push(`${emp.full_name} is on scheduled Weekly Off.`);
            } else if (isEmployeeExplicitlyUnavailable(emp.id, dateStr, availability)) {
              reasons.push(`${emp.full_name} is marked Unavailable.`);
            } else {
              availableEligibleCount++;
            }
          }

          if (assigns.length === 1 && reasons.length > 0) {
            // Sole employee unavailable
            conflicts.push({
              work_date: dateStr,
              brand_id: bp.brand_id,
              brand_name: brand.name,
              process_id: bp.process_id,
              process_name: process.name,
              brand_process_id: bp.id,
              employee_id: soleEmpId,
              code: 'APPROVED_LEAVE_OR_OFF_CONFLICT',
              severity: 'critical',
              required_staff: requiredStaff,
              available_staff: availableEligibleCount,
              assigned_staff: assignedCount,
              explanation: `Sole assigned manager for ${brand.name} cannot work: ${reasons.join(' ')}`,
              recommendation: `Deploy unassigned backup resource (e.g., Kavya Menon) or reassign cross-pod coverage for ${brand.name}.`,
            });
          } else {
            // Multi-resource deficit
            conflicts.push({
              work_date: dateStr,
              brand_id: bp.brand_id,
              brand_name: brand.name,
              process_id: bp.process_id,
              process_name: process.name,
              brand_process_id: bp.id,
              code: 'INSUFFICIENT_STAFFING',
              severity: 'critical',
              required_staff: requiredStaff,
              available_staff: availableEligibleCount,
              assigned_staff: assignedCount,
              explanation: `Required coverage is ${requiredStaff}, but only ${assignedCount} assigned (deficit: ${deficit}). ${reasons.join(' ')}`,
              recommendation: `Assign an additional eligible resource from Pod ${brand.pod_id ? brand.pod_id.slice(-1) : 'team'} or adjust shift requirements.`,
            });
          }
        }
      }
    }
  }

  // SEARCH_LIMIT_REACHED means feasibility is unknown. Coverage gaps found
  // after a completed search are INFEASIBLE. A finished search with every
  // required slot filled is FEASIBLE.
  let overallStatus = EngineStatus.FEASIBLE;
  let feasibility = 'feasible';
  if (searchLimitReached) {
    overallStatus = EngineStatus.SEARCH_LIMIT_REACHED;
    feasibility = 'unknown';
  } else if (conflicts.length > 0) {
    overallStatus = EngineStatus.INFEASIBLE;
    feasibility = 'infeasible';
  }

  const coveragePercentage =
    totalRequiredShifts > 0
      ? Math.round((totalFilledShifts / totalRequiredShifts) * 100)
      : 100;

  return {
    status: overallStatus,
    feasibility,
    searchLimitReached,
    stepsExecuted: stepsCounter,
    entries: finalRosterEntries,
    dayResults,
    conflicts,
    stats: {
      totalRequiredShifts,
      totalFilledShifts,
      coveragePercentage,
      conflictCount: conflicts.length,
      daysInMonth: dates.length,
    },
  };
}
