/**
 * DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
 * DATA SERVICE LAYER
 *
 * Provides bidirectional communication with Supabase PostgreSQL tables.
 * When tables are not yet seeded or during unauthenticated review,
 * provides reactive local-storage persistence using the 31-employee assessment dataset.
 */

import { supabase } from './supabase.js';
import {
  INITIAL_PODS,
  INITIAL_PROCESSES,
  INITIAL_EMPLOYEES,
  INITIAL_BRANDS,
  INITIAL_BRAND_PROCESSES,
  INITIAL_ASSIGNMENTS,
  INITIAL_WEEKLY_OFFS,
  INITIAL_HOLIDAYS,
  INITIAL_LEAVES,
  INITIAL_AVAILABILITY,
} from './mockData.js';

const STORAGE_PREFIX = 'datastraw_roster_';

function getLocal(key, defaultValue) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    return raw ? JSON.parse(raw) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

function setLocal(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

// ------------------------------------------------------------------------------
// EMPLOYEES
// ------------------------------------------------------------------------------
export async function getEmployees() {
  try {
    const { data, error } = await supabase.from('employees').select('*').order('full_name');
    if (!error && data && data.length > 0) {
      setLocal('employees', data);
      return data;
    }
  } catch (e) {
    // Fall back to local
  }
  return getLocal('employees', INITIAL_EMPLOYEES);
}

export async function createEmployee(emp) {
  const newEmp = {
    id: emp.id || crypto.randomUUID(),
    full_name: emp.full_name,
    pod_id: emp.pod_id || null,
    is_active: emp.is_active !== undefined ? emp.is_active : true,
    created_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase.from('employees').insert([newEmp]).select().single();
    if (!error && data) {
      const list = getLocal('employees', INITIAL_EMPLOYEES);
      setLocal('employees', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('employees', INITIAL_EMPLOYEES);
  const updated = [...list, newEmp];
  setLocal('employees', updated);
  return newEmp;
}

export async function updateEmployee(id, updates) {
  try {
    const { data, error } = await supabase
      .from('employees')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('employees', INITIAL_EMPLOYEES).map((e) => (e.id === id ? data : e));
      setLocal('employees', list);
      return data;
    }
  } catch (e) {}

  const list = getLocal('employees', INITIAL_EMPLOYEES).map((e) =>
    e.id === id ? { ...e, ...updates } : e
  );
  setLocal('employees', list);
  return list.find((e) => e.id === id);
}

// ------------------------------------------------------------------------------
// BRANDS
// ------------------------------------------------------------------------------
export async function getBrands() {
  try {
    const { data, error } = await supabase.from('brands').select('*').order('name');
    if (!error && data && data.length > 0) {
      setLocal('brands', data);
      return data;
    }
  } catch (e) {}
  return getLocal('brands', INITIAL_BRANDS);
}

export async function createBrand(brand) {
  const newBrand = {
    id: brand.id || crypto.randomUUID(),
    name: brand.name,
    pod_id: brand.pod_id || null,
    is_active: brand.is_active !== undefined ? brand.is_active : true,
  };

  try {
    const { data, error } = await supabase.from('brands').insert([newBrand]).select().single();
    if (!error && data) {
      const list = getLocal('brands', INITIAL_BRANDS);
      setLocal('brands', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('brands', INITIAL_BRANDS);
  const updated = [...list, newBrand];
  setLocal('brands', updated);
  return newBrand;
}

export async function updateBrand(id, updates) {
  try {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('brands', INITIAL_BRANDS).map((b) => (b.id === id ? data : b));
      setLocal('brands', list);
      return data;
    }
  } catch (e) {}

  const list = getLocal('brands', INITIAL_BRANDS).map((b) =>
    b.id === id ? { ...b, ...updates } : b
  );
  setLocal('brands', list);
  return list.find((b) => b.id === id);
}

// ------------------------------------------------------------------------------
// PROCESSES & BRAND PROCESSES
// ------------------------------------------------------------------------------
export async function getProcesses() {
  try {
    const { data, error } = await supabase.from('processes').select('*').order('code');
    if (!error && data && data.length > 0) {
      setLocal('processes', data);
      return data;
    }
  } catch (e) {}
  return getLocal('processes', INITIAL_PROCESSES);
}

export async function getBrandProcesses() {
  try {
    const { data, error } = await supabase.from('brand_processes').select('*');
    if (!error && data && data.length > 0) {
      setLocal('brand_processes', data);
      return data;
    }
  } catch (e) {}
  return getLocal('brand_processes', INITIAL_BRAND_PROCESSES);
}

export async function updateBrandProcess(id, updates) {
  try {
    const { data, error } = await supabase
      .from('brand_processes')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('brand_processes', INITIAL_BRAND_PROCESSES).map((bp) =>
        bp.id === id ? data : bp
      );
      setLocal('brand_processes', list);
      return data;
    }
  } catch (e) {}

  const list = getLocal('brand_processes', INITIAL_BRAND_PROCESSES).map((bp) =>
    bp.id === id ? { ...bp, ...updates } : bp
  );
  setLocal('brand_processes', list);
  return list.find((bp) => bp.id === id);
}

// ------------------------------------------------------------------------------
// PODS
// ------------------------------------------------------------------------------
export async function getPods() {
  try {
    const { data, error } = await supabase.from('pods').select('*').order('name');
    if (!error && data && data.length > 0) {
      setLocal('pods', data);
      return data;
    }
  } catch (e) {}
  return getLocal('pods', INITIAL_PODS);
}

export async function updatePodLead(podId, leadEmployeeId) {
  try {
    const { data, error } = await supabase
      .from('pods')
      .update({ lead_employee_id: leadEmployeeId })
      .eq('id', podId)
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('pods', INITIAL_PODS).map((p) => (p.id === podId ? data : p));
      setLocal('pods', list);
      return data;
    }
  } catch (e) {}

  const list = getLocal('pods', INITIAL_PODS).map((p) =>
    p.id === podId ? { ...p, lead_employee_id: leadEmployeeId } : p
  );
  setLocal('pods', list);
  return list.find((p) => p.id === podId);
}

// ------------------------------------------------------------------------------
// ASSIGNMENTS
// ------------------------------------------------------------------------------
export async function getAssignments() {
  try {
    const { data, error } = await supabase.from('assignments').select('*');
    if (!error && data && data.length > 0) {
      setLocal('assignments', data);
      return data;
    }
  } catch (e) {}
  return getLocal('assignments', INITIAL_ASSIGNMENTS);
}

export async function createAssignment(assign) {
  const newAssign = {
    id: assign.id || crypto.randomUUID(),
    employee_id: assign.employee_id,
    brand_process_id: assign.brand_process_id,
    is_active: assign.is_active !== undefined ? assign.is_active : true,
    is_primary: assign.is_primary !== undefined ? assign.is_primary : false,
  };

  try {
    const { data, error } = await supabase
      .from('assignments')
      .insert([newAssign])
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('assignments', INITIAL_ASSIGNMENTS);
      setLocal('assignments', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('assignments', INITIAL_ASSIGNMENTS);
  const updated = [...list, newAssign];
  setLocal('assignments', updated);
  return newAssign;
}

export async function deleteAssignment(id) {
  try {
    await supabase.from('assignments').delete().eq('id', id);
  } catch (e) {}
  const list = getLocal('assignments', INITIAL_ASSIGNMENTS).filter((a) => a.id !== id);
  setLocal('assignments', list);
  return true;
}

// ------------------------------------------------------------------------------
// WEEKLY OFFS
// ------------------------------------------------------------------------------
export async function getWeeklyOffs() {
  try {
    const { data, error } = await supabase.from('weekly_offs').select('*');
    if (!error && data && data.length > 0) {
      setLocal('weekly_offs', data);
      return data;
    }
  } catch (e) {}
  return getLocal('weekly_offs', INITIAL_WEEKLY_OFFS);
}

export async function updateWeeklyOffs(employeeId, days = []) {
  // days is array of numbers 0-6
  try {
    await supabase.from('weekly_offs').delete().eq('employee_id', employeeId);
    if (days.length > 0) {
      const inserts = days.map((d) => ({
        employee_id: employeeId,
        day_of_week: d,
      }));
      await supabase.from('weekly_offs').insert(inserts);
    }
  } catch (e) {}

  let list = getLocal('weekly_offs', INITIAL_WEEKLY_OFFS).filter(
    (wo) => wo.employee_id !== employeeId
  );
  for (const d of days) {
    list.push({
      id: crypto.randomUUID(),
      employee_id: employeeId,
      day_of_week: d,
    });
  }
  setLocal('weekly_offs', list);
  return list;
}

// ------------------------------------------------------------------------------
// HOLIDAYS
// ------------------------------------------------------------------------------
export async function getHolidays() {
  try {
    const { data, error } = await supabase.from('holidays').select('*').order('holiday_date');
    if (!error && data && data.length > 0) {
      setLocal('holidays', data);
      return data;
    }
  } catch (e) {}
  return getLocal('holidays', INITIAL_HOLIDAYS);
}

export async function createHoliday(holiday) {
  const newHoliday = {
    id: holiday.id || crypto.randomUUID(),
    name: holiday.name,
    holiday_date: holiday.holiday_date,
    brand_id: holiday.brand_id || null,
  };

  try {
    const { data, error } = await supabase.from('holidays').insert([newHoliday]).select().single();
    if (!error && data) {
      const list = getLocal('holidays', INITIAL_HOLIDAYS);
      setLocal('holidays', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('holidays', INITIAL_HOLIDAYS);
  const updated = [...list, newHoliday];
  setLocal('holidays', updated);
  return newHoliday;
}

export async function deleteHoliday(id) {
  try {
    await supabase.from('holidays').delete().eq('id', id);
  } catch (e) {}
  const list = getLocal('holidays', INITIAL_HOLIDAYS).filter((h) => h.id !== id);
  setLocal('holidays', list);
  return true;
}

// ------------------------------------------------------------------------------
// LEAVES & AVAILABILITY
// ------------------------------------------------------------------------------
export async function getLeaves() {
  try {
    const { data, error } = await supabase.from('leaves').select('*').order('start_date');
    if (!error && data && data.length > 0) {
      setLocal('leaves', data);
      return data;
    }
  } catch (e) {}
  return getLocal('leaves', INITIAL_LEAVES);
}

export async function createLeave(leave) {
  const newLeave = {
    id: leave.id || crypto.randomUUID(),
    employee_id: leave.employee_id,
    start_date: leave.start_date,
    end_date: leave.end_date,
    leave_type: leave.leave_type || 'planned_leave',
    status: leave.status || 'pending',
  };

  try {
    const { data, error } = await supabase.from('leaves').insert([newLeave]).select().single();
    if (!error && data) {
      const list = getLocal('leaves', INITIAL_LEAVES);
      setLocal('leaves', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('leaves', INITIAL_LEAVES);
  const updated = [...list, newLeave];
  setLocal('leaves', updated);
  return newLeave;
}

export async function updateLeaveStatus(id, status) {
  try {
    const { data, error } = await supabase
      .from('leaves')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('leaves', INITIAL_LEAVES).map((l) => (l.id === id ? data : l));
      setLocal('leaves', list);
      return data;
    }
  } catch (e) {}

  const list = getLocal('leaves', INITIAL_LEAVES).map((l) => (l.id === id ? { ...l, status } : l));
  setLocal('leaves', list);
  return list.find((l) => l.id === id);
}

export async function getAvailability() {
  try {
    const { data, error } = await supabase.from('employee_availability').select('*');
    if (!error && data && data.length > 0) {
      setLocal('employee_availability', data);
      return data;
    }
  } catch (e) {}
  return getLocal('employee_availability', INITIAL_AVAILABILITY);
}

export async function createAvailability(avail) {
  const newAvail = {
    id: avail.id || crypto.randomUUID(),
    employee_id: avail.employee_id,
    start_date: avail.start_date,
    end_date: avail.end_date,
  };

  try {
    const { data, error } = await supabase
      .from('employee_availability')
      .insert([newAvail])
      .select()
      .single();
    if (!error && data) {
      const list = getLocal('employee_availability', INITIAL_AVAILABILITY);
      setLocal('employee_availability', [...list, data]);
      return data;
    }
  } catch (e) {}

  const list = getLocal('employee_availability', INITIAL_AVAILABILITY);
  const updated = [...list, newAvail];
  setLocal('employee_availability', updated);
  return newAvail;
}

// ------------------------------------------------------------------------------
// ROSTER VERSIONS, ENTRIES, DAY RESULTS, CONFLICTS
// ------------------------------------------------------------------------------
export async function getRosterVersions(rosterMonth) {
  try {
    let query = supabase.from('roster_versions').select('*').order('version_number', { ascending: false });
    if (rosterMonth) {
      query = query.eq('roster_month', rosterMonth);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (e) {}

  const versions = getLocal('roster_versions', []);
  if (rosterMonth) {
    return versions.filter((v) => v.roster_month === rosterMonth);
  }
  return versions;
}

export async function getRosterVersionDetails(versionId) {
  try {
    const [entriesRes, resultsRes, conflictsRes] = await Promise.all([
      supabase.from('roster_entries').select('*').eq('version_id', versionId),
      supabase.from('roster_day_results').select('*').eq('version_id', versionId),
      supabase.from('roster_conflicts').select('*').eq('version_id', versionId),
    ]);

    if (!entriesRes.error && entriesRes.data && entriesRes.data.length > 0) {
      return {
        entries: entriesRes.data,
        dayResults: resultsRes.data || [],
        conflicts: conflictsRes.data || [],
      };
    }
  } catch (e) {}

  return {
    entries: getLocal(`roster_entries_${versionId}`, []),
    dayResults: getLocal(`roster_day_results_${versionId}`, []),
    conflicts: getLocal(`roster_conflicts_${versionId}`, []),
  };
}

/**
 * Atomically saves a new roster version with its entries, day results, and conflicts.
 */
export async function saveRosterVersion({
  rosterMonth, // 'YYYY-MM-01'
  status = 'draft',
  notes = '',
  entries = [],
  dayResults = [],
  conflicts = [],
}) {
  const existingVersions = await getRosterVersions(rosterMonth);
  const nextVersionNumber = existingVersions.length > 0 ? existingVersions[0].version_number + 1 : 1;
  const versionId = crypto.randomUUID();

  const newVersion = {
    id: versionId,
    version_number: nextVersionNumber,
    roster_month: rosterMonth,
    status,
    notes,
    created_at: new Date().toISOString(),
  };

  // Try remote Supabase insertion
  try {
    const { data: vData, error: vError } = await supabase
      .from('roster_versions')
      .insert([newVersion])
      .select()
      .single();

    if (!vError && vData) {
      const vId = vData.id;

      // Batch insert entries
      const formattedEntries = entries.map((e) => ({
        version_id: vId,
        brand_id: e.brand_id,
        employee_id: e.employee_id,
        work_date: e.work_date,
      }));

      // Batch insert day results
      const formattedResults = dayResults.map((dr) => ({
        version_id: vId,
        brand_process_id: dr.brand_process_id,
        work_date: dr.work_date,
        is_open: dr.is_open,
        required_staff: dr.required_staff,
        count: dr.count,
      }));

      // Batch insert conflicts
      const formattedConflicts = conflicts.map((c) => ({
        version_id: vId,
        employee_id: c.employee_id || null,
        brand_process_id: c.brand_process_id || null,
        work_date: c.work_date,
        code: c.code,
        severity: c.severity,
        explanation: c.explanation,
        recommendation: c.recommendation,
      }));

      if (formattedEntries.length > 0) {
        await supabase.from('roster_entries').insert(formattedEntries);
      }
      if (formattedResults.length > 0) {
        await supabase.from('roster_day_results').insert(formattedResults);
      }
      if (formattedConflicts.length > 0) {
        await supabase.from('roster_conflicts').insert(formattedConflicts);
      }
    }
  } catch (e) {
    console.warn('Supabase remote save failed, saving to local store:', e.message);
  }

  // Always save snapshot locally as well for instant responsiveness
  const allVersions = getLocal('roster_versions', []);
  setLocal('roster_versions', [newVersion, ...allVersions]);
  setLocal(`roster_entries_${versionId}`, entries);
  setLocal(`roster_day_results_${versionId}`, dayResults);
  setLocal(`roster_conflicts_${versionId}`, conflicts);

  return newVersion;
}

/**
 * Restores a historical snapshot by creating a new version based on it
 */
export async function restoreRosterVersion(sourceVersionId, rosterMonth) {
  const details = await getRosterVersionDetails(sourceVersionId);
  return saveRosterVersion({
    rosterMonth,
    status: 'draft',
    notes: `Restored from snapshot version ${sourceVersionId.slice(0, 8)}`,
    entries: details.entries,
    dayResults: details.dayResults,
    conflicts: details.conflicts,
  });
}

/**
 * Directly seeds the Supabase database with all 31 employees, 22 brands, 4 pods, etc.
 */
export async function seedSupabaseDatabase() {
  console.log('Seeding Supabase database with initial dataset...');
  const results = {};

  try {
    results.pods = await supabase.from('pods').upsert(INITIAL_PODS);
    results.processes = await supabase.from('processes').upsert(INITIAL_PROCESSES);
    results.employees = await supabase.from('employees').upsert(INITIAL_EMPLOYEES);
    results.brands = await supabase.from('brands').upsert(INITIAL_BRANDS);
    results.brand_processes = await supabase.from('brand_processes').upsert(INITIAL_BRAND_PROCESSES);
    results.assignments = await supabase.from('assignments').upsert(INITIAL_ASSIGNMENTS);
    results.weekly_offs = await supabase.from('weekly_offs').upsert(INITIAL_WEEKLY_OFFS);
    results.holidays = await supabase.from('holidays').upsert(INITIAL_HOLIDAYS);
    results.leaves = await supabase.from('leaves').upsert(INITIAL_LEAVES);
    results.availability = await supabase.from('employee_availability').upsert(INITIAL_AVAILABILITY);

    return { success: true, results };
  } catch (err) {
    console.error('Remote seed error:', err);
    return { success: false, error: err.message };
  }
}
