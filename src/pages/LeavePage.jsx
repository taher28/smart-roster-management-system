import { useEffect, useState, useMemo } from 'react';
import {
  CalendarRange,
  CalendarCheck,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  AlertCircle,
  Clock,
  Building2,
} from 'lucide-react';
import {
  getLeaves,
  createLeave,
  updateLeaveStatus,
  getHolidays,
  createHoliday,
  deleteHoliday,
  getEmployees,
  getBrands,
  getAvailability,
  createAvailability,
} from '../lib/dataService.js';
import { StatusBadge, EmptyState } from '../components/common/StatusBadge.jsx';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function LeavePage() {
  const [leaves, setLeaves] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [loading, setLoading] = useState(true);

  // Active view tab: 'leaves' | 'holidays' | 'availability'
  const [activeTab, setActiveTab] = useState('leaves');

  // Modals
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
    leave_type: 'planned_leave',
    status: 'approved',
  });

  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    name: '',
    holiday_date: '',
    brand_id: '',
  });

  const [isAvailModalOpen, setIsAvailModalOpen] = useState(false);
  const [availForm, setAvailForm] = useState({
    employee_id: '',
    start_date: '',
    end_date: '',
  });

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [lList, hList, empList, bList, aList] = await Promise.all([
        getLeaves(),
        getHolidays(),
        getEmployees(),
        getBrands(),
        getAvailability(),
      ]);
      setLeaves(lList);
      setHolidays(hList);
      setEmployees(empList);
      setBrands(bList);
      setAvailability(aList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);

  // Leave approval / rejection
  async function handleUpdateLeaveStatus(id, newStatus, empName) {
    try {
      await updateLeaveStatus(id, newStatus);
      setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)));
      addToast(`Leave for ${empName} marked as ${newStatus}`, 'success');
    } catch (err) {
      addToast('Failed to update leave status', 'error');
    }
  }

  // Create Leave
  async function handleCreateLeave(e) {
    e.preventDefault();
    if (!leaveForm.employee_id || !leaveForm.start_date || !leaveForm.end_date) {
      addToast('Please fill all required leave fields', 'error');
      return;
    }
    if (leaveForm.end_date < leaveForm.start_date) {
      addToast('End date cannot precede start date', 'error');
      return;
    }

    try {
      const created = await createLeave(leaveForm);
      setLeaves((prev) => [...prev, created]);
      addToast('Leave request recorded successfully', 'success');
      setIsLeaveModalOpen(false);
    } catch (err) {
      addToast('Failed to record leave', 'error');
    }
  }

  // Create Holiday
  async function handleCreateHoliday(e) {
    e.preventDefault();
    if (!holidayForm.name.trim() || !holidayForm.holiday_date) {
      addToast('Please provide holiday name and date', 'error');
      return;
    }
    try {
      const payload = {
        name: holidayForm.name.trim(),
        holiday_date: holidayForm.holiday_date,
        brand_id: holidayForm.brand_id || null,
      };
      const created = await createHoliday(payload);
      setHolidays((prev) => [...prev, created]);
      addToast('Public holiday added', 'success');
      setIsHolidayModalOpen(false);
    } catch (err) {
      addToast('Failed to add holiday', 'error');
    }
  }

  async function handleDeleteHoliday(id, name) {
    if (!window.confirm(`Delete holiday ${name}?`)) return;
    try {
      await deleteHoliday(id);
      setHolidays((prev) => prev.filter((h) => h.id !== id));
      addToast('Holiday removed', 'info');
    } catch (err) {
      addToast('Failed to delete holiday', 'error');
    }
  }

  // Create Availability Block
  async function handleCreateAvailability(e) {
    e.preventDefault();
    if (!availForm.employee_id || !availForm.start_date || !availForm.end_date) {
      addToast('Please fill all fields', 'error');
      return;
    }
    try {
      const created = await createAvailability(availForm);
      setAvailability((prev) => [...prev, created]);
      addToast('Unavailability window recorded', 'success');
      setIsAvailModalOpen(false);
    } catch (err) {
      addToast('Failed to record unavailability', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Leaves, Holidays & Availability</h1>
          <p className="text-xs text-muted mt-1">
            Record public holidays, approved leaves, comp-offs, and restricted availability dates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'leaves' ? (
            <button
              type="button"
              onClick={() => {
                setLeaveForm({
                  employee_id: employees[0]?.id || '',
                  start_date: new Date().toISOString().slice(0, 10),
                  end_date: new Date().toISOString().slice(0, 10),
                  leave_type: 'planned_leave',
                  status: 'approved',
                });
                setIsLeaveModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <Plus size={16} />
              <span>Record Leave / Comp-off</span>
            </button>
          ) : activeTab === 'holidays' ? (
            <button
              type="button"
              onClick={() => {
                setHolidayForm({ name: '', holiday_date: new Date().toISOString().slice(0, 10), brand_id: '' });
                setIsHolidayModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <Plus size={16} />
              <span>Add Public Holiday</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAvailForm({
                  employee_id: employees[0]?.id || '',
                  start_date: new Date().toISOString().slice(0, 10),
                  end_date: new Date().toISOString().slice(0, 10),
                });
                setIsAvailModalOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <Plus size={16} />
              <span>Block Availability</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-line gap-4 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('leaves')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'leaves'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <CalendarRange size={15} />
          <span>Planned Leaves & Comp-offs ({leaves.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('holidays')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'holidays'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Calendar size={15} />
          <span>Public Holidays ({holidays.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('availability')}
          className={`pb-3 border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'availability'
              ? 'border-accent text-accent font-bold'
              : 'border-transparent text-muted hover:text-ink'
          }`}
        >
          <Clock size={15} />
          <span>Availability Blocks ({availability.length})</span>
        </button>
      </div>

      {/* TAB 1: Leaves */}
      {activeTab === 'leaves' ? (
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Type</th>
                  <th className="px-5 py-3.5">Start Date</th>
                  <th className="px-5 py-3.5">End Date</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {leaves.map((leave) => {
                  const emp = empMap.get(leave.employee_id);
                  const isPending = leave.status === 'pending';
                  const isApproved = leave.status === 'approved';

                  return (
                    <tr key={leave.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        {emp?.full_name || 'Employee'}
                      </td>
                      <td className="px-5 py-3 font-medium capitalize">
                        {leave.leave_type.replace('_', ' ')}
                      </td>
                      <td className="px-5 py-3 font-mono text-muted">{leave.start_date}</td>
                      <td className="px-5 py-3 font-mono text-muted">{leave.end_date}</td>
                      <td className="px-5 py-3">
                        <StatusBadge status={leave.status} />
                      </td>
                      <td className="px-5 py-3 text-right space-x-1.5">
                        {isPending ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave.id, 'approved', emp?.full_name)}
                              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected', emp?.full_name)}
                              className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle size={12} />
                              <span>Reject</span>
                            </button>
                          </>
                        ) : isApproved ? (
                          <button
                            type="button"
                            onClick={() => handleUpdateLeaveStatus(leave.id, 'rejected', emp?.full_name)}
                            className="rounded border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-rose-600 hover:bg-canvas"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleUpdateLeaveStatus(leave.id, 'approved', emp?.full_name)}
                            className="rounded border border-line px-2 py-1 text-[11px] font-medium text-muted hover:text-emerald-700 hover:bg-canvas"
                          >
                            Re-approve
                          </button>
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

      {/* TAB 2: Holidays */}
      {activeTab === 'holidays' ? (
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Holiday Name</th>
                  <th className="px-5 py-3.5">Observed Date</th>
                  <th className="px-5 py-3.5">Scope</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {holidays.map((h) => {
                  const brand = h.brand_id ? brandMap.get(h.brand_id) : null;
                  return (
                    <tr key={h.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">{h.name}</td>
                      <td className="px-5 py-3 font-mono font-medium text-ink">{h.holiday_date}</td>
                      <td className="px-5 py-3">
                        {brand ? (
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                            Brand-specific: {brand.name}
                          </span>
                        ) : (
                          <span className="rounded bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                            Company-wide Public Holiday
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleDeleteHoliday(h.id, h.name)}
                          className="p-1 text-muted hover:text-rose-600 rounded transition-colors"
                          title="Delete Holiday"
                        >
                          <Trash2 size={14} />
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

      {/* TAB 3: Availability */}
      {activeTab === 'availability' ? (
        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Employee</th>
                  <th className="px-5 py-3.5">Blocked From</th>
                  <th className="px-5 py-3.5">Blocked Until</th>
                  <th className="px-5 py-3.5">Constraint Impact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {availability.map((a) => {
                  const emp = empMap.get(a.employee_id);
                  return (
                    <tr key={a.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        {emp?.full_name || 'Employee'}
                      </td>
                      <td className="px-5 py-3 font-mono text-muted">{a.start_date}</td>
                      <td className="px-5 py-3 font-mono text-muted">{a.end_date}</td>
                      <td className="px-5 py-3">
                        <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5 text-[10px] font-bold">
                          Hard Constraint: Excluded from schedule
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Record Leave Modal */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Record Planned Leave or Comp-off"
      >
        <form onSubmit={handleCreateLeave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Select Employee
            </label>
            <select
              value={leaveForm.employee_id}
              onChange={(e) => setLeaveForm({ ...leaveForm, employee_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              {employees
                .filter((e) => e.is_active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Leave Classification
            </label>
            <select
              value={leaveForm.leave_type}
              onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="planned_leave">Planned Leave</option>
              <option value="comp_off">Comp-off (Earned Leave)</option>
              <option value="sick_leave">Sick / Medical Leave</option>
              <option value="unpaid_leave">Unpaid Absence</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={leaveForm.start_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={leaveForm.end_date}
                onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Approval Status
            </label>
            <select
              value={leaveForm.status}
              onChange={(e) => setLeaveForm({ ...leaveForm, status: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="approved">Approved (Hard Constraint)</option>
              <option value="pending">Pending Approval</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsLeaveModalOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
            >
              Record Leave
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Holiday Modal */}
      <Modal
        isOpen={isHolidayModalOpen}
        onClose={() => setIsHolidayModalOpen(false)}
        title="Add Public Holiday"
      >
        <form onSubmit={handleCreateHoliday} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Holiday Name
            </label>
            <input
              type="text"
              placeholder="e.g. Diwali / Deepavali"
              value={holidayForm.name}
              onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Observed Date
            </label>
            <input
              type="date"
              value={holidayForm.holiday_date}
              onChange={(e) => setHolidayForm({ ...holidayForm, holiday_date: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Scope (Leave empty for company-wide)
            </label>
            <select
              value={holidayForm.brand_id}
              onChange={(e) => setHolidayForm({ ...holidayForm, brand_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="">Company-Wide (All Brands)</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} Only
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsHolidayModalOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
            >
              Add Holiday
            </button>
          </div>
        </form>
      </Modal>

      {/* Block Availability Modal */}
      <Modal
        isOpen={isAvailModalOpen}
        onClose={() => setIsAvailModalOpen(false)}
        title="Block Employee Availability"
      >
        <form onSubmit={handleCreateAvailability} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Employee
            </label>
            <select
              value={availForm.employee_id}
              onChange={(e) => setAvailForm({ ...availForm, employee_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              {employees
                .filter((e) => e.is_active)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.full_name}
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={availForm.start_date}
                onChange={(e) => setAvailForm({ ...availForm, start_date: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={availForm.end_date}
                onChange={(e) => setAvailForm({ ...availForm, end_date: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAvailModalOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
            >
              Block Window
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
