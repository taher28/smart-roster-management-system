import { useEffect, useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Shield,
  Edit2,
  CheckCircle,
  XCircle,
  Filter,
  UserCheck,
  UserX,
  ExternalLink,
} from 'lucide-react';
import {
  getEmployees,
  createEmployee,
  updateEmployee,
  getPods,
  getAssignments,
  getBrands,
  getBrandProcesses,
  getProcesses,
  getWeeklyOffs,
} from '../lib/dataService.js';
import { StatusBadge, EmptyState } from '../components/common/StatusBadge.jsx';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [pods, setPods] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [weeklyOffs, setWeeklyOffs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({ full_name: '', pod_id: '', is_active: true });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Detail Drawer State
  const [viewingEmployee, setViewingEmployee] = useState(null);

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [empList, podList, assignList, brandList, bpList, procList, woList] = await Promise.all([
        getEmployees(),
        getPods(),
        getAssignments(),
        getBrands(),
        getBrandProcesses(),
        getProcesses(),
        getWeeklyOffs(),
      ]);
      setEmployees(empList);
      setPods(podList);
      setAssignments(assignList);
      setBrands(brandList);
      setBrandProcesses(bpList);
      setProcesses(procList);
      setWeeklyOffs(woList);
    } catch (e) {
      console.error('Failed to load employees:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p])), [pods]);
  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const processMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const bpMap = useMemo(() => new Map(brandProcesses.map((bp) => [bp.id, bp])), [brandProcesses]);

  // Filtered employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      const matchesSearch = emp.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesPod = selectedPod === 'ALL' || emp.pod_id === selectedPod;
      const matchesStatus =
        selectedStatus === 'ALL' ||
        (selectedStatus === 'ACTIVE' && emp.is_active) ||
        (selectedStatus === 'INACTIVE' && !emp.is_active);

      return matchesSearch && matchesPod && matchesStatus;
    });
  }, [employees, search, selectedPod, selectedStatus]);

  function handleOpenAdd() {
    setEditingEmployee(null);
    setFormData({ full_name: '', pod_id: pods[0]?.id || '', is_active: true });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(emp) {
    setEditingEmployee(emp);
    setFormData({
      full_name: emp.full_name,
      pod_id: emp.pod_id || '',
      is_active: emp.is_active,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleToggleStatus(emp) {
    const nextStatus = !emp.is_active;
    const res = await updateEmployee(emp.id, { is_active: nextStatus });
    if (res) {
      setEmployees((prev) => prev.map((e) => (e.id === emp.id ? { ...e, is_active: nextStatus } : e)));
      addToast(
        `${emp.full_name} is now ${nextStatus ? 'Active' : 'Inactive'}`,
        nextStatus ? 'success' : 'info'
      );
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!formData.full_name.trim()) errs.full_name = 'Full name is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingEmployee) {
        const updated = await updateEmployee(editingEmployee.id, formData);
        setEmployees((prev) => prev.map((e) => (e.id === editingEmployee.id ? updated : e)));
        addToast(`Updated ${formData.full_name}`, 'success');
      } else {
        const created = await createEmployee(formData);
        setEmployees((prev) => [...prev, created]);
        addToast(`Added ${formData.full_name}`, 'success');
      }
      setIsModalOpen(false);
    } catch (e) {
      addToast('Failed to save employee record', 'error');
    } finally {
      setSaving(false);
    }
  }

  // Get assignments for selected employee in detail drawer
  const employeeAssignments = useMemo(() => {
    if (!viewingEmployee) return [];
    return assignments
      .filter((a) => a.employee_id === viewingEmployee.id && a.is_active)
      .map((a) => {
        const bp = bpMap.get(a.brand_process_id);
        const brand = bp ? brandMap.get(bp.brand_id) : null;
        const proc = bp ? processMap.get(bp.process_id) : null;
        return {
          ...a,
          brandName: brand?.name || 'Unknown Brand',
          processName: proc?.name || 'Unknown Process',
          processCode: proc?.code || 'CS',
          calendarRule: bp?.calendar_rule || '365_days',
          minStaff: bp?.min_staff || 1,
        };
      });
  }, [viewingEmployee, assignments, bpMap, brandMap, processMap]);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Employee Directory</h1>
          <p className="text-xs text-muted mt-1">
            Maintain employee profiles, pod attachments, and active status ({employees.length} total)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Employee</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-line bg-panel p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by employee name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Operational Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading employee records...</div>
        ) : filteredEmployees.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No employees found"
            description="Try modifying your search or pod filter criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Employee Name</th>
                  <th className="px-5 py-3.5">Operational Pod</th>
                  <th className="px-5 py-3.5">Role / Badge</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredEmployees.map((emp) => {
                  const pod = podMap.get(emp.pod_id);
                  const isLead = pod?.lead_employee_id === emp.id;
                  const isBackup = emp.full_name.toLowerCase().includes('kavya');

                  return (
                    <tr key={emp.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        <button
                          type="button"
                          onClick={() => setViewingEmployee(emp)}
                          className="hover:text-accent hover:underline flex items-center gap-1.5 text-left"
                        >
                          <span>{emp.full_name}</span>
                          <ExternalLink size={12} className="text-muted" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-muted">
                        {pod ? (
                          <span className="font-medium text-ink">{pod.name}</span>
                        ) : (
                          <span className="italic text-muted/80">Unassigned Pod</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {isLead ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            <Shield size={11} /> Pod Lead
                          </span>
                        ) : isBackup ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            Operational Float
                          </span>
                        ) : (
                          <span className="text-muted">Operations Staff</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={emp.is_active ? 'active' : 'inactive'} />
                      </td>
                      <td className="px-5 py-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(emp)}
                          className="p-1 rounded text-muted hover:text-ink hover:bg-canvas transition-colors"
                          title={emp.is_active ? 'Deactivate Employee' : 'Activate Employee'}
                        >
                          {emp.is_active ? <UserX size={15} /> : <UserCheck size={15} className="text-emerald-600" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1 rounded text-muted hover:text-accent hover:bg-canvas transition-colors"
                          title="Edit Employee"
                        >
                          <Edit2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Employee Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.full_name}` : 'Add New Employee'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Full Name
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="e.g. Maya Iyer"
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent focus:ring-1 focus:ring-accent"
            />
            {formErrors.full_name ? (
              <p className="mt-1 text-xs text-rose-600">{formErrors.full_name}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Assign to Operational Pod
            </label>
            <select
              value={formData.pod_id}
              onChange={(e) => setFormData({ ...formData, pod_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="">No Pod (Unassigned Float)</option>
              {pods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <label htmlFor="is_active" className="text-xs font-medium text-ink">
              Employee is active and available for scheduling
            </label>
          </div>

          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : editingEmployee ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Employee Details Modal */}
      <Modal
        isOpen={Boolean(viewingEmployee)}
        onClose={() => setViewingEmployee(null)}
        title={viewingEmployee ? viewingEmployee.full_name : ''}
        maxWidth="max-w-xl"
      >
        {viewingEmployee ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <p className="text-xs text-muted">Pod Attachment</p>
                <p className="text-sm font-semibold text-ink">
                  {podMap.get(viewingEmployee.pod_id)?.name || 'Unassigned Backup'}
                </p>
              </div>
              <StatusBadge status={viewingEmployee.is_active ? 'active' : 'inactive'} />
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted mb-2">
                Brand & Process Coverage Assignments ({employeeAssignments.length})
              </h4>
              {employeeAssignments.length === 0 ? (
                <p className="text-xs text-muted italic">
                  No active brand assignments. Available as backup or float resource.
                </p>
              ) : (
                <div className="space-y-2">
                  {employeeAssignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-lg border border-line bg-canvas/40 p-3 text-xs"
                    >
                      <div>
                        <p className="font-bold text-ink">{a.brandName}</p>
                        <p className="text-[11px] text-muted">
                          Process: {a.processName} ({a.processCode})
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                          {a.calendarRule}
                        </span>
                        {a.is_primary ? (
                          <p className="text-[10px] text-emerald-700 font-bold mt-1">★ Primary Assignee</p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
