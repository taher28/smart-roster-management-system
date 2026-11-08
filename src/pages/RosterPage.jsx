import { useEffect, useState, useMemo } from 'react';
import {
  CalendarDays,
  Sparkles,
  Download,
  History,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Users,
  Building2,
  Workflow,
  Network,
  Calendar,
  Filter,
  Plus,
  Trash2,
  Edit3,
  Loader2,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';
import {
  getEmployees,
  getBrands,
  getProcesses,
  getBrandProcesses,
  getAssignments,
  getWeeklyOffs,
  getHolidays,
  getLeaves,
  getAvailability,
  getRosterVersions,
  getRosterVersionDetails,
  saveRosterVersion,
  restoreRosterVersion,
} from '../lib/dataService.js';
import {
  generateMonthlyRoster,
  getDaysInMonth,
  EngineStatus,
} from '../lib/scheduling/rosterEngine.js';
import { detectRosterConflicts } from '../lib/scheduling/conflictDetector.js';
import {
  exportMonthlyRosterCSV,
  exportEmployeeScheduleCSV,
  exportBrandScheduleCSV,
  exportConflictReportCSV,
} from '../lib/exportUtils.js';
import { StatusBadge, EmptyState } from '../components/common/StatusBadge.jsx';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function RosterPage() {
  // Operational Data
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [leaves, setLeaves] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  // Scheduling Month & Year (Default: November 2026)
  const [selectedYear, setSelectedYear] = useState(2026);
  const [selectedMonth, setSelectedMonth] = useState(11); // 1-12

  // Active View: 'company' | 'pod' | 'brand' | 'process' | 'employee'
  const [activeView, setActiveView] = useState('company');

  // Secondary Filters
  const [podFilter, setPodFilter] = useState('ALL');
  const [brandFilter, setBrandFilter] = useState('ALL');
  const [processFilter, setProcessFilter] = useState('ALL');
  const [employeeFilter, setEmployeeFilter] = useState('ALL');

  // Current Working Version State
  const [currentVersion, setCurrentVersion] = useState(null);
  const [entries, setEntries] = useState([]);
  const [dayResults, setDayResults] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [engineStatus, setEngineStatus] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Version History Drawer
  const [versionsList, setVersionsList] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Manual Edit Cell Modal
  const [editCell, setEditCell] = useState(null); // { brandId, dateStr, brandName, currentEmpIds }
  const [selectedAddEmpId, setSelectedAddEmpId] = useState('');

  const { addToast } = useToast();

  const monthDateStr = useMemo(() => {
    return `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-01`;
  }, [selectedYear, selectedMonth]);

  const datesInMonth = useMemo(() => {
    return getDaysInMonth(selectedYear, selectedMonth);
  }, [selectedYear, selectedMonth]);

  // Load baseline records
  async function loadInitialData() {
    setLoading(true);
    try {
      const [
        empList,
        bList,
        pList,
        bpList,
        aList,
        woList,
        hList,
        lList,
        availList,
        vList,
      ] = await Promise.all([
        getEmployees(),
        getBrands(),
        getProcesses(),
        getBrandProcesses(),
        getAssignments(),
        getWeeklyOffs(),
        getHolidays(),
        getLeaves(),
        getAvailability(),
        getRosterVersions(monthDateStr),
      ]);

      setEmployees(empList);
      setBrands(bList);
      setProcesses(pList);
      setBrandProcesses(bpList);
      setAssignments(aList);
      setWeeklyOffs(woList);
      setHolidays(hList);
      setLeaves(lList);
      setAvailability(availList);
      setVersionsList(vList);

      // If a version already exists for this month, load latest
      if (vList.length > 0) {
        const latest = vList[0];
        setCurrentVersion(latest);
        const details = await getRosterVersionDetails(latest.id);
        setEntries(details.entries || []);
        setDayResults(details.dayResults || []);
        setConflicts(details.conflicts || []);
        setEngineStatus(
          details.conflicts?.length > 0 ? EngineStatus.INFEASIBLE : EngineStatus.FEASIBLE
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [monthDateStr]);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const bpMap = useMemo(() => new Map(brandProcesses.map((bp) => [bp.id, bp])), [brandProcesses]);

  // Execute Monthly Roster Generation
  async function handleGenerateRoster() {
    setGenerating(true);
    addToast('Executing bounded backtracking scheduling engine...', 'info', 2000);

    setTimeout(async () => {
      try {
        const result = generateMonthlyRoster({
          year: selectedYear,
          month: selectedMonth,
          employees,
          brands,
          processes,
          brandProcesses,
          assignments,
          weeklyOffs,
          holidays,
          leaves,
          availability,
          options: { searchLimit: 50000 },
        });

        setEngineStatus(result.status);
        setEntries(result.entries);
        setDayResults(result.dayResults);
        setConflicts(result.conflicts);

        // Atomically save version to Supabase and local store
        const saved = await saveRosterVersion({
          rosterMonth: monthDateStr,
          status: 'draft',
          notes: `Automated generation (${result.status}) · ${result.stats.coveragePercentage}% coverage`,
          entries: result.entries,
          dayResults: result.dayResults,
          conflicts: result.conflicts,
        });

        setCurrentVersion(saved);
        const updatedVList = await getRosterVersions(monthDateStr);
        setVersionsList(updatedVList);

        if (result.status === EngineStatus.FEASIBLE) {
          addToast(`Roster generated successfully! 100% coverage achieved.`, 'success');
        } else if (result.status === EngineStatus.INFEASIBLE) {
          addToast(
            `Roster generated with ${result.conflicts.length} conflict(s). Best partial allocation saved.`,
            'info'
          );
        } else {
          addToast(`Search limit reached. Partial allocation saved.`, 'info');
        }
      } catch (e) {
        console.error(e);
        addToast('Generation error: ' + e.message, 'error');
      } finally {
        setGenerating(false);
      }
    }, 150);
  }

  // Real-Time Revalidation after manual edits
  async function handleRevalidate(newEntries) {
    const updatedConflicts = detectRosterConflicts({
      entries: newEntries,
      dayResults,
      month: selectedMonth,
      year: selectedYear,
      employees,
      brands,
      processes,
      brandProcesses,
      assignments,
      weeklyOffs,
      holidays,
      leaves,
      availability,
    });

    setConflicts(updatedConflicts);
    setEngineStatus(
      updatedConflicts.length > 0 ? EngineStatus.INFEASIBLE : EngineStatus.FEASIBLE
    );

    // Save edited version
    const saved = await saveRosterVersion({
      rosterMonth: monthDateStr,
      status: 'draft',
      notes: `Manual adjustment · ${updatedConflicts.length} open conflict(s)`,
      entries: newEntries,
      dayResults,
      conflicts: updatedConflicts,
    });

    setCurrentVersion(saved);
    const updatedVList = await getRosterVersions(monthDateStr);
    setVersionsList(updatedVList);

    addToast(`Saved as Version ${saved.version_number}. Revalidation completed.`, 'success');
  }

  // Open manual cell editor
  function handleCellClick(brand, dateStr) {
    const currentEmpIds = entries
      .filter((e) => e.brand_id === brand.id && e.work_date === dateStr)
      .map((e) => e.employee_id);

    // Eligible employees for this brand
    const bps = brandProcesses.filter((bp) => bp.brand_id === brand.id);
    const bpIds = new Set(bps.map((bp) => bp.id));
    const eligibleEmpIds = Array.from(
      new Set(
        assignments
          .filter((a) => bpIds.has(a.brand_process_id) && a.is_active)
          .map((a) => a.employee_id)
      )
    );

    setEditCell({
      brandId: brand.id,
      brandName: brand.name,
      dateStr,
      currentEmpIds,
      eligibleEmpIds,
    });
    setSelectedAddEmpId(eligibleEmpIds[0] || employees[0]?.id || '');
  }

  // Add employee to cell
  async function handleAddEmployeeToCell() {
    if (!editCell || !selectedAddEmpId) return;
    if (editCell.currentEmpIds.includes(selectedAddEmpId)) {
      addToast('Employee is already assigned to this date.', 'error');
      return;
    }

    const newEntries = [
      ...entries,
      {
        brand_id: editCell.brandId,
        employee_id: selectedAddEmpId,
        work_date: editCell.dateStr,
      },
    ];

    setEntries(newEntries);
    setEditCell({
      ...editCell,
      currentEmpIds: [...editCell.currentEmpIds, selectedAddEmpId],
    });

    await handleRevalidate(newEntries);
  }

  // Remove employee from cell
  async function handleRemoveEmployeeFromCell(empId) {
    if (!editCell) return;
    const newEntries = entries.filter(
      (e) =>
        !(
          e.brand_id === editCell.brandId &&
          e.employee_id === empId &&
          e.work_date === editCell.dateStr
        )
    );

    setEntries(newEntries);
    setEditCell({
      ...editCell,
      currentEmpIds: editCell.currentEmpIds.filter((id) => id !== empId),
    });

    await handleRevalidate(newEntries);
  }

  // Restore snapshot version
  async function handleRestoreVersion(vId) {
    if (!window.confirm('Restore this historical roster snapshot?')) return;
    try {
      const restored = await restoreRosterVersion(vId, monthDateStr);
      const details = await getRosterVersionDetails(restored.id);
      setCurrentVersion(restored);
      setEntries(details.entries);
      setDayResults(details.dayResults);
      setConflicts(details.conflicts);
      setEngineStatus(
        details.conflicts.length > 0 ? EngineStatus.INFEASIBLE : EngineStatus.FEASIBLE
      );
      const updatedVList = await getRosterVersions(monthDateStr);
      setVersionsList(updatedVList);
      setIsHistoryOpen(false);
      addToast(`Restored version snapshot as Version ${restored.version_number}`, 'success');
    } catch (err) {
      addToast('Failed to restore snapshot', 'error');
    }
  }

  // Filtered Brands for grid
  const visibleBrands = useMemo(() => {
    return brands.filter((b) => {
      const matchesPod = podFilter === 'ALL' || b.pod_id === podFilter;
      const matchesBrand = brandFilter === 'ALL' || b.id === brandFilter;
      return matchesPod && matchesBrand && b.is_active;
    });
  }, [brands, podFilter, brandFilter]);

  // Filtered Employees for grid
  const visibleEmployees = useMemo(() => {
    return employees.filter((e) => {
      const matchesPod = podFilter === 'ALL' || e.pod_id === podFilter;
      const matchesEmp = employeeFilter === 'ALL' || e.id === employeeFilter;
      return matchesPod && matchesEmp && e.is_active;
    });
  }, [employees, podFilter, employeeFilter]);

  // Month navigation
  function handlePrevMonth() {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  }

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  return (
    <div className="space-y-6">
      {/* Top Header & Month Selector */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Monthly Roster Planning</h1>
            {currentVersion ? (
              <span className="rounded-full bg-slate-900 text-white px-2.5 py-0.5 text-xs font-bold">
                v{currentVersion.version_number}
              </span>
            ) : null}
            {engineStatus ? (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  engineStatus === EngineStatus.FEASIBLE
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : engineStatus === EngineStatus.INFEASIBLE
                    ? 'bg-rose-50 text-rose-800 border-rose-200'
                    : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}
              >
                {engineStatus}
              </span>
            ) : null}
          </div>
          <p className="text-xs text-muted mt-1">
            Deterministic bounded backtracking engine with multi-process brand coverage and conflict detection
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Month Stepper */}
          <div className="flex items-center rounded-lg border border-line bg-panel p-1 shadow-2xs">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded p-1 text-muted hover:text-ink hover:bg-canvas"
              title="Previous Month"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 text-xs font-bold text-ink min-w-[7rem] text-center">
              {monthNames[selectedMonth - 1]} {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded p-1 text-muted hover:text-ink hover:bg-canvas"
              title="Next Month"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* History Drawer Trigger */}
          <button
            type="button"
            onClick={() => setIsHistoryOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-canvas transition-colors"
          >
            <History size={14} className="text-muted" />
            <span>History ({versionsList.length})</span>
          </button>

          {/* Export Dropdown / Trigger */}
          <div className="relative group">
            <button
              type="button"
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-2 text-xs font-semibold text-ink shadow-2xs hover:bg-canvas transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-700" />
              <span>Export CSV</span>
            </button>
            <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block w-48 rounded-xl border border-line bg-panel p-1 shadow-xl z-30">
              <button
                type="button"
                onClick={() =>
                  exportMonthlyRosterCSV({
                    dates: datesInMonth,
                    brands: visibleBrands,
                    employees,
                    entries,
                    monthYearStr: `${selectedYear}_${selectedMonth}`,
                  })
                }
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-ink hover:bg-canvas font-medium"
              >
                Monthly Roster Grid
              </button>
              <button
                type="button"
                onClick={() =>
                  exportEmployeeScheduleCSV({
                    dates: datesInMonth,
                    employees: visibleEmployees,
                    brands,
                    entries,
                    weeklyOffs,
                    leaves,
                    monthYearStr: `${selectedYear}_${selectedMonth}`,
                  })
                }
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-ink hover:bg-canvas font-medium"
              >
                Employee Schedules
              </button>
              <button
                type="button"
                onClick={() =>
                  exportBrandScheduleCSV({
                    dates: datesInMonth,
                    brands: visibleBrands,
                    brandProcesses,
                    processes,
                    dayResults,
                    monthYearStr: `${selectedYear}_${selectedMonth}`,
                  })
                }
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-ink hover:bg-canvas font-medium"
              >
                Brand Process Coverage
              </button>
              <button
                type="button"
                onClick={() =>
                  exportConflictReportCSV({
                    conflicts,
                    monthYearStr: `${selectedYear}_${selectedMonth}`,
                  })
                }
                className="w-full text-left rounded-lg px-3 py-2 text-xs text-rose-700 hover:bg-rose-50 font-medium"
              >
                Conflict Report ({conflicts.length})
              </button>
            </div>
          </div>

          {/* Generate Roster Primary Button */}
          <button
            type="button"
            onClick={handleGenerateRoster}
            disabled={generating}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors disabled:opacity-50"
          >
            {generating ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            <span>{entries.length > 0 ? 'Regenerate Roster' : 'Generate Roster'}</span>
          </button>
        </div>
      </div>

      {/* View Switcher & Secondary Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Stakeholder View Tabs */}
        <div className="flex flex-wrap border-b border-line gap-2 sm:gap-4 text-xs font-semibold">
          {[
            { id: 'company', label: 'Company-Wide View', icon: CalendarDays },
            { id: 'pod', label: 'Pod-Wise View', icon: Network },
            { id: 'brand', label: 'Brand Coverage View', icon: Building2 },
            { id: 'process', label: 'Process-Wise View', icon: Workflow },
            { id: 'employee', label: 'Employee Individual View', icon: Users },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeView === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveView(tab.id)}
                className={`pb-3 border-b-2 transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'border-accent text-accent font-bold'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Dropdowns based on active view */}
        <div className="flex flex-wrap items-center gap-2">
          {activeView === 'company' || activeView === 'pod' ? (
            <select
              value={podFilter}
              onChange={(e) => setPodFilter(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink focus:border-accent"
            >
              <option value="ALL">All Pods</option>
              {['Pod Alpha', 'Pod Beta', 'Pod Gamma', 'Pod Delta'].map((p, i) => (
                <option key={p} value={`00000000-0000-0000-0000-00000000000${i + 1}`}>
                  {p}
                </option>
              ))}
            </select>
          ) : null}

          {activeView === 'brand' ? (
            <select
              value={brandFilter}
              onChange={(e) => setBrandFilter(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink focus:border-accent"
            >
              <option value="ALL">All Brands ({brands.length})</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : null}

          {activeView === 'employee' ? (
            <select
              value={employeeFilter}
              onChange={(e) => setEmployeeFilter(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-medium text-ink focus:border-accent"
            >
              <option value="ALL">All Employees ({employees.length})</option>
              {employees
                .filter((e) => e.is_active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
            </select>
          ) : null}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted">Loading roster data...</div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No roster generated for this month"
          description="Click the 'Generate Roster' button above to run the deterministic constraint solving engine."
          action={
            <button
              type="button"
              onClick={handleGenerateRoster}
              disabled={generating}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <Sparkles size={15} />
              <span>Generate November 2026 Roster</span>
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* VIEW 1: Company-Wide Grid */}
          {activeView === 'company' ? (
            <div className="rounded-xl border border-line bg-panel shadow-2xs overflow-hidden">
              <div className="p-3.5 bg-canvas/40 border-b border-line flex items-center justify-between text-xs text-muted">
                <p>
                  Click any calendar cell to <span className="font-semibold text-ink">manually edit</span> staffing for that date.
                </p>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Staffed
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-300" /> Off / Closed
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px]">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 z-10 bg-panel border-b border-line text-muted uppercase font-bold text-[10px] tracking-wider">
                    <tr>
                      <th className="sticky left-0 z-20 bg-panel px-4 py-3 min-w-[12rem] border-r border-line shadow-xs">
                        Brand Account
                      </th>
                      {datesInMonth.map((dStr) => {
                        const dateObj = new Date(dStr + 'T00:00:00');
                        const dayNum = dateObj.getDate();
                        const isSunday = dateObj.getDay() === 0;
                        return (
                          <th
                            key={dStr}
                            className={`px-2 py-2 text-center min-w-[3.25rem] border-r border-line/60 ${
                              isSunday ? 'bg-amber-50/70 text-amber-900' : ''
                            }`}
                          >
                            <p className="font-extrabold">{dayNum}</p>
                            <p className="text-[9px] font-normal text-muted">
                              {dateObj.toLocaleDateString('en-US', { weekday: 'narrow' })}
                            </p>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {visibleBrands.map((brand) => (
                      <tr key={brand.id} className="hover:bg-canvas/40 transition-colors">
                        <td className="sticky left-0 z-10 bg-panel px-4 py-2.5 font-bold text-ink border-r border-line shadow-xs">
                          <p className="truncate max-w-[11rem]">{brand.name}</p>
                          <p className="text-[10px] font-normal text-muted truncate">
                            Pod {brand.pod_id ? brand.pod_id.slice(-1) : '-'}
                          </p>
                        </td>

                        {datesInMonth.map((dStr) => {
                          const dateObj = new Date(dStr + 'T00:00:00');
                          const isSunday = dateObj.getDay() === 0;
                          const assignedList = entries.filter(
                            (e) => e.brand_id === brand.id && e.work_date === dStr
                          );

                          return (
                            <td
                              key={dStr}
                              onClick={() => handleCellClick(brand, dStr)}
                              className={`px-1.5 py-1.5 text-center border-r border-line/60 cursor-pointer hover:bg-accent-soft/40 transition-colors ${
                                isSunday ? 'bg-amber-50/30' : ''
                              }`}
                            >
                              {assignedList.length > 0 ? (
                                <div className="space-y-0.5">
                                  {assignedList.map((entry) => {
                                    const emp = empMap.get(entry.employee_id);
                                    const firstName = emp?.full_name?.split(' ')[0] || 'Staff';
                                    return (
                                      <span
                                        key={entry.employee_id}
                                        className="inline-block w-full truncate rounded bg-emerald-100 text-emerald-900 px-1 py-0.5 text-[10px] font-semibold"
                                        title={emp?.full_name}
                                      >
                                        {firstName}
                                      </span>
                                    );
                                  })}
                                </div>
                              ) : (
                                <span className="text-[10px] text-muted/40 font-mono">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* VIEW 2: Pod-Wise View */}
          {activeView === 'pod' ? (
            <div className="space-y-6">
              {['00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000004']
                .filter((pId) => podFilter === 'ALL' || podFilter === pId)
                .map((pId) => {
                  const podBrands = brands.filter((b) => b.pod_id === pId && b.is_active);
                  const podEmployees = employees.filter((e) => e.pod_id === pId && e.is_active);
                  const podName = `Pod ${pId.slice(-1)}`;

                  return (
                    <div key={pId} className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-line pb-3">
                        <div>
                          <h3 className="text-base font-bold text-ink">{podName} Operational Roster</h3>
                          <p className="text-xs text-muted">
                            {podEmployees.length} specialists covering {podBrands.length} brands
                          </p>
                        </div>
                        <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-bold text-accent">
                          Pod Lead Monitored
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-canvas/60 text-muted uppercase font-bold text-[10px]">
                            <tr>
                              <th className="px-4 py-2.5">Brand</th>
                              <th className="px-4 py-2.5">Assigned Specialist(s)</th>
                              <th className="px-4 py-2.5">Monthly Shifts Filled</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-line">
                            {podBrands.map((b) => {
                              const bEntries = entries.filter((e) => e.brand_id === b.id);
                              const distinctEmpIds = Array.from(new Set(bEntries.map((e) => e.employee_id)));

                              return (
                                <tr key={b.id} className="hover:bg-canvas/30">
                                  <td className="px-4 py-2.5 font-bold text-ink">{b.name}</td>
                                  <td className="px-4 py-2.5 text-muted">
                                    {distinctEmpIds
                                      .map((id) => empMap.get(id)?.full_name)
                                      .filter(Boolean)
                                      .join(', ') || 'Unstaffed'}
                                  </td>
                                  <td className="px-4 py-2.5 font-bold text-accent">
                                    {bEntries.length} shifts scheduled
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : null}

          {/* VIEW 3: Brand Coverage View */}
          {activeView === 'brand' ? (
            <div className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-ink">Brand Daily Staffing Requirements</h3>
                  <p className="text-xs text-muted">
                    Checking daily staffing vs minimum required staffing per process
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-panel border-b border-line text-muted uppercase font-bold text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Brand</th>
                      <th className="px-4 py-3">Process</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Required</th>
                      <th className="px-4 py-3">Assigned</th>
                      <th className="px-4 py-3">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dayResults
                      .filter((dr) => {
                        const bp = bpMap.get(dr.brand_process_id);
                        if (!bp) return false;
                        return brandFilter === 'ALL' || bp.brand_id === brandFilter;
                      })
                      .map((dr, idx) => {
                        const bp = bpMap.get(dr.brand_process_id);
                        const brand = bp ? brandMap.get(bp.brand_id) : null;
                        const proc = bp ? procMap.get(bp.process_id) : null;
                        const isMet = !dr.is_open || dr.count >= dr.required_staff;

                        return (
                          <tr key={idx} className="hover:bg-canvas/30">
                            <td className="px-4 py-2 font-mono text-muted">{dr.work_date}</td>
                            <td className="px-4 py-2 font-bold text-ink">{brand?.name}</td>
                            <td className="px-4 py-2 font-mono font-semibold text-accent">
                              {proc?.code}
                            </td>
                            <td className="px-4 py-2">
                              {dr.is_open ? (
                                <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold">
                                  Open
                                </span>
                              ) : (
                                <span className="rounded bg-slate-100 text-slate-700 px-2 py-0.5 text-[10px] font-medium">
                                  Closed
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2 font-semibold">{dr.required_staff}</td>
                            <td className="px-4 py-2 font-semibold">{dr.count}</td>
                            <td className="px-4 py-2">
                              {isMet ? (
                                <span className="text-emerald-700 font-bold flex items-center gap-1">
                                  <Check size={14} /> Satisfied
                                </span>
                              ) : (
                                <span className="text-rose-700 font-bold flex items-center gap-1">
                                  <AlertTriangle size={14} /> Deficit ({dr.required_staff - dr.count})
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* VIEW 4: Process-Wise View */}
          {activeView === 'process' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {processes.map((proc) => {
                const procBPs = brandProcesses.filter(
                  (bp) => bp.process_id === proc.id && bp.is_active
                );
                const bpIds = new Set(procBPs.map((bp) => bp.id));
                const totalReq = dayResults
                  .filter((dr) => bpIds.has(dr.brand_process_id) && dr.is_open)
                  .reduce((sum, dr) => sum + dr.required_staff, 0);

                const totalFilled = dayResults
                  .filter((dr) => bpIds.has(dr.brand_process_id) && dr.is_open)
                  .reduce((sum, dr) => sum + Math.min(dr.count, dr.required_staff), 0);

                const covRate = totalReq > 0 ? Math.round((totalFilled / totalReq) * 100) : 100;

                return (
                  <div key={proc.id} className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="rounded bg-accent-soft px-2.5 py-0.5 text-xs font-bold font-mono text-accent">
                          {proc.code}
                        </span>
                        <h3 className="text-sm font-bold text-ink mt-1">{proc.name}</h3>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-extrabold text-ink">{covRate}%</p>
                        <p className="text-[10px] text-muted">Coverage Rate</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted leading-relaxed">{proc.description}</p>
                    <div className="pt-2 border-t border-line flex items-center justify-between text-xs text-muted">
                      <span>{procBPs.length} Brand Deployments</span>
                      <span>{totalFilled} / {totalReq} Shifts Filled</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* VIEW 5: Employee Individual Monthly Schedules */}
          {activeView === 'employee' ? (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                Displaying individual employee schedules including assigned shifts, weekly offs (OFF), holidays, and approved leaves.
              </p>

              <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-panel border-b border-line text-muted uppercase font-bold text-[10px]">
                      <tr>
                        <th className="sticky left-0 z-20 bg-panel px-4 py-3 min-w-[12rem] border-r border-line shadow-xs">
                          Employee Name
                        </th>
                        {datesInMonth.map((dStr) => {
                          const dateObj = new Date(dStr + 'T00:00:00');
                          const isSunday = dateObj.getDay() === 0;
                          return (
                            <th
                              key={dStr}
                              className={`px-2 py-2 text-center min-w-[3rem] border-r border-line/60 ${
                                isSunday ? 'bg-amber-50/70 text-amber-900' : ''
                              }`}
                            >
                              <p className="font-extrabold">{dateObj.getDate()}</p>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {visibleEmployees.map((emp) => {
                        return (
                          <tr key={emp.id} className="hover:bg-canvas/30">
                            <td className="sticky left-0 z-10 bg-panel px-4 py-2.5 font-bold text-ink border-r border-line shadow-xs">
                              <p className="truncate max-w-[11rem]">{emp.full_name}</p>
                              <p className="text-[10px] font-normal text-muted truncate">
                                Pod {emp.pod_id ? emp.pod_id.slice(-1) : 'Float'}
                              </p>
                            </td>

                            {datesInMonth.map((dStr) => {
                              const d = new Date(dStr + 'T00:00:00');
                              const isOff = weeklyOffs.some(
                                (wo) => wo.employee_id === emp.id && Number(wo.day_of_week) === d.getDay()
                              );
                              const isLeave = leaves.some(
                                (l) =>
                                  l.employee_id === emp.id &&
                                  l.status === 'approved' &&
                                  dStr >= l.start_date &&
                                  dStr <= l.end_date
                              );
                              const entry = entries.find(
                                (e) => e.employee_id === emp.id && e.work_date === dStr
                              );

                              return (
                                <td
                                  key={dStr}
                                  className="px-1 py-1 text-center border-r border-line/60 text-[10px]"
                                >
                                  {entry ? (
                                    <span
                                      className="inline-block w-full rounded bg-emerald-100 text-emerald-900 font-bold py-0.5 truncate"
                                      title={brandMap.get(entry.brand_id)?.name}
                                    >
                                      {brandMap.get(entry.brand_id)?.name?.slice(0, 4) || 'WORK'}
                                    </span>
                                  ) : isLeave ? (
                                    <span className="inline-block w-full rounded bg-rose-100 text-rose-800 font-bold py-0.5">
                                      LV
                                    </span>
                                  ) : isOff ? (
                                    <span className="inline-block w-full rounded bg-slate-200 text-slate-700 font-medium py-0.5">
                                      OFF
                                    </span>
                                  ) : (
                                    <span className="text-muted/40 font-mono">-</span>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Manual Cell Edit Modal */}
      <Modal
        isOpen={Boolean(editCell)}
        onClose={() => setEditCell(null)}
        title={editCell ? `Edit Coverage: ${editCell.brandName} (${editCell.dateStr})` : ''}
      >
        {editCell ? (
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted uppercase font-bold tracking-wider mb-2">
                Currently Assigned Specialists ({editCell.currentEmpIds.length})
              </p>
              {editCell.currentEmpIds.length === 0 ? (
                <p className="text-xs text-rose-600 italic">No specialist assigned on this date.</p>
              ) : (
                <div className="space-y-1.5">
                  {editCell.currentEmpIds.map((id) => (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-lg border border-line bg-canvas/40 px-3 py-2 text-xs"
                    >
                      <span className="font-bold text-ink">{empMap.get(id)?.full_name || id}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveEmployeeFromCell(id)}
                        className="p-1 text-muted hover:text-rose-600 transition-colors"
                        title="Remove specialist"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-line pt-4 space-y-3">
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Assign Additional Specialist
              </label>
              <div className="flex gap-2">
                <select
                  value={selectedAddEmpId}
                  onChange={(e) => setSelectedAddEmpId(e.target.value)}
                  className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
                >
                  {employees
                    .filter((e) => e.is_active && !editCell.currentEmpIds.includes(e.id))
                    .map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.full_name} {editCell.eligibleEmpIds?.includes(e.id) ? '★ (Eligible)' : ''}
                      </option>
                    ))}
                </select>
                <button
                  type="button"
                  onClick={handleAddEmployeeToCell}
                  className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* History Snapshot Drawer Modal */}
      <Modal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        title="Historical Roster Snapshots"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted">
            Every generate, edit, or restore creates an immutable historical version. You can restore any snapshot below.
          </p>

          {versionsList.length === 0 ? (
            <p className="text-xs text-muted italic">No historical versions found.</p>
          ) : (
            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {versionsList.map((v) => {
                const isCurrent = currentVersion?.id === v.id;
                return (
                  <div
                    key={v.id}
                    className={`rounded-xl border p-4 text-xs transition-colors ${
                      isCurrent
                        ? 'border-accent bg-accent-soft/30'
                        : 'border-line bg-panel hover:border-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-sm text-ink">
                          Version {v.version_number}
                        </span>
                        {isCurrent ? (
                          <span className="rounded bg-accent text-white px-2 py-0.5 text-[10px] font-bold">
                            Current Active
                          </span>
                        ) : null}
                      </div>
                      <StatusBadge status={v.status} />
                    </div>

                    <p className="text-muted mt-1 text-[11px]">{v.notes || 'No description'}</p>
                    <div className="mt-3 flex items-center justify-between text-[11px] text-muted border-t border-line/50 pt-2">
                      <span>Created: {new Date(v.created_at).toLocaleString()}</span>
                      {!isCurrent ? (
                        <button
                          type="button"
                          onClick={() => handleRestoreVersion(v.id)}
                          className="font-bold text-accent hover:underline flex items-center gap-1"
                        >
                          <RotateCcw size={12} />
                          <span>Restore Snapshot</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
