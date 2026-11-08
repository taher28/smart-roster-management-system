import { useEffect, useState, useMemo } from 'react';
import { Network, Users, Shield, Plus, Building2, UserPlus, UserMinus, CheckCircle2 } from 'lucide-react';
import {
  getPods,
  getEmployees,
  getBrands,
  updatePodLead,
  updateEmployee,
} from '../lib/dataService.js';
import Modal from '../components/common/Modal.jsx';
import { useToast } from '../components/common/Toast.jsx';

export default function PodsPage() {
  const [pods, setPods] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);

  // Lead Change Modal
  const [editingPod, setEditingPod] = useState(null);
  const [selectedLeadId, setSelectedLeadId] = useState('');

  // Add Member Modal
  const [memberPod, setMemberPod] = useState(null);
  const [selectedMemberId, setSelectedMemberId] = useState('');

  const { addToast } = useToast();

  async function loadData() {
    setLoading(true);
    try {
      const [podList, empList, brandList] = await Promise.all([
        getPods(),
        getEmployees(),
        getBrands(),
      ]);
      setPods(podList);
      setEmployees(empList);
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

  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  async function handleSaveLead(e) {
    e.preventDefault();
    if (!editingPod) return;
    try {
      await updatePodLead(editingPod.id, selectedLeadId || null);
      setPods((prev) =>
        prev.map((p) => (p.id === editingPod.id ? { ...p, lead_employee_id: selectedLeadId || null } : p))
      );
      addToast(`Updated Pod Lead for ${editingPod.name}`, 'success');
      setEditingPod(null);
    } catch (err) {
      addToast('Failed to update pod lead', 'error');
    }
  }

  async function handleAddMember(e) {
    e.preventDefault();
    if (!memberPod || !selectedMemberId) return;
    try {
      await updateEmployee(selectedMemberId, { pod_id: memberPod.id });
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === selectedMemberId ? { ...emp, pod_id: memberPod.id } : emp))
      );
      addToast(`Added employee to ${memberPod.name}`, 'success');
      setMemberPod(null);
      setSelectedMemberId('');
    } catch (err) {
      addToast('Failed to add member', 'error');
    }
  }

  async function handleRemoveMember(employeeId, podName) {
    try {
      await updateEmployee(employeeId, { pod_id: null });
      setEmployees((prev) =>
        prev.map((emp) => (emp.id === employeeId ? { ...emp, pod_id: null } : emp))
      );
      addToast(`Removed employee from ${podName}`, 'info');
    } catch (err) {
      addToast('Failed to remove member', 'error');
    }
  }

  // Unassigned employees available to add to a pod
  const unassignedEmployees = useMemo(() => {
    return employees.filter((e) => !e.pod_id && e.is_active);
  }, [employees]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Operational Pods</h1>
        <p className="text-xs text-muted mt-1">
          4 organizational pods managing specialized cross-functional brand portfolios and pod leads.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {pods.map((pod) => {
          const lead = empMap.get(pod.lead_employee_id);
          const members = employees.filter((e) => e.pod_id === pod.id);
          const podBrands = brands.filter((b) => b.pod_id === pod.id && b.is_active);

          return (
            <div
              key={pod.id}
              className="rounded-2xl border border-line bg-panel p-6 shadow-2xs space-y-5 flex flex-col justify-between"
            >
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-ink">{pod.name}</h2>
                    <p className="text-xs text-muted mt-0.5">
                      {members.length} team members · {podBrands.length} partner brands
                    </p>
                  </div>
                  <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent flex items-center gap-1">
                    <CheckCircle2 size={12} /> Active Pod
                  </span>
                </div>

                {/* Pod Lead Box */}
                <div className="rounded-xl border border-line bg-canvas/40 p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700">
                      <Shield size={18} />
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        Pod Lead
                      </p>
                      <p className="text-sm font-bold text-ink">
                        {lead ? lead.full_name : <span className="italic text-rose-600">Unassigned Lead</span>}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPod(pod);
                      setSelectedLeadId(pod.lead_employee_id || '');
                    }}
                    className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink hover:bg-canvas transition-colors"
                  >
                    Change Lead
                  </button>
                </div>

                {/* Team Members List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-muted uppercase tracking-wider">
                      Pod Members ({members.length})
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setMemberPod(pod);
                        setSelectedMemberId(unassignedEmployees[0]?.id || '');
                      }}
                      className="text-xs font-semibold text-accent hover:underline flex items-center gap-1"
                    >
                      <UserPlus size={13} />
                      <span>Add Specialist</span>
                    </button>
                  </div>

                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {members.map((emp) => (
                      <div
                        key={emp.id}
                        className="flex items-center justify-between rounded-lg border border-line/60 bg-panel px-3 py-2 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-ink">{emp.full_name}</span>
                          {emp.id === pod.lead_employee_id ? (
                            <span className="text-[10px] font-bold text-indigo-600">(Lead)</span>
                          ) : null}
                          {!emp.is_active ? (
                            <span className="text-[10px] text-rose-600 italic">(Inactive)</span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(emp.id, pod.name)}
                          className="text-muted hover:text-rose-600 transition-colors p-1"
                          title="Remove from pod"
                        >
                          <UserMinus size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Assigned Brands */}
                <div>
                  <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2">
                    Managed Brands ({podBrands.length})
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {podBrands.map((b) => (
                      <span
                        key={b.id}
                        className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] font-medium text-ink"
                      >
                        <Building2 size={12} className="text-muted" />
                        <span>{b.name}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Change Pod Lead Modal */}
      <Modal
        isOpen={Boolean(editingPod)}
        onClose={() => setEditingPod(null)}
        title={editingPod ? `Change Lead for ${editingPod.name}` : ''}
      >
        {editingPod ? (
          <form onSubmit={handleSaveLead} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                Select Active Pod Lead
              </label>
              <select
                value={selectedLeadId}
                onChange={(e) => setSelectedLeadId(e.target.value)}
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
              >
                <option value="">-- No Lead Assigned --</option>
                {employees
                  .filter((e) => e.is_active)
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
              </select>
            </div>
            <div className="pt-4 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingPod(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors"
              >
                Save Pod Lead
              </button>
            </div>
          </form>
        ) : null}
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={Boolean(memberPod)}
        onClose={() => setMemberPod(null)}
        title={memberPod ? `Add Specialist to ${memberPod.name}` : ''}
      >
        {memberPod ? (
          <form onSubmit={handleAddMember} className="space-y-4">
            {unassignedEmployees.length === 0 ? (
              <p className="text-xs text-muted italic">
                All active employees are already assigned to operational pods.
              </p>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider">
                  Select Unassigned Specialist
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3 py-2 text-xs text-ink focus:border-accent"
                >
                  <option value="">-- Choose Specialist --</option>
                  {unassignedEmployees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.full_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="pt-4 border-t border-line flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setMemberPod(null)}
                className="rounded-lg border border-line px-4 py-2 text-xs font-medium text-ink hover:bg-canvas"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedMemberId}
                className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
