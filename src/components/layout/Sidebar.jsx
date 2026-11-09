import { NavLink } from 'react-router-dom';
import { X, LogOut, ShieldCheck, User } from 'lucide-react';
import { navigation } from '../../navigation.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Sidebar({ open, onClose }) {
  const { user, profile, signOut } = useAuth();

  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-line bg-panel transition-transform duration-200 ease-in-out ${
        open ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            Operations System
          </p>
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-base font-bold text-ink">Smart Roster</h1>
            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent uppercase">
              2.0
            </span>
          </div>
        </div>
        <button
          type="button"
          className="rounded-md p-1 text-muted hover:bg-canvas hover:text-ink lg:hidden"
          onClick={onClose}
          aria-label="Close navigation"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Primary">
        {navigation.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-semibold tracking-wider text-muted uppercase">
              {group.label}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.to}>
                    <NavLink
                      to={item.to}
                      end={item.end}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'bg-accent-soft font-semibold text-accent'
                            : 'text-ink hover:bg-canvas'
                        }`
                      }
                    >
                      <Icon size={16} aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Authenticated Manager Profile & Logout Footer */}
      <div className="border-t border-line px-4 py-3 bg-canvas/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <User size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-semibold text-ink">
                  {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Manager'}
                </p>
                <ShieldCheck size={12} className="text-accent shrink-0" title="Manager verified" />
              </div>
              <p className="truncate text-[10px] text-muted">
                {user?.email || 'Operations Admin'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-md p-1.5 text-muted hover:bg-rose-50 hover:text-rose-600 transition-colors"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
