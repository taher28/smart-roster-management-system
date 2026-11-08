import { useEffect, useState } from 'react';
import { Workflow, Plus, Edit2, Sliders, Shield, Info } from 'lucide-react';
import {
  getProcesses,
  getBrandProcesses,
  getBrands,
  updateBrandProcess,
} from '../lib/dataService.js';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function ProcessesPage() {
  const [processes, setProcesses] = useState([]);
  const [brandProcesses, setBrandProcesses] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit Brand Process Rule Modal
  const [editingBP, setEditingBP] = useState(null);
  const [formData, setFormData] = useState({
    min_staff: 1,
    calendar_rule: '365_days',
    shift_start: '09:00:00',
    shift_end: '18:00:00',
  });
  const [saving, setSaving] = useState(false);

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [procList, bpList, brandList] = await Promise.all([
        getProcesses(),
        getBrandProcesses(),
        getBrands(),
      ]);
      setProcesses(procList);
      setBrandProcesses(bpList);
      setBrands(brandList);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const brandMap = new Map(brands.map((b) => [b.id, b]));
  const procMap = new Map(processes.map((p) => [p.id, p]));

  function handleOpenEditBP(bp) {
    setEditingBP(bp);
    setFormData({
      min_staff: bp.min_staff || 1,
      calendar_rule: bp.calendar_rule || '365_days',
      shift_start: bp.shift_start || '09:00:00',
      shift_end: bp.shift_end || '18:00:00',
    });
  }

  async function handleSaveBP(e) {
    e.preventDefault();
    if (!editingBP) return;
    setSaving(true);
    try {
      const updated = await updateBrandProcess(editingBP.id, formData);
      setBrandProcesses((prev) => prev.map((bp) => (bp.id === editingBP.id ? updated : bp)));
      addToast('Brand-process operating rule updated successfully', 'success');
      setEditingBP(null);
    } catch (err) {
      addToast('Failed to update rule', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Operational Processes</h1>
        <p className="text-xs text-muted mt-1">
          4 standard operational workflows. Configure client-specific operating calendars, shifts, and minimum staffing.
        </p>
      </div>

      {/* 4 Process Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {processes.map((proc) => {
          const bpCount = brandProcesses.filter((bp) => bp.process_id === proc.id && bp.is_active).length;
          return (
            <div
              key={proc.id}
              className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-accent-soft px-2.5 py-1 text-xs font-bold text-accent font-mono">
                  {proc.code}
                </span>
                <span className="text-[11px] font-semibold text-muted">
                  {bpCount} Accounts
                </span>
              </div>
              <div>
                <h3 className="text-sm font-bold text-ink">{proc.name}</h3>
                <p className="text-xs text-muted mt-1 line-clamp-2 leading-relaxed">
                  {proc.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Brand-Process Operating Rules Configuration Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-ink">Client Operating Calendars & Rules</h2>
            <p className="text-xs text-muted">
              Different processes under the same brand may operate on independent calendars
            </p>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-line bg-panel shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-canvas/60 text-muted uppercase font-semibold text-[11px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Brand</th>
                  <th className="px-5 py-3.5">Process</th>
                  <th className="px-5 py-3.5">Operating Calendar</th>
                  <th className="px-5 py-3.5">Min Staffing</th>
                  <th className="px-5 py-3.5">Shift Window</th>
                  <th className="px-5 py-3.5 text-right">Configure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {brandProcesses.map((bp) => {
                  const brand = brandMap.get(bp.brand_id);
                  const proc = procMap.get(bp.process_id);

                  let calendarLabel = '365 Days (Always Open)';
                  let calColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
                  if (bp.calendar_rule === 'no_holidays') {
                    calendarLabel = 'Daily (Holidays Off)';
                    calColor = 'bg-amber-50 text-amber-800 border-amber-200';
                  } else if (bp.calendar_rule === 'no_sundays_holidays') {
                    calendarLabel = 'Mon-Sat (Sun & Holidays Off)';
                    calColor = 'bg-slate-100 text-slate-800 border-slate-200';
                  }

                  return (
                    <tr key={bp.id} className="hover:bg-canvas/30 transition-colors">
                      <td className="px-5 py-3 font-semibold text-ink">
                        {brand?.name || 'Brand'}
                      </td>
                      <td className="px-5 py-3 font-medium text-accent font-mono">
                        {proc?.code || 'CS'} - {proc?.name}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${calColor}`}>
                          {calendarLabel}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span className="font-bold text-ink">{bp.min_staff}</span>
                        <span className="text-muted ml-1">staff required</span>
                      </td>
                      <td className="px-5 py-3 font-mono text-muted text-[11px]">
                        {bp.shift_start?.slice(0, 5)} - {bp.shift_end?.slice(0, 5)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBP(bp)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-muted hover:text-ink hover:bg-canvas transition-colors"
                        >
                          <Sliders size={13} />
                          <span>Configure</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Configure BP Modal */}
      <Modal
        isOpen={Boolean(editingBP)}
        onClose={() => setEditingBP(null)}
        title="Configure Brand-Process Operating Rules"
      >
        {editingBP ? (
          <form onSubmit={handleSaveBP} className="space-y-4">
            <div>
              <p className="text-xs text-muted">Brand & Process</p>
              <p className="text-sm font-bold text-ink mt-0.5">
                {brandMap.get(editingBP.brand_id)?.name} — {procMap.get(editingBP.process_id)?.name} ({procMap.get(editingBP.process_id)?.code})
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Operating Calendar Rule
              </label>
              <select
                value={formData.calendar_rule}
                onChange={(e) => setFormData({ ...formData, calendar_rule: e.target.value })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              >
                <option value="365_days">365-Day Operations (Including Sundays & Public Holidays)</option>
                <option value="no_holidays">Daily Operations with Public Holidays Off</option>
                <option value="no_sundays_holidays">Sundays and Public Holidays Off (Mon-Sat)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Minimum Staffing (Headcount per open day)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={formData.min_staff}
                onChange={(e) => setFormData({ ...formData, min_staff: parseInt(e.target.value) || 1 })}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Shift Start
                </label>
                <input
                  type="time"
                  value={formData.shift_start}
                  onChange={(e) => setFormData({ ...formData, shift_start: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Shift End
                </label>
                <input
                  type="time"
                  value={formData.shift_end}
                  onChange={(e) => setFormData({ ...formData, shift_end: e.target.value })}
                  className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingBP(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
