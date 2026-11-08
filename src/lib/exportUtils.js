/**
 * DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
 * CSV EXPORT UTILITIES (RFC-4180 COMPLIANT)
 */

function escapeCSV(field) {
  if (field === null || field === undefined) return '""';
  const str = String(field);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

function downloadCSV(filename, csvContent) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * 1. Export Full Monthly Roster Grid
 */
export function exportMonthlyRosterCSV({
  dates,
  brands,
  employees,
  entries,
  monthYearStr,
}) {
  const employeeMap = new Map(employees.map((e) => [e.id, e]));
  const headers = ['Brand Name', 'Pod ID', ...dates];
  const rows = [];

  for (const brand of brands) {
    const row = [brand.name, brand.pod_id ? brand.pod_id.slice(-1) : ''];
    for (const date of dates) {
      const assigned = entries
        .filter((e) => e.brand_id === brand.id && e.work_date === date)
        .map((e) => employeeMap.get(e.employee_id)?.full_name || 'Staff')
        .join('; ');
      row.push(assigned || 'OFF / CLOSED');
    }
    rows.push(row);
  }

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  downloadCSV(`datastraw_monthly_roster_${monthYearStr}.csv`, csv);
}

/**
 * 2. Export Employee Individual Schedules
 */
export function exportEmployeeScheduleCSV({
  dates,
  employees,
  brands,
  entries,
  weeklyOffs,
  leaves,
  monthYearStr,
}) {
  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const headers = ['Employee Name', 'Pod', 'Date', 'Day of Week', 'Status', 'Assigned Brand'];
  const rows = [];

  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  for (const emp of employees) {
    for (const date of dates) {
      const d = new Date(date + 'T00:00:00');
      const dayName = daysOfWeek[d.getDay()];

      const isLeave = leaves.some(
        (l) => l.employee_id === emp.id && l.status === 'approved' && date >= l.start_date && date <= l.end_date
      );
      const isOff = weeklyOffs.some(
        (wo) => wo.employee_id === emp.id && Number(wo.day_of_week) === d.getDay()
      );

      const assignedEntry = entries.find((e) => e.employee_id === emp.id && e.work_date === date);
      let status = 'Working';
      let brandName = '-';

      if (assignedEntry) {
        status = 'Working';
        brandName = brandMap.get(assignedEntry.brand_id)?.name || 'Assigned';
      } else if (isLeave) {
        status = 'Approved Leave';
      } else if (isOff) {
        status = 'Weekly Off';
      } else {
        status = 'Standby / Off';
      }

      rows.push([emp.full_name, emp.pod_id ? emp.pod_id.slice(-1) : 'None', date, dayName, status, brandName]);
    }
  }

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  downloadCSV(`datastraw_employee_schedules_${monthYearStr}.csv`, csv);
}

/**
 * 3. Export Brand Schedules & Coverage
 */
export function exportBrandScheduleCSV({
  dates,
  brands,
  brandProcesses,
  processes,
  dayResults,
  monthYearStr,
}) {
  const processMap = new Map(processes.map((p) => [p.id, p]));
  const bpMap = new Map(brandProcesses.map((bp) => [bp.id, bp]));
  const headers = ['Brand Name', 'Process Code', 'Process Name', 'Date', 'Operating Status', 'Required Staff', 'Assigned Staff', 'Coverage Gap'];
  const rows = [];

  for (const res of dayResults) {
    const bp = bpMap.get(res.brand_process_id);
    if (!bp) continue;
    const brand = brands.find((b) => b.id === bp.brand_id);
    const proc = processMap.get(bp.process_id);
    const gap = res.is_open ? Math.max(0, res.required_staff - res.count) : 0;

    rows.push([
      brand?.name || 'Brand',
      proc?.code || 'Code',
      proc?.name || 'Process',
      res.work_date,
      res.is_open ? 'Open' : 'Closed',
      res.required_staff,
      res.count,
      gap,
    ]);
  }

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  downloadCSV(`datastraw_brand_schedules_${monthYearStr}.csv`, csv);
}

/**
 * 4. Export Conflict Report
 */
export function exportConflictReportCSV({
  conflicts,
  monthYearStr,
}) {
  const headers = ['Date', 'Brand Name', 'Process Name', 'Conflict Code', 'Severity', 'Required Staff', 'Assigned Staff', 'Explanation', 'Recommendation'];
  const rows = [];

  for (const c of conflicts) {
    rows.push([
      c.work_date,
      c.brand_name || 'Brand',
      c.process_name || 'All Processes',
      c.code,
      c.severity.toUpperCase(),
      c.required_staff ?? 1,
      c.assigned_staff ?? 0,
      c.explanation,
      c.recommendation,
    ]);
  }

  const csv = [
    headers.map(escapeCSV).join(','),
    ...rows.map((r) => r.map(escapeCSV).join(',')),
  ].join('\r\n');

  downloadCSV(`datastraw_conflict_report_${monthYearStr}.csv`, csv);
}
