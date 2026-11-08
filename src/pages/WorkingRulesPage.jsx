import { useEffect, useState, useMemo } from 'react';
import { SlidersHorizontal, Calendar, Users, Check, AlertCircle, Save } from 'lucide-react';
import {
  getWeeklyOffs,
  updateWeeklyOffs,
  getEmployees,
  getBrandProcesses,
  getBrands,
  getProcesses,
  updateBrandProcess,
} from '../lib/dataService.js';
import { useToast } from '../components/common/Toast.jsx';

const DAYS_OF_WEEK = [
  { index: 0, label: 'Sun', full: 'Sunday' },
  { index: 1, label: 'Mon', full: 'Monday' },
  { index: 2, label: 'Tue', full: 'Tuesday' },
  { index: 3, label: 'Wed', full: 'Wednesday' },
  { index: 4, label: 'Thu', full: 'Thursday' },
  { index: 5, label: 'Fri', full: 'Friday' },
  { index: 6, label: 'Sat', full: 'Saturday' },
];

export default function WorkingRulesPage() {
  const [employees, setEmployees] = useState([]);
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [brands, setBrands] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active tab: 'weekly_offs' | 'brand_calendars'
  const [activeTab, setActiveTab] = useState('weekly_offs');

  // Employee weekly off edits (map of employeeId -> array of day numbers)
  const [offState, setOffState] = useState({});
  const [savingEmpId, setSavingEmpId] = useState(null);

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [empList, woList, bpList, bList, pList] = await Promise.all([
        getEmployees(),
        getWeeklyOffs(),
        getBrandProcesses(),
        getBrands(),
        getProcesses(),
      ]);
      setEmployees(empList);
      setWeeklyOffs(woList);
      setBrandProcesses(bpList);
      setBrands(bList);
      setProcesses(pList);

      // Build initial offState
      const map = {};
      for (const emp of empList) {
        map[emp.id] = woList
          .filter((wo) => wo.employee_id === emp.id)
          .map((wo) => Number(wo.day_of_week));
      }
      setOffState(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);

  function toggleDay(empId, dayIndex) {
    const current = offState[empId] || [];
    let next;
    if (current.includes(dayIndex)) {
      next = current.filter((d) => d !== dayIndex);
    } else {
      next = [...current, dayIndex];
    }
    setOffState({ ...offState, [empId]: next });
  }

  async function handleSaveWeeklyOff(empId, empName) {
    setSavingEmpId(empId);
    try {
      const days = offState[empId] || [];
      await updateWeeklyOffs(empId, days);
      addToast(`Updated weekly off schedule for ${empName}`, 'success');
    } catch (err) {
      addToast('Failed to save weekly off', 'error');
    } finally {
      setSavingEmpId(null);
    }
  }

  async function handleQuickCalendarChange(bpId, rule) {
    try {
      const updated = await updateBrandProcess(bpId, { calendar_rule: rule });
      setBrandProcesses((prev) => prev.map((bp) => (bp.id === bpId ? updated : bp)));
      addToast('Calendar rule updated', 'success');
    } catch (err) {
      addToast('Failed to update calendar rule', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Working Rules & Operating Policies</h1>
        <p className="text-xs text-muted mt-1">
          Configure weekly-off patterns per employee, and customize operating calendars for each brand-process.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('weekly_offs')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'weekly_offs'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Users size={15} />
          <span>Employee Weekly Off Patterns</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('brand_calendars')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'brand_calendars'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Calendar size={15} />
          <span>Brand Operating Calendars</span>
        </button>
      </div>

      {/* TAB 1: Employee Weekly Offs */}
      {activeTab === 'weekly_offs' ? (
        <div className="rounded-xl border border-line bg-panel shadow-2xs overflow-hidden">
          <div className="p-4 bg-canvas/40 border-b border-line flex items-center justify-between">
            <p className="text-xs text-muted">
              Select designated weekly-off days for each employee. Click <span className="font-semibold text-ink">Save</span> on any modified row.
            </p>
            <span className="text-[11px] font-semibold text-accent">
              {employees.length} Employees Configured
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Employee Name</th>
                  {DAYS_OF_WEEK.map((d) => (
                    <th key={d.index} className="px-3 py-3.5 text-center">
                      {d.label}
                    </th>
                  ))}
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {employees.map((emp) => {
                  const empDays = offState[emp.id] || [];
                  const isSaving = savingEmpId === emp.id;

                  return (
                    <tr key={emp.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        {emp.full_name}
                      </td>
                      {DAYS_OF_WEEK.map((d) => {
                        const isOff = empDays.includes(d.index);
                        return (
                          <td key={d.index} className="px-3 py-3 text-center">
                            <button
                              type="button"
                              onClick={() => toggleDay(emp.id, d.index)}
                              className={`h-7 w-7 rounded-lg text-xs font-bold transition-all ${
                                isOff
                                  ? 'bg-rose-100 text-rose-800 border border-rose-300 shadow-2xs'
                                  : 'bg-canvas text-muted/60 hover:bg-slate-200'
                              }`}
                              title={`${emp.full_name}: ${isOff ? 'Off on ' + d.full : 'Working on ' + d.full}`}
                            >
                              {isOff ? 'OFF' : '•'}
                            </button>
                          </td>
                        );
                      })}
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleSaveWeeklyOff(emp.id, emp.full_name)}
                          disabled={isSaving}
                          className="inline-flex items-center gap-1 rounded-md bg-accent px-2.5 py-1 text-[11px] font-semibold text-white shadow-2xs hover:bg-teal-800 transition-colors disabled:opacity-50"
                        >
                          <Save size={12} />
                          <span>{isSaving ? 'Saving' : 'Save'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* TAB 2: Brand Operating Calendars */}
      {activeTab === 'brand_calendars' ? (
        <div className="rounded-xl border border-line bg-panel shadow-2xs overflow-hidden">
          <div className="p-4 bg-canvas/40 border-b border-line">
            <p className="text-xs text-muted">
              Choose the operating calendar rule for each client account. The scheduling engine uses this to determine open working days.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px]">
                <tr>
                  <th className="px-5 py-3.5">Brand</th>
                  <th className="px-5 py-3.5">Process</th>
                  <th className="px-5 py-3.5">Operating Calendar</th>
                  <th className="px-5 py-3.5">Staffing Requirement</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {brandProcesses.map((bp) => {
                  const brand = brandMap.get(bp.brand_id);
                  const proc = procMap.get(bp.process_id);

                  return (
                    <tr key={bp.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        {brand?.name}
                      </td>
                      <td className="px-5 py-3 font-medium text-accent font-mono">
                        {proc?.code} - {proc?.name}
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={bp.calendar_rule}
                          onChange={(e) => handleQuickCalendarChange(bp.id, e.target.value)}
                          className="rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-ink focus:border-accent"
                        >
                          <option value="365_days">365-Day Operations (Always Open)</option>
                          <option value="no_holidays">Daily with Public Holidays Off</option>
                          <option value="no_sundays_holidays">Sundays & Holidays Off (Mon-Sat)</option>
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-ink">{bp.min_staff}</span> staff required / day
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
