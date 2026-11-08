import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Menu, Database, Sparkles } from 'lucide-react';
import { findNavItem } from '../../navigation.js';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { seedSupabaseDatabase } from '../../lib/dataService.js';
import { useToast } from '../common/Toast.jsx';

export default function AppShell() {
  const location = useLocation();
  const current = findNavItem(location.pathname);
  const title = current?.label ?? 'Roster';
  const [menuOpen, setMenuOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const { user } = useAuth();
  const { addToast } = useToast();

  useEffect(() => {
    document.title = `${title} · Datastraw Smart Roster`;
  }, [title]);

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  async function handleSeedDatabase() {
    setSeeding(true);
    addToast('Syncing 31 employees and 22 brands with Supabase...', 'info', 2000);
    const res = await seedSupabaseDatabase();
    setSeeding(false);
    if (res.success) {
      addToast('Supabase database synchronized successfully!', 'success');
      window.location.reload();
    } else {
      addToast(`Sync notice: ${res.error || 'Operating in reactive local state'}`, 'info');
    }
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      {menuOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-slate-900/40 lg:hidden"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-line bg-panel px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              className="rounded-md p-1.5 text-ink hover:bg-canvas lg:hidden"
              aria-label="Open navigation"
              aria-expanded={menuOpen}
              aria-controls="app-sidebar"
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={18} aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-ink">{title}</p>
              <p className="truncate text-xs text-muted">
                Workforce operations console · Datastraw Technologies
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={seeding}
              className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-panel px-3 py-1.5 text-xs font-semibold text-ink shadow-2xs hover:bg-canvas transition-colors disabled:opacity-50"
              title="Populate or refresh initial 31-employee assessment dataset in Supabase"
            >
              <Database size={13} className="text-accent" />
              <span className="hidden sm:inline">Sync DB</span>
            </button>

            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Operational</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
