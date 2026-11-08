import { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Filter,
  Calendar,
  Building2,
  Users,
  Lightbulb,
  Search,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import {
  getRosterVersions,
  getRosterVersionDetails,
  getBrands,
  getProcesses,
  getEmployees,
} from '../lib/dataService.js';
import { EmptyState, StatusBadge } from '../components/common/StatusBadge.jsx';
import { Link } from 'react-router-dom';

export default function ConflictsPage() {
  const [versions, setVersions] = useState([]);
  const [selectedVersionId, setSelectedVersionId] = useState('');
  const [conflicts, setConflicts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [processes, setProcesses] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [codeFilter, setCodeFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  async function loadData() {
    setLoading(true);
    try {
      const [vList, bList, pList, empList] = await Promise.all([
        getRosterVersions(),
        getBrands(),
        getProcesses(),
        getEmployees(),
      ]);

      setVersions(vList);
      setBrands(bList);
      setProcesses(pList);
      setEmployees(empList);

      if (vList.length > 0) {
        setSelectedVersionId(vList[0].id);
        const details = await getRosterVersionDetails(vList[0].id);
        setConflicts(details.conflicts || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleVersionChange(vId) {
    setSelectedVersionId(vId);
    setLoading(true);
    try {
      const details = await getRosterVersionDetails(vId);
      setConflicts(details.conflicts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const brandMap = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const procMap = useMemo(() => new Map(processes.map((p) => [p.id, p])), [processes]);
  const empMap = useMemo(() => new Map(employees.map((e) => [e.id, e])), [employees]);

  // Distinct conflict codes for filter dropdown
  const conflictCodes = useMemo(() => {
    return Array.from(new Set(conflicts.map((c) => c.code)));
  }, [conflicts]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter((c) => {
      const matchesSeverity = severityFilter === 'ALL' || c.severity === severityFilter;
      const matchesCode = codeFilter === 'ALL' || c.code === codeFilter;
      const matchesSearch =
        (c.explanation || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.brand_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.recommendation || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.work_date || '').includes(search);

      return matchesSeverity && matchesCode && matchesSearch;
    });
  }, [conflicts, severityFilter, codeFilter, search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-ink">Conflict Detection Engine</h1>
            <span className="rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-800">
              {conflicts.length} Issues Detected
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Algorithmic audit of staffing shortfalls, leave clashes, weekly-off overlaps, and operational deficits.
          </p>
        </div>

        {/* Version Switcher */}
        {versions.length > 0 ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted">Snapshot:</span>
            <select
              value={selectedVersionId}
              onChange={(e) => handleVersionChange(e.target.value)}
              className="rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-bold text-ink focus:border-accent"
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  Version {v.version_number} ({v.roster_month})
                </option>
              ))}
            </select>
          </div>
        ) : null}
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-xl border border-line bg-panel p-4 shadow-2xs space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Search conflicts by brand, date, or keyword..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-line bg-canvas/50 pl-9 pr-4 py-2 text-xs text-ink placeholder:text-muted focus:border-accent"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Severities</option>
            <option value="critical">Critical Only</option>
            <option value="warning">Warning Only</option>
            <option value="info">Info Only</option>
          </select>

          <select
            value={codeFilter}
            onChange={(e) => setCodeFilter(e.target.value)}
            className="rounded-lg border border-line bg-canvas/50 px-3 py-2 text-xs font-medium text-ink focus:border-accent"
          >
            <option value="ALL">All Failure Modes</option>
            {conflictCodes.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, ' ')}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conflicts List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-muted">Analyzing roster constraints...</div>
      ) : filteredConflicts.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Zero scheduling conflicts detected"
          description="All open brand-processes satisfy minimum staffing, calendar rules, and employee availability constraints."
          action={
            <Link
              to="/roster"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <span>View Published Roster</span>
              <ArrowRight size={14} />
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {filteredConflicts.map((c, index) => {
            const isCritical = c.severity === 'critical';
            return (
              <div
                key={index}
                className={`rounded-xl border p-5 shadow-2xs space-y-3 transition-colors ${
                  isCritical ? 'border-rose-200 bg-panel' : 'border-amber-200 bg-panel'
                }`}
              >
                {/* Header line */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold uppercase ${
                        isCritical
                          ? 'bg-rose-100 text-rose-800 border border-rose-300'
                          : 'bg-amber-100 text-amber-800 border border-amber-300'
                      }`}
                    >
                      <AlertTriangle size={12} />
                      <span>{c.code.replace(/_/g, ' ')}</span>
                    </span>
                    <span className="font-mono text-xs font-bold text-ink">{c.work_date}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-muted">
                    <span className="font-semibold text-ink">
                      {c.brand_name || brandMap.get(c.brand_id)?.name || 'Account'}
                    </span>
                    <span>•</span>
                    <span className="font-mono text-accent font-bold">
                      {c.process_name || 'Process'}
                    </span>
                  </div>
                </div>

                {/* Quantitative Metric Strip */}
                <div className="grid grid-cols-3 gap-3 rounded-lg border border-line bg-canvas/40 p-3 text-xs">
                  <div>
                    <p className="text-[10px] text-muted uppercase font-bold">Required Staff</p>
                    <p className="font-extrabold text-ink text-sm mt-0.5">{c.required_staff ?? 1}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase font-bold">Available Qualified</p>
                    <p className="font-extrabold text-ink text-sm mt-0.5">{c.available_staff ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted uppercase font-bold">Currently Scheduled</p>
                    <p className={`font-extrabold text-sm mt-0.5 ${c.assigned_staff === 0 ? 'text-rose-700' : 'text-amber-700'}`}>
                      {c.assigned_staff ?? 0}
                    </p>
                  </div>
                </div>

                {/* Substantive Reason */}
                <div>
                  <p className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Root Cause Diagnosis
                  </p>
                  <p className="text-xs font-medium text-ink mt-0.5 leading-relaxed">
                    {c.explanation}
                  </p>
                </div>

                {/* Suggested Actionable Resolution */}
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-3 flex items-start gap-2.5 text-xs text-emerald-950">
                  <Lightbulb size={16} className="text-emerald-700 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-emerald-900">Suggested Algorithmic Resolution:</p>
                    <p className="mt-0.5 leading-relaxed text-emerald-900/90">{c.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
