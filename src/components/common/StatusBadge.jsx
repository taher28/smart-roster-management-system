export function StatusBadge({ status, label }) {
  const norm = String(status || '').toLowerCase();

  let styles = 'bg-slate-100 text-slate-700 border-slate-200';

  if (norm === 'active' || norm === 'approved' || norm === 'feasible' || norm === 'published' || norm === 'open') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200';
  } else if (norm === 'pending' || norm === 'draft' || norm === 'warning') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200';
  } else if (norm === 'inactive' || norm === 'rejected' || norm === 'critical' || norm === 'infeasible') {
    styles = 'bg-rose-50 text-rose-800 border-rose-200';
  } else if (norm === 'search_limit_reached' || norm === 'archived') {
    styles = 'bg-indigo-50 text-indigo-800 border-indigo-200';
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles}`}>
      {label || status}
    </span>
  );
}

export function StatCard({ label, value, subtext, icon: Icon, color = 'accent' }) {
  return (
    <div className="rounded-xl border border-line bg-panel p-5 shadow-xs">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-muted">{label}</p>
        {Icon ? (
          <div className="rounded-lg bg-accent-soft p-2 text-accent">
            <Icon size={18} />
          </div>
        ) : null}
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{value}</p>
      {subtext ? <p className="mt-1 text-xs text-muted">{subtext}</p> : null}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-line bg-panel/50 px-6 py-12 text-center">
      {Icon ? (
        <div className="rounded-full bg-slate-100 p-3 text-muted">
          <Icon size={24} />
        </div>
      ) : null}
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-xs leading-5 text-muted">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
