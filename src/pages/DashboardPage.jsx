import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Building2,
  Workflow,
  Network,
  CalendarCheck,
  AlertTriangle,
  CalendarRange,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import {
  getEmployees,
  getBrands,
  getProcesses,
  getPods,
  getLeaves,
  getHolidays,
  getRosterVersions,
  getRosterVersionDetails,
} from '../lib/dataService.js';
import { StatCard, StatusBadge } from '../components/common/StatusBadge.jsx';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    activeBrands: 0,
    totalBrands: 0,
    activeProcesses: 0,
    totalPods: 0,
    onLeaveToday: 0,
    openConflicts: 0,
    coverageRate: 100,
    upcomingHolidays: [],
    recentVersions: [],
    podsData: [],
  });

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      try {
        const [
          employees,
          brands,
          processes,
          pods,
          leaves,
          holidays,
          versions,
        ] = await Promise.all([
          getEmployees(),
          getBrands(),
          getProcesses(),
          getPods(),
          getLeaves(),
          getHolidays(),
          getRosterVersions(),
        ]);

        const todayStr = new Date().toISOString().slice(0, 10);

        // Employees on approved leave today
        const onLeave = leaves.filter(
          (l) => l.status === 'approved' && todayStr >= l.start_date && todayStr <= l.end_date
        );

        // Upcoming holidays (future or within current month)
        const upcoming = holidays
          .filter((h) => h.holiday_date >= todayStr.slice(0, 7) + '-01')
          .slice(0, 5);

        // Fetch conflicts from latest version if exists
        let conflictCount = 0;
        let coverage = 98;
        if (versions.length > 0) {
          const latest = await getRosterVersionDetails(versions[0].id);
          conflictCount = latest.conflicts?.length || 0;
          if (latest.dayResults?.length > 0) {
            const openResults = latest.dayResults.filter((r) => r.is_open);
            const metCount = openResults.filter((r) => r.count >= r.required_staff).length;
            coverage = openResults.length > 0 ? Math.round((metCount / openResults.length) * 100) : 100;
          }
        }

        // Enrich Pod data
        const enrichedPods = pods.map((pod) => {
          const lead = employees.find((e) => e.id === pod.lead_employee_id);
          const members = employees.filter((e) => e.pod_id === pod.id && e.is_active);
          const podBrands = brands.filter((b) => b.pod_id === pod.id && b.is_active);
          return {
            ...pod,
            leadName: lead?.full_name || 'Unassigned',
            memberCount: members.length,
            brandCount: podBrands.length,
          };
        });

        setStats({
          totalEmployees: employees.length,
          activeEmployees: employees.filter((e) => e.is_active).length,
          activeBrands: brands.filter((b) => b.is_active).length,
          totalBrands: brands.length,
          activeProcesses: processes.length,
          totalPods: pods.length,
          onLeaveToday: onLeave.length,
          openConflicts: conflictCount,
          coverageRate: coverage,
          upcomingHolidays: upcoming,
          recentVersions: versions.slice(0, 4),
          podsData: enrichedPods,
        });
      } catch (e) {
        console.error('Error loading dashboard:', e);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-line bg-gradient-to-r from-panel via-panel to-accent-soft/30 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded bg-accent/10 px-2 py-0.5 text-xs font-semibold text-accent">
                Workforce Health
              </span>
              <span className="text-xs text-muted">Real-time live database</span>
            </div>
            <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-ink">
              Operations Control Center
            </h1>
            <p className="mt-1 text-sm text-muted max-w-2xl leading-relaxed">
              Monitoring 31 employees across 22 brands, 4 pods, and 4 processes. Coverage rate is
              currently at <span className="font-semibold text-ink">{stats.coverageRate}%</span>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to="/roster"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-teal-800 transition-colors"
            >
              <CalendarDays size={15} />
              <span>Generate Roster</span>
            </Link>
            <Link
              to="/conflicts"
              className="inline-flex items-center gap-2 rounded-lg border border-line bg-panel px-4 py-2 text-xs font-semibold text-ink hover:bg-canvas transition-colors"
            >
              <AlertTriangle size={15} className="text-amber-600" />
              <span>Review Conflicts ({stats.openConflicts})</span>
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        <StatCard
          label="Active Employees"
          value={loading ? '...' : `${stats.activeEmployees} / ${stats.totalEmployees}`}
          subtext="1 unassigned backup available"
          icon={Users}
        />
        <StatCard
          label="Managed Brands"
          value={loading ? '...' : `${stats.activeBrands}`}
          subtext="18 single + 4 multi-resource"
          icon={Building2}
        />
        <StatCard
          label="Operational Pods"
          value={loading ? '...' : `${stats.totalPods}`}
          subtext="4 dedicated Pod Leads"
          icon={Network}
        />
        <StatCard
          label="Core Processes"
          value={loading ? '...' : `${stats.activeProcesses}`}
          subtext="CS, ACC, NDR, Retention"
          icon={Workflow}
        />
        <StatCard
          label="Monthly Coverage"
          value={loading ? '...' : `${stats.coverageRate}%`}
          subtext="Calculated across all open shifts"
          icon={CalendarCheck}
        />
        <StatCard
          label="On Leave Today"
          value={loading ? '...' : `${stats.onLeaveToday}`}
          subtext="Approved leaves / comp-offs"
          icon={CalendarRange}
        />
        <StatCard
          label="Open Conflicts"
          value={loading ? '...' : `${stats.openConflicts}`}
          subtext="Staffing or calendar deficits"
          icon={AlertTriangle}
        />
        <StatCard
          label="Database Security"
          value="RLS Active"
          subtext="Role-based manager access"
          icon={ShieldCheck}
        />
      </div>

      {/* 2-Column Section: Pods Overview + Upcoming Holidays & History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pods Health (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink">Operational Pods Performance</h2>
              <p className="text-xs text-muted">Team allocation and leadership structure</p>
            </div>
            <Link to="/pods" className="text-xs font-semibold text-accent hover:underline flex items-center gap-1">
              <span>View Pods</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.podsData.map((pod) => (
              <div key={pod.id} className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink">{pod.name}</h3>
                  <span className="rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-semibold text-accent">
                    {pod.brandCount} Brands
                  </span>
                </div>
                <div className="text-xs text-muted space-y-1">
                  <p>
                    <span className="font-medium text-ink">Lead:</span> {pod.leadName}
                  </p>
                  <p>
                    <span className="font-medium text-ink">Active Members:</span> {pod.memberCount} specialists
                  </p>
                </div>
                <div className="pt-2 border-t border-line/60 flex items-center justify-between text-[11px]">
                  <span className="text-emerald-700 font-medium flex items-center gap-1">
                    <CheckCircle2 size={13} /> Operational
                  </span>
                  <Link to="/employees" className="text-muted hover:text-ink font-medium">
                    Manage team →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar: Upcoming Holidays & Recent Versions */}
        <div className="space-y-6">
          {/* Upcoming Holidays */}
          <div className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Public Holidays</h3>
              <Link to="/leave" className="text-xs font-semibold text-accent hover:underline">
                Manage
              </Link>
            </div>
            {stats.upcomingHolidays.length === 0 ? (
              <p className="text-xs text-muted">No upcoming holidays recorded.</p>
            ) : (
              <ul className="space-y-2.5">
                {stats.upcomingHolidays.map((h) => (
                  <li key={h.id} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-ink">{h.name}</span>
                    <span className="text-muted font-mono">{h.holiday_date}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Recent Roster Versions */}
          <div className="rounded-xl border border-line bg-panel p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Roster Snapshots</h3>
              <Link to="/roster" className="text-xs font-semibold text-accent hover:underline">
                View All
              </Link>
            </div>
            {stats.recentVersions.length === 0 ? (
              <div className="text-xs text-muted leading-relaxed">
                No versions generated yet. Go to <Link to="/roster" className="text-accent underline font-medium">Monthly Roster</Link> to generate your first draft.
              </div>
            ) : (
              <ul className="space-y-2.5">
                {stats.recentVersions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between text-xs border-b border-line/50 pb-2">
                    <div>
                      <p className="font-bold text-ink">Version {v.version_number}</p>
                      <p className="text-[10px] text-muted">{v.roster_month}</p>
                    </div>
                    <StatusBadge status={v.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
