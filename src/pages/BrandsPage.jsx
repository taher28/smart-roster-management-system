import { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  Search,
  Plus,
  Edit2,
  Calendar,
  Users,
  CheckCircle2,
  Workflow,
  Sparkles,
} from 'lucide-react';
import {
  getBrands,
  createBrand,
  updateBrand,
  getPods,
  getBrandProcesses,
  getProcesses,
  getAssignments,
  getEmployees,
} from '../lib/dataService.js';
import { StatusBadge, EmptyState } from '../components/common/StatusBadge.jsx';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function BrandsPage() {
  const [brands, setBrands] = useState([]);
  const [pods, setPods] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedPod, setSelectedPod] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '', pod_id: '', is_active: true });
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Detail Modal
  const [viewingBrand, setViewingBrand] = useState(null);

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [brandList, podList, bpList, procList, assignList, empList] = await Promise.all([
        getBrands(),
        getPods(),
        getBrandProcesses(),
        getProcesses(),
        getAssignments(),
        getEmployees(),
      ]);
      setBrands(brandList);
      setPods(podList);
      setBrandProcesses(bpList);
      setProcesses(procList);
      setAssignments(assignList);
      setEmployees(empList);
    } catch (e) {
      console.error('Failed to load brands:', e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const podMap = useMemo(() => new Map(pods.map((p) => [p.id, p])), [pods]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Aggregate brand details (assigned employees and processes)
  const enrichedBrands = useMemo(() => {
    return brands.map((b) => {
      const bps = brandProcesses.filter((bp) => bp.brand_id === b.id && bp.is_active);
      const bpIds = new Set(bps.map((bp) => bp.id));
      const assigns = assignments.filter((a) => bpIds.has(a.brand_process_id) && a.is_active);
      const distinctEmpIds = Array.from(new Set(assigns.map((a) => a.employee_id)));
      const isMulti = distinctEmpIds.length >= 2;

      return {
        ...b,
        bps,
        assignedEmployees: distinctEmpIds.map((id) => empMap.get(id)).filter(Boolean),
        isMulti,
      };
    });
  }, [brands, brandProcesses, assignments, empMap]);

  const filteredBrands = useMemo(() => {
    return enrichedBrands.filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(search.toLowerCase());
      const matchesPod = selectedPod === 'ALL' || b.pod_id === selectedPod;
      const matchesType =
        selectedType === 'ALL' ||
        (selectedType === 'SINGLE' && !b.isMulti) ||
        (selectedType === 'MULTI' && b.isMulti);

      return matchesSearch && matchesPod && matchesType;
    });
  }, [enrichedBrands, search, selectedPod, selectedType]);

  function handleOpenAdd() {
    setEditingBrand(null);
    setFormData({ name: '', pod_id: pods[0]?.id || '', is_active: true });
    setFormErrors({});
    setIsModalOpen(true);
  }

  function handleOpenEdit(b) {
    setEditingBrand(b);
    setFormData({ name: b.name, pod_id: b.pod_id || '', is_active: b.is_active });
    setFormErrors({});
    setIsModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Brand name is required';
    setFormErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setSaving(true);
    try {
      if (editingBrand) {
        const updated = await updateBrand(editingBrand.id, formData);
        setBrands((prev) => prev.map((b) => (b.id === editingBrand.id ? updated : b)));
        addToast(`Updated ${formData.name}`, 'success');
      } else {
        const created = await createBrand(formData);
        setBrands((prev) => [...prev, created]);
        addToast(`Added ${formData.name}`, 'success');
      }
      setIsModalOpen(false);
    } catch (e) {
      addToast('Failed to save brand', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Managed Brands</h1>
          <p className="text-xs text-muted mt-1">
            22 D2C Partner brands (18 single-resource & 4 multi-resource accounts)
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors self-start sm:self-auto"
        >
          <Plus size={16} />
          <span>Add Brand</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="rounded-xl border border-line bg-panel p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search brands by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Pods</option>
            {pods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Types</option>
            <option value="SINGLE">Single-Resource (80%)</option>
            <option value="MULTI">Multi-Resource (3 staff)</option>
          </select>
        </div>
      </div>

      {/* Brands Grid */}
      {loading ? (
        <div className="p-8 text-center text-xs text-muted">Loading brands...</div>
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No brands found"
          description="Try adjusting your search criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBrands.map((brand) => {
            const pod = podMap.get(brand.pod_id);
            return (
              <div
                key={brand.id}
                className="rounded-xl border border-line bg-panel p-5 shadow-2xs hover:border-accent/40 transition-all flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-ink">{brand.name}</h3>
                      <p className="text-[11px] text-muted mt-0.5">{pod?.name || 'Unassigned Pod'}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {brand.isMulti ? (
                        <span className="rounded-full bg-indigo-50 border border-indigo-200 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                          Multi-Resource
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          Single-Resource
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Processes and Calendars */}
                  <div className="mt-4 space-y-2">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Operating Processes ({brand.bps.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {brand.bps.map((bp) => {
                        const proc = procMap.get(bp.process_id);
                        return (
                          <span
                            key={bp.id}
                            className="inline-flex items-center gap-1 rounded bg-accent-soft px-2 py-0.5 text-[10px] font-semibold text-accent"
                          >
                            <span>{proc?.code || 'CS'}</span>
                            <span className="text-[9px] text-muted/80">({bp.calendar_rule})</span>
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Assigned Team */}
                  <div className="mt-3">
                    <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                      Assigned Specialists ({brand.assignedEmployees.length})
                    </p>
                    <p className="text-xs text-ink mt-1 font-medium">
                      {brand.assignedEmployees.map((e) => e.full_name).join(', ') || (
                        <span className="italic text-rose-600">Unstaffed</span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                  <StatusBadge status={brand.is_active ? 'active' : 'inactive'} />
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(brand)}
                    className="p-1 rounded text-muted hover:text-accent hover:bg-canvas transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Brand Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBrand ? `Edit Brand: ${editingBrand.name}` : 'Add Partner Brand'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Brand Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Zenith Living"
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            />
            {formErrors.name ? (
              <p className="mt-1 text-xs text-rose-600">{formErrors.name}</p>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
              Pod Assignment
            </label>
            <select
              value={formData.pod_id}
              onChange={(e) => setFormData({ ...formData, pod_id: e.target.value })}
              className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
            >
              <option value="">No Pod</option>
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
              id="brand_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="rounded border-line text-accent focus:ring-accent"
            />
            <label htmlFor="brand_active" className="text-xs font-medium text-ink">
              Brand is currently active and requires coverage
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
              {saving ? 'Saving...' : editingBrand ? 'Save Changes' : 'Create Brand'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
