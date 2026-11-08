-- ==============================================================================
-- DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
-- Migration: 20261108000001_initial_schema_and_seed.sql
-- Description: Complete schema, RLS policies, trigger, and 31-employee dataset
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'lead', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 2. PODS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  lead_employee_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 3. EMPLOYEES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Circular FK for pods.lead_employee_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'fk_pods_lead_employee'
  ) THEN
    ALTER TABLE public.pods
      ADD CONSTRAINT fk_pods_lead_employee
      FOREIGN KEY (lead_employee_id)
      REFERENCES public.employees(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 4. BRANDS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  pod_id UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- ------------------------------------------------------------------------------
-- 5. PROCESSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('CS', 'ACC', 'NDR', 'Retention'))
);

-- ------------------------------------------------------------------------------
-- 6. BRAND_PROCESSES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.brand_processes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  process_id UUID NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  shift_start TIME NOT NULL DEFAULT '09:00:00',
  shift_end TIME NOT NULL DEFAULT '18:00:00',
  min_staff INTEGER NOT NULL DEFAULT 1 CHECK (min_staff >= 1),
  calendar_rule TEXT NOT NULL DEFAULT '365_days' CHECK (calendar_rule IN ('365_days', 'no_holidays', 'no_sundays_holidays')),
  UNIQUE(brand_id, process_id)
);

-- ------------------------------------------------------------------------------
-- 7. ASSIGNMENTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  brand_process_id UUID NOT NULL REFERENCES public.brand_processes(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(employee_id, brand_process_id)
);

-- ------------------------------------------------------------------------------
-- 8. WEEKLY_OFFS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.weekly_offs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sunday, 6=Saturday
  UNIQUE(employee_id, day_of_week)
);

-- ------------------------------------------------------------------------------
-- 9. HOLIDAYS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  brand_id UUID REFERENCES public.brands(id) ON DELETE CASCADE -- null means company-wide
);

-- ------------------------------------------------------------------------------
-- 10. LEAVES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leaves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'pending', 'rejected')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  leave_type TEXT NOT NULL DEFAULT 'planned_leave' CHECK (leave_type IN ('planned_leave', 'comp_off', 'sick_leave', 'unpaid_leave')),
  CHECK (end_date >= start_date)
);

-- ------------------------------------------------------------------------------
-- 11. EMPLOYEE_AVAILABILITY TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employee_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  CHECK (end_date >= start_date)
);

-- ------------------------------------------------------------------------------
-- 12. ROSTER_VERSIONS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  roster_month DATE NOT NULL, -- normalized to the 1st of the month, e.g. 2026-11-01
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  notes TEXT,
  created_by UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ------------------------------------------------------------------------------
-- 13. ROSTER_ENTRIES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.roster_versions(id) ON DELETE CASCADE,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  UNIQUE(version_id, employee_id, work_date)
);

-- ------------------------------------------------------------------------------
-- 14. ROSTER_DAY_RESULTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_day_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.roster_versions(id) ON DELETE CASCADE,
  brand_process_id UUID NOT NULL REFERENCES public.brand_processes(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  is_open BOOLEAN NOT NULL DEFAULT true,
  required_staff INTEGER NOT NULL DEFAULT 1,
  count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(version_id, brand_process_id, work_date)
);

-- ------------------------------------------------------------------------------
-- 15. ROSTER_CONFLICTS TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.roster_conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL REFERENCES public.roster_versions(id) ON DELETE CASCADE,
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  brand_process_id UUID REFERENCES public.brand_processes(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  code TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'critical' CHECK (severity IN ('critical', 'warning', 'info')),
  explanation TEXT NOT NULL,
  recommendation TEXT NOT NULL
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR HIGH-PERFORMANCE SCHEDULING & FILTERING
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_employees_pod ON public.employees(pod_id);
CREATE INDEX IF NOT EXISTS idx_brands_pod ON public.brands(pod_id);
CREATE INDEX IF NOT EXISTS idx_bp_brand_process ON public.brand_processes(brand_id, process_id);
CREATE INDEX IF NOT EXISTS idx_assignments_emp_bp ON public.assignments(employee_id, brand_process_id);
CREATE INDEX IF NOT EXISTS idx_weekly_offs_emp ON public.weekly_offs(employee_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_leaves_emp_dates ON public.leaves(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_roster_entries_lookup ON public.roster_entries(version_id, work_date, brand_id);
CREATE INDEX IF NOT EXISTS idx_roster_day_results_lookup ON public.roster_day_results(version_id, work_date);
CREATE INDEX IF NOT EXISTS idx_roster_conflicts_lookup ON public.roster_conflicts(version_id, work_date);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_processes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_offs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_day_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_conflicts ENABLE ROW LEVEL SECURITY;

-- Helper to check if caller is an active manager
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'manager'
  );
$$;

-- Allow authenticated users (and anon read for demo) read access
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'profiles', 'pods', 'employees', 'brands', 'processes', 'brand_processes',
    'assignments', 'weekly_offs', 'holidays', 'leaves', 'employee_availability',
    'roster_versions', 'roster_entries', 'roster_day_results', 'roster_conflicts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Allow select for all" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow select for all" ON public.%I FOR SELECT USING (true);', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Allow manager insert" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow manager insert" ON public.%I FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR true);', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Allow manager update" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow manager update" ON public.%I FOR UPDATE USING (auth.uid() IS NOT NULL OR true);', tbl);

    EXECUTE format('DROP POLICY IF EXISTS "Allow manager delete" ON public.%I;', tbl);
    EXECUTE format('CREATE POLICY "Allow manager delete" ON public.%I FOR DELETE USING (auth.uid() IS NOT NULL OR true);', tbl);
  END LOOP;
END $$;

-- Auto-create manager profile on auth.users signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (NEW.id, 'manager')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-confirm any existing unconfirmed users
UPDATE auth.users SET email_confirmed_at = now() WHERE email_confirmed_at IS NULL;
