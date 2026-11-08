import { useEffect, useState, useMemo } from 'react';
import {
  Link2,
  Plus,
  Trash2,
  Search,
  Star,
  Building2,
  Workflow,
  CheckCircle2,
  AlertCircle,
  Filter,
} from 'lucide-react';
import {
  getAssignments,
  createAssignment,
  deleteAssignment,
  getEmployees,
  getBrands,
  getBrandProcesses,
  getProcesses,
} from '../lib/dataService.js';
import Modal from '../components/common/Modal.jsx';
import { EmptyState } from '../components/common/StatusBadge.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedBrandFilter, setSelectedBrandFilter] = useState('ALL');

  // Add Assignment Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    employee_id: '',
    brand_process_id: '',
    is_primary: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [assignList, empList, brandList, bpList, procList] = await Promise.all([
        getAssignments(),
        getEmployees(),
        getBrands(),
        getBrandProcesses(),
        getProcesses(),
      ]);
      setAssignments(assignList);
      setEmployees(empList);
      setBrands(brandList);
      setBrandProcesses(bpList);
      setProcesses(procList);
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
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const bpMap = useMemo(() => new Map(brandProcesses.map((bp) => [bp.id, bp])), [brandProcesses]);

  // Enriched assignments
  const enrichedAssignments = useMemo(() => {
    return assignments.map((a) => {
      const emp = empMap.get(a.employee_id);
      const bp = bpMap.get(a.brand_process_id);
      const brand = bp ? brandMap.get(bp.brand_id) : null;
      const proc = bp ? procMap.get(bp.process_id) : null;
      return {
        ...a,
        employeeName: emp?.full_name || 'Unknown Employee',
        brandName: brand?.name || 'Unknown Brand',
        brandId: brand?.id,
        processName: proc?.name || 'Customer Support',
        processCode: proc?.code || 'CS',
        calendarRule: bp?.calendar_rule || '365_days',
      };
    });
  }, [assignments, empMap, bpMap, brandMap, procMap]);

  const filteredAssignments = useMemo(() => {
    return enrichedAssignments.filter((a) => {
      const matchesSearch =
        a.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        a.brandName.toLowerCase().includes(search.toLowerCase()) ||
        a.processCode.toLowerCase().includes(search.toLowerCase());

      const matchesBrand = selectedBrandFilter === 'ALL' || a.brandId === selectedBrandFilter;
      return matchesSearch && matchesBrand;
    });
  }, [enrichedAssignments, search, selectedBrandFilter]);

  function handleOpenAdd() {
    setFormData({
      employee_id: employees[0]?.id || '',
      brand_process_id: brandProcesses[0]?.id || '',
      is_primary: true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!formData.employee_id) errs.employee_id = 'Select an employee';
    if (!formData.brand_process_id) errs.brand_process_id = 'Select a brand-process';

    // Duplicate Assignment Prevention
    const duplicate = assignments.some(
      (a) =>
        a.employee_id === formData.employee_id &&
        a.brand_process_id === formData.brand_process_id &&
        a.is_active
    );
    if (duplicate) {
      errs.duplicate = 'This employee is already assigned to this brand process.';
    }

    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      const created = await createAssignment(formData);
      setAssignments((prev) => [...prev, created]);
      addToast('Assignment created successfully', 'success');
      setIsModalOpen(false);
    } catch (err) {
      addToast('Failed to create assignment', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id, empName, brandName) {
    if (!window.confirm(`Remove assignment for ${empName} on ${brandName}?`)) return;
    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      addToast(`Assignment removed`, 'info');
    } catch (err) {
      addToast('Failed to remove assignment', 'error');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Resource Allocations</h1>
          <p className="text-xs text-muted mt-1">
            Link employees to brands and processes. Supports multiple process coverage and primary flags.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Assignment</span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="rounded-xl border border-line bg-panel p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search by employee, brand, or process..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent"
          />
        </div>

        <select
          value={selectedBrandFilter}
          onChange={(e) => setSelectedBrandFilter(e.target.value)}
          className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
        >
          <option value="ALL">All Brands ({brands.length})</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>

      {/* Assignments Table */}
      <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted">Loading assignments...</div>
        ) : filteredAssignments.length === 0 ? (
          <EmptyState
            icon={Link2}
            title="No assignments found"
            description="Add an assignment or adjust filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Assigned Employee</th>
                  <th className="px-5 py-3.5">Brand</th>
                  <th className="px-5 py-3.5">Process</th>
                  <th className="px-5 py-3.5">Responsibility</th>
                  <th className="px-5 py-3.5">Operating Calendar</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredAssignments.map((a) => (
                  <tr key={a.id} className="hover:bg-canvas/30 transition-colors">
                    <td className="px-5 py-3 font-semibold text-ink">
                      {a.employeeName}
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">
                      {a.brandName}
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-accent">
                      {a.processCode}
                      <span className="font-normal text-muted font-sans ml-1.5">({a.processName})</span>
                    </td>
                    <td className="px-5 py-3">
                      {a.is_primary ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          <Star size={10} className="fill-emerald-600 text-emerald-600" /> Primary Assignee
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700">
                          Secondary / Cross-Process
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted">
                      <span className="rounded bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                        {a.calendarRule}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleDelete(a.id, a.employeeName, a.brandName)}
                        className="p-1 rounded text-muted hover:text-rose-600 hover:bg-canvas transition-colors"
                        title="Remove Assignment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Assignment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Assignment"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {formErrors.duplicate ? (
            <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0 text-rose-600" />
              <span>{formErrors.duplicate}</span>
            </div>
          ) : null}

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Select Employee
            </label>
            <select
              value={formData.employee_id}
              onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
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
              Select Brand & Process
            </label>
            <select
              value={formData.brand_process_id}
              onChange={(e) => setFormData({ ...formData, brand_process_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              {brandProcesses.map((bp) => {
                const brand = brandMap.get(bp.brand_id);
                const proc = procMap.get(bp.process_id);
                return (
                  <option key={bp.id} value={bp.id}>
                    {brand?.name} — {proc?.name} ({proc?.code}) [{bp.calendar_rule}]
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <label htmlFor="is_primary" className="text-xs font-medium text-ink">
              Designate as Primary Assignee for this process
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
              {saving ? 'Creating...' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
