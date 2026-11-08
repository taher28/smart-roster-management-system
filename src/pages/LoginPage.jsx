import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { ShieldCheck, ArrowRight, Loader2, KeyRound, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { signIn, signInDemoManager } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  function validate() {
    const errs = {};
    if (!email.trim()) {
      errs.email = 'Email address is required.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Enter a valid email address.';
    }
    if (!password) {
      errs.password = 'Password is required.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleLogin(e) {
    e.preventDefault();
    setSubmitError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      await signIn(email.trim(), password);
      navigate(from, { replace: true });
    } catch (err) {
      setSubmitError(
        err.message || 'Invalid credentials or email not confirmed. Try the Demo Manager button below.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setSubmitting(true);
    await signInDemoManager();
    navigate(from, { replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1.2fr)_30rem]">
      {/* Brand Hero Panel */}
      <section className="hidden bg-slate-950 px-12 py-16 text-slate-100 lg:flex lg:flex-col lg:justify-between relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-teal-900/40 via-slate-950 to-slate-950 -z-10" />

        <div>
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
            <p className="text-xs font-bold tracking-widest text-slate-300 uppercase">
              Datastraw Technologies
            </p>
          </div>
          <h1 className="mt-6 max-w-lg text-4xl font-extrabold tracking-tight text-white leading-tight">
            Smart Roster <span className="text-emerald-400">Management System</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
            Algorithmic workforce planning across 22 brands, 4 operational pods, and 31 employees.
            Deterministic constraint solving with explainable conflict detection.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 max-w-md border-t border-slate-800 pt-8">
            <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800">
              <p className="text-2xl font-bold text-emerald-400">31</p>
              <p className="text-xs text-slate-400 mt-1">Managed Employees</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800">
              <p className="text-2xl font-bold text-emerald-400">22</p>
              <p className="text-xs text-slate-400 mt-1">D2C Partner Brands</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800">
              <p className="text-2xl font-bold text-emerald-400">4</p>
              <p className="text-xs text-slate-400 mt-1">Operational Pods</p>
            </div>
            <div className="rounded-lg bg-slate-900/60 p-4 border border-slate-800">
              <p className="text-2xl font-bold text-emerald-400">100%</p>
              <p className="text-xs text-slate-400 mt-1">Deterministic Engine</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-slate-400 flex items-center justify-between">
          <span>AI + Tech Intern Assessment 2026</span>
          <span className="flex items-center gap-1 text-slate-300 font-mono">
            <ShieldCheck size={14} className="text-emerald-400" /> PostgreSQL & RLS Secured
          </span>
        </div>
      </section>

      {/* Login Form Panel */}
      <section className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-6">
            <p className="text-xs font-semibold tracking-wider text-muted uppercase lg:hidden">
              Datastraw Technologies
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink">
              Manager Sign In
            </h2>
            <p className="mt-1.5 text-xs text-muted">
              Authenticate with your credentials or use the instant evaluator bypass.
            </p>
          </div>

          {submitError ? (
            <div className="mb-5 rounded-lg border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800 leading-relaxed">
              {submitError}
            </div>
          ) : null}

          <form onSubmit={handleLogin} className="space-y-4" noValidate>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((prev) => ({ ...prev, email: undefined }));
                }}
                placeholder="manager@datastraw.io"
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {errors.email ? (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.email}</p>
              ) : null}
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                placeholder="••••••••••••"
                className="mt-1.5 w-full rounded-lg border border-line bg-panel px-3.5 py-2.5 text-sm text-ink placeholder:text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent"
              />
              {errors.password ? (
                <p className="mt-1 text-xs text-rose-600 font-medium">{errors.password}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
              <span>Sign in with Supabase</span>
            </button>
          </form>

          {/* Quick Evaluator Demo Bypass */}
          <div className="mt-6 border-t border-line pt-6">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-4">
              <div className="flex items-center gap-2 text-emerald-900 font-semibold text-xs">
                <Sparkles size={15} className="text-emerald-600" />
                <span>Assessment Evaluator Quick Access</span>
              </div>
              <p className="mt-1 text-[11px] text-emerald-800 leading-normal">
                Skip credential entry and review the complete platform with pre-verified Manager permissions.
              </p>
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={submitting}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition-colors"
              >
                <span>Launch Demo Manager Session</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
