-- ==============================================================================
-- DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
-- File: supabase/setup_complete.sql
-- Description: Production-Hardened, Fully Idempotent Setup & Migration Script
-- Revision: PostgreSQL UUID compatibility and safe duplicate-merge corrections.
--
-- What this script guarantees:
-- 1. Creates the required schema on an empty database and applies guarded migrations.
-- 2. Process code migration (Retention -> RET) merges duplicate assignments
--    and roster-day results before re-pointing foreign keys.
-- 3. Employee deduplication uses deterministic UUID ordering, preserves assignment
--    flags, and resolves duplicate snapshot entries before re-pointing references.
-- 4. Authenticated users can read snapshots; writes are routed through manager-guarded
--    SECURITY DEFINER RPCs. Snapshot child rows retain SET NULL references to master data.
-- 5. save_roster_snapshot validates the month, status, payload array types,
--    required fields, and key foreign-key references; SQL errors roll back the RPC.
-- 6. Permissions: set_manager_by_email and handle_new_user are postgres/service_role
--    only. promote_user_to_manager is callable by authenticated users but guarded
--    by is_manager() internally. No user can self-promote.
-- 7. Policy cleanup is targeted to exactly the 15 application tables.
-- 8. Post-seed validator fails loudly if counts deviate from assessment spec.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- PART 1: DDL — TABLE DEFINITIONS & SAFE CONSTRAINT MIGRATIONS
-- ==============================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role     TEXT NOT NULL DEFAULT 'viewer'
             CHECK (role IN ('manager', 'lead', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- Ensure default is always viewer even if the table was created differently before
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- Safely refresh the role check constraint
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check CHECK (role IN ('manager', 'lead', 'viewer'));
END $$;


-- 2. PODS TABLE
CREATE TABLE IF NOT EXISTS public.pods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL UNIQUE,
  lead_employee_id UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);


-- 3. EMPLOYEES TABLE
CREATE TABLE IF NOT EXISTS public.employees (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name  TEXT NOT NULL,
  pod_id     UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);


-- Circular FK: pods.lead_employee_id -> employees.id  (added only once)
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


-- 4. BRANDS TABLE
CREATE TABLE IF NOT EXISTS public.brands (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      TEXT NOT NULL UNIQUE,
  pod_id    UUID REFERENCES public.pods(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);


-- 5. PROCESSES TABLE  (standardised codes: CS, ACC, NDR, RET)
CREATE TABLE IF NOT EXISTS public.processes (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL
);


-- 6. BRAND_PROCESSES TABLE
CREATE TABLE IF NOT EXISTS public.brand_processes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id      UUID NOT NULL REFERENCES public.brands(id)    ON DELETE CASCADE,
  process_id    UUID NOT NULL REFERENCES public.processes(id)  ON DELETE CASCADE,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  shift_start   TIME    NOT NULL DEFAULT '09:00:00',
  shift_end     TIME    NOT NULL DEFAULT '18:00:00',
  min_staff     INTEGER NOT NULL DEFAULT 1 CHECK (min_staff >= 1),
  calendar_rule TEXT    NOT NULL DEFAULT '365_days'
                  CHECK (calendar_rule IN ('365_days','no_holidays','no_sundays_holidays')),
  UNIQUE (brand_id, process_id)
);

DO $$
BEGIN
  -- Only add the named unique constraint if neither it nor an equivalent exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.brand_processes'::regclass
      AND contype   = 'u'
      AND conname   = 'uq_brand_processes_brand_proc'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.brand_processes'::regclass
      AND contype   = 'u'
      AND pg_get_constraintdef(oid) LIKE '%brand_id, process_id%'
  ) THEN
    ALTER TABLE public.brand_processes
      ADD CONSTRAINT uq_brand_processes_brand_proc UNIQUE (brand_id, process_id);
  END IF;
END $$;


-- 7. ASSIGNMENTS TABLE
CREATE TABLE IF NOT EXISTS public.assignments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES public.employees(id)      ON DELETE CASCADE,
  brand_process_id UUID NOT NULL REFERENCES public.brand_processes(id) ON DELETE CASCADE,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (employee_id, brand_process_id)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.assignments'::regclass
      AND contype   = 'u'
      AND conname   = 'uq_assignments_emp_bp'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.assignments'::regclass
      AND contype   = 'u'
      AND pg_get_constraintdef(oid) LIKE '%employee_id, brand_process_id%'
  ) THEN
    ALTER TABLE public.assignments
      ADD CONSTRAINT uq_assignments_emp_bp UNIQUE (employee_id, brand_process_id);
  END IF;
END $$;


-- 8. WEEKLY_OFFS TABLE
CREATE TABLE IF NOT EXISTS public.weekly_offs (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  UNIQUE (employee_id, day_of_week)
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.weekly_offs'::regclass
      AND contype   = 'u'
      AND conname   = 'uq_weekly_offs_emp_day'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.weekly_offs'::regclass
      AND contype   = 'u'
      AND pg_get_constraintdef(oid) LIKE '%employee_id, day_of_week%'
  ) THEN
    ALTER TABLE public.weekly_offs
      ADD CONSTRAINT uq_weekly_offs_emp_day UNIQUE (employee_id, day_of_week);
  END IF;
END $$;


-- 9. HOLIDAYS TABLE
CREATE TABLE IF NOT EXISTS public.holidays (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  holiday_date DATE NOT NULL,
  brand_id     UUID REFERENCES public.brands(id) ON DELETE CASCADE
);


-- 10. LEAVES TABLE
CREATE TABLE IF NOT EXISTS public.leaves (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('approved','pending','rejected')),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  leave_type  TEXT NOT NULL DEFAULT 'planned_leave'
                CHECK (leave_type IN ('planned_leave','comp_off','sick_leave','unpaid_leave')),
  CHECK (end_date >= start_date)
);


-- 11. EMPLOYEE_AVAILABILITY TABLE
CREATE TABLE IF NOT EXISTS public.employee_availability (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  CHECK (end_date >= start_date)
);


-- 12. ROSTER_VERSIONS TABLE
-- ON DELETE SET NULL on created_by so deleting a profile row does not cascade
-- into the snapshot records themselves.
CREATE TABLE IF NOT EXISTS public.roster_versions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number INTEGER NOT NULL,
  roster_month   DATE    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','published','archived')),
  notes          TEXT,
  created_by     UUID REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_roster_versions_month_version'
  ) THEN
    ALTER TABLE public.roster_versions
      ADD CONSTRAINT uq_roster_versions_month_version UNIQUE (roster_month, version_number);
  END IF;
END $$;


-- 13. ROSTER_ENTRIES TABLE
-- brand_id / employee_id use SET NULL so that archiving a brand or employee does
-- NOT cascade-delete historical snapshot records. The entry row stays; the FK
-- column is nulled, which is acceptable for historical audit purposes.
-- The ON DELETE CASCADE remains on version_id. This means a trusted database
-- administrator can intentionally remove a version and its child rows; application
-- authenticated users have no DELETE policy on these snapshot tables.
CREATE TABLE IF NOT EXISTS public.roster_entries (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id  UUID NOT NULL REFERENCES public.roster_versions(id) ON DELETE CASCADE,
  brand_id    UUID          REFERENCES public.brands(id)          ON DELETE SET NULL,
  employee_id UUID          REFERENCES public.employees(id)        ON DELETE SET NULL,
  work_date   DATE NOT NULL,
  UNIQUE (version_id, employee_id, work_date)
);


-- 14. ROSTER_DAY_RESULTS TABLE
-- brand_process_id uses SET NULL for the same reason as above.
CREATE TABLE IF NOT EXISTS public.roster_day_results (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id       UUID NOT NULL REFERENCES public.roster_versions(id)   ON DELETE CASCADE,
  brand_process_id UUID          REFERENCES public.brand_processes(id)    ON DELETE SET NULL,
  work_date        DATE NOT NULL,
  is_open          BOOLEAN NOT NULL DEFAULT true,
  required_staff   INTEGER NOT NULL DEFAULT 1,
  count            INTEGER NOT NULL DEFAULT 0,
  UNIQUE (version_id, brand_process_id, work_date)
);


-- 15. ROSTER_CONFLICTS TABLE
-- Both nullable FKs use SET NULL to preserve historical conflict records even if
-- the referenced employee or brand_process is later archived.
CREATE TABLE IF NOT EXISTS public.roster_conflicts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id       UUID NOT NULL REFERENCES public.roster_versions(id)   ON DELETE CASCADE,
  employee_id      UUID          REFERENCES public.employees(id)          ON DELETE SET NULL,
  brand_process_id UUID          REFERENCES public.brand_processes(id)    ON DELETE SET NULL,
  work_date        DATE NOT NULL,
  code             TEXT NOT NULL,
  severity         TEXT NOT NULL DEFAULT 'critical'
                     CHECK (severity IN ('critical','warning','info')),
  explanation      TEXT NOT NULL,
  recommendation   TEXT NOT NULL
);


-- ==============================================================================
-- PART 1-B: PROCESS CODE MIGRATION
-- Must run AFTER all tables exist so that FK re-pointing is safe.
-- Handles three scenarios:
--   A. Only 'Retention' exists  -> rename in-place to 'RET'.
--   B. Only 'RET' exists        -> nothing to do.
--   C. Both exist               -> merge Retention into RET with full FK repair
--      including duplicate-assignment resolution before merging brand_processes.
-- ==============================================================================
DO $$
DECLARE
  v_old_id  UUID;   -- id of the 'Retention' process row (if present)
  v_new_id  UUID;   -- id of the 'RET' process row (if present)
  r         RECORD;
BEGIN
  -- Step 1: Drop every CHECK constraint on processes.code so we can freely
  --         change values before re-applying the final constraint.
  FOR r IN (
    SELECT conname
    FROM   pg_constraint
    WHERE  conrelid = 'public.processes'::regclass
      AND  contype  = 'c'
      AND  pg_get_constraintdef(oid) LIKE '%code%'
  ) LOOP
    EXECUTE format('ALTER TABLE public.processes DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- Step 2: Identify which legacy / new records exist
  SELECT id INTO v_old_id FROM public.processes WHERE code = 'Retention';
  SELECT id INTO v_new_id FROM public.processes WHERE code = 'RET';

  -- Scenario A: only 'Retention' exists – rename in-place
  IF v_old_id IS NOT NULL AND v_new_id IS NULL THEN
    UPDATE public.processes
    SET    code = 'RET', name = 'Retention Operations'
    WHERE  id   = v_old_id;

  -- Scenario C: both exist – full merge
  ELSIF v_old_id IS NOT NULL AND v_new_id IS NOT NULL THEN

    -- For every brand that had a brand_process under 'Retention' AND already has
    -- one under 'RET', we need to merge assignments before deleting the old row.
    FOR r IN (
      SELECT bp_old.id  AS old_bp_id,
             bp_new.id  AS new_bp_id
      FROM   public.brand_processes bp_old
      JOIN   public.brand_processes bp_new
               ON  bp_old.brand_id   = bp_new.brand_id
               AND bp_new.process_id = v_new_id
      WHERE  bp_old.process_id = v_old_id
    ) LOOP

      -- 3a. Merge duplicate assignments without losing active/primary flags.
      UPDATE public.assignments a_keep
      SET    is_active  = a_keep.is_active OR a_dup.is_active,
             is_primary = a_keep.is_primary OR a_dup.is_primary
      FROM   public.assignments a_dup
      WHERE  a_keep.brand_process_id = r.new_bp_id
        AND  a_dup.brand_process_id  = r.old_bp_id
        AND  a_keep.employee_id      = a_dup.employee_id;

      DELETE FROM public.assignments a_dup
      WHERE  a_dup.brand_process_id = r.old_bp_id
        AND  EXISTS (
               SELECT 1 FROM public.assignments a_keep
               WHERE  a_keep.brand_process_id = r.new_bp_id
                 AND  a_keep.employee_id       = a_dup.employee_id
             );

      -- Re-point remaining assignments from old_bp -> new_bp.
      UPDATE public.assignments
      SET    brand_process_id = r.new_bp_id
      WHERE  brand_process_id = r.old_bp_id;

      -- 3c. Merge duplicate day results before re-pointing to avoid the
      --     UNIQUE(version_id, brand_process_id, work_date) constraint.
      UPDATE public.roster_day_results keep
      SET    is_open        = keep.is_open OR old.is_open,
             required_staff = GREATEST(keep.required_staff, old.required_staff),
             count          = GREATEST(keep.count, old.count)
      FROM   public.roster_day_results old
      WHERE  keep.brand_process_id = r.new_bp_id
        AND  old.brand_process_id  = r.old_bp_id
        AND  keep.version_id       = old.version_id
        AND  keep.work_date        = old.work_date;

      DELETE FROM public.roster_day_results old
      WHERE  old.brand_process_id = r.old_bp_id
        AND  EXISTS (
              SELECT 1
              FROM public.roster_day_results keep
              WHERE keep.brand_process_id = r.new_bp_id
                AND keep.version_id = old.version_id
                AND keep.work_date = old.work_date
        );

      UPDATE public.roster_day_results
      SET    brand_process_id = r.new_bp_id
      WHERE  brand_process_id = r.old_bp_id;

      -- 3d. Re-point roster_conflicts
      UPDATE public.roster_conflicts
      SET    brand_process_id = r.new_bp_id
      WHERE  brand_process_id = r.old_bp_id;

      -- 3e. Delete the now-redundant old brand_process row
      DELETE FROM public.brand_processes WHERE id = r.old_bp_id;
    END LOOP;

    -- For brands that had Retention but NOT yet a RET brand_process, simply
    -- re-point the process_id rather than deleting.
    UPDATE public.brand_processes
    SET    process_id = v_new_id
    WHERE  process_id = v_old_id;

    -- Remove the now-redundant 'Retention' process record
    DELETE FROM public.processes WHERE id = v_old_id;
  END IF;
  -- Scenario B (only RET exists): nothing to do, fall through.

  -- Step 4: Ensure UNIQUE constraint on processes(code)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conrelid = 'public.processes'::regclass
      AND  contype  = 'u'
      AND  pg_get_constraintdef(oid) LIKE '%code%'
  ) THEN
    ALTER TABLE public.processes
      ADD CONSTRAINT uq_processes_code UNIQUE (code);
  END IF;

  -- Step 5: Apply the definitive CHECK constraint (always safe – constraints
  --         above were already dropped; existing data was cleaned above).
  ALTER TABLE public.processes
    ADD CONSTRAINT processes_code_check CHECK (code IN ('CS','ACC','NDR','RET'));
END $$;


-- ==============================================================================
-- PART 1-C: EMPLOYEE DEDUPLICATION
-- Runs only after all dependent tables exist.
-- Merges duplicate employee rows, then adds UNIQUE(full_name).
-- ==============================================================================
DO $$
DECLARE
  r            RECORD;
  tbl_exists   BOOLEAN;
BEGIN
  -- Determine which dependent tables are present
  SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE  table_schema = 'public' AND table_name = 'assignments'
  ) INTO tbl_exists;

  FOR r IN (
    SELECT full_name,
           (array_agg(id ORDER BY id::text))[1] AS keep_id,
           array_agg(id ORDER BY id::text) AS all_ids
    FROM   public.employees
    GROUP  BY full_name
    HAVING COUNT(*) > 1
  ) LOOP

    IF tbl_exists THEN
      -- Merge assignment flags across all duplicate employee rows before
      -- deleting/re-pointing rows, preserving active and primary information.
      UPDATE public.assignments a_keep
      SET    is_active = merged.any_active,
             is_primary = merged.any_primary
      FROM (
        SELECT brand_process_id,
               BOOL_OR(is_active) AS any_active,
               BOOL_OR(is_primary) AS any_primary
        FROM public.assignments
        WHERE employee_id = ANY(r.all_ids)
        GROUP BY brand_process_id
      ) merged
      WHERE a_keep.employee_id = r.keep_id
        AND a_keep.brand_process_id = merged.brand_process_id;

      INSERT INTO public.assignments
        (employee_id, brand_process_id, is_active, is_primary)
      SELECT r.keep_id, merged.brand_process_id,
             merged.any_active, merged.any_primary
      FROM (
        SELECT brand_process_id,
               BOOL_OR(is_active) AS any_active,
               BOOL_OR(is_primary) AS any_primary
        FROM public.assignments
        WHERE employee_id = ANY(r.all_ids)
        GROUP BY brand_process_id
      ) merged
      WHERE NOT EXISTS (
        SELECT 1 FROM public.assignments existing
        WHERE existing.employee_id = r.keep_id
          AND existing.brand_process_id = merged.brand_process_id
      );

      DELETE FROM public.assignments
      WHERE employee_id = ANY(r.all_ids)
        AND employee_id <> r.keep_id;
    END IF;

    -- weekly_offs
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE  table_schema = 'public' AND table_name = 'weekly_offs'
    ) THEN
      DELETE FROM public.weekly_offs wo_dup
      WHERE  wo_dup.employee_id = ANY(r.all_ids)
        AND  wo_dup.employee_id <> r.keep_id
        AND  EXISTS (
               SELECT 1 FROM public.weekly_offs wo_keep
               WHERE  wo_keep.employee_id = r.keep_id
                 AND  wo_keep.day_of_week = wo_dup.day_of_week
             );

      UPDATE public.weekly_offs
      SET    employee_id = r.keep_id
      WHERE  employee_id = ANY(r.all_ids)
        AND  employee_id <> r.keep_id;
    END IF;

    -- leaves
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE  table_schema = 'public' AND table_name = 'leaves'
    ) THEN
      UPDATE public.leaves
      SET    employee_id = r.keep_id
      WHERE  employee_id = ANY(r.all_ids)
        AND  employee_id <> r.keep_id;
    END IF;

    -- employee_availability
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE  table_schema = 'public' AND table_name = 'employee_availability'
    ) THEN
      UPDATE public.employee_availability
      SET    employee_id = r.keep_id
      WHERE  employee_id = ANY(r.all_ids)
        AND  employee_id <> r.keep_id;
    END IF;

    -- pods.lead_employee_id
    UPDATE public.pods
    SET    lead_employee_id = r.keep_id
    WHERE  lead_employee_id = ANY(r.all_ids)
      AND  lead_employee_id <> r.keep_id;

    -- Snapshot entries have UNIQUE(version_id, employee_id, work_date).
    -- Preserve a non-null brand reference on the retained row, then remove
    -- duplicate logical entries before changing the remaining employee FKs.
    UPDATE public.roster_entries keep
    SET brand_id = COALESCE(keep.brand_id, old.brand_id)
    FROM public.roster_entries old
    WHERE keep.employee_id = r.keep_id
      AND old.employee_id = ANY(r.all_ids)
      AND old.employee_id <> r.keep_id
      AND keep.version_id = old.version_id
      AND keep.work_date = old.work_date;

    DELETE FROM public.roster_entries old
    WHERE old.employee_id = ANY(r.all_ids)
      AND old.employee_id <> r.keep_id
      AND EXISTS (
        SELECT 1
        FROM public.roster_entries other
        WHERE other.employee_id = ANY(r.all_ids)
          AND other.version_id = old.version_id
          AND other.work_date = old.work_date
          AND (
            other.employee_id = r.keep_id
            OR other.employee_id::text < old.employee_id::text
          )
      );

    UPDATE public.roster_entries
    SET employee_id = r.keep_id
    WHERE employee_id = ANY(r.all_ids)
      AND employee_id <> r.keep_id;

    UPDATE public.roster_conflicts
    SET    employee_id = r.keep_id
    WHERE  employee_id = ANY(r.all_ids)
      AND  employee_id <> r.keep_id;

    -- Delete duplicate employee rows
    DELETE FROM public.employees
    WHERE  id = ANY(r.all_ids)
      AND  id <> r.keep_id;
  END LOOP;

  -- Enforce UNIQUE(full_name) once duplicates are resolved
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE  conrelid = 'public.employees'::regclass
      AND  contype  = 'u'
      AND  conname  = 'uq_employees_full_name'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT uq_employees_full_name UNIQUE (full_name);
  END IF;
END $$;


-- ==============================================================================
-- PART 2: PERFORMANCE INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_employees_pod
  ON public.employees(pod_id);
CREATE INDEX IF NOT EXISTS idx_brands_pod
  ON public.brands(pod_id);
CREATE INDEX IF NOT EXISTS idx_bp_brand_process
  ON public.brand_processes(brand_id, process_id);
CREATE INDEX IF NOT EXISTS idx_assignments_emp_bp
  ON public.assignments(employee_id, brand_process_id);
CREATE INDEX IF NOT EXISTS idx_weekly_offs_emp
  ON public.weekly_offs(employee_id);
CREATE INDEX IF NOT EXISTS idx_holidays_date
  ON public.holidays(holiday_date);
CREATE INDEX IF NOT EXISTS idx_leaves_emp_dates
  ON public.leaves(employee_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_roster_entries_lookup
  ON public.roster_entries(version_id, work_date, brand_id);
CREATE INDEX IF NOT EXISTS idx_roster_day_results_lookup
  ON public.roster_day_results(version_id, work_date);
CREATE INDEX IF NOT EXISTS idx_roster_conflicts_lookup
  ON public.roster_conflicts(version_id, work_date);
CREATE INDEX IF NOT EXISTS idx_roster_versions_month
  ON public.roster_versions(roster_month);


-- ==============================================================================
-- PART 3: FUNCTIONS, TRIGGERS & ATOMIC RPCs
-- ==============================================================================

-- 3-1. is_manager() — stable helper for RLS policies and RPC guards
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE  user_id = auth.uid() AND role = 'manager'
  );
$$;


-- 3-2. handle_new_user() — signup trigger: always creates viewer profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 3-3. prevent_profile_self_promotion() — trigger guard on profiles UPDATE
CREATE OR REPLACE FUNCTION public.prevent_profile_self_promotion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NEW.role <> OLD.role THEN
    -- Only service_role / postgres or an existing manager may change roles
    IF auth.role() NOT IN ('service_role','postgres') AND NOT public.is_manager() THEN
      RAISE EXCEPTION 'Unauthorized: Only an existing manager or database administrator can change user roles.';
    END IF;

    -- Prevent the last manager from demoting themselves
    IF OLD.role = 'manager'
       AND NEW.role <> 'manager'
       AND OLD.user_id = auth.uid()
       AND (SELECT COUNT(*) FROM public.profiles WHERE role = 'manager') <= 1
    THEN
      RAISE EXCEPTION 'Operation blocked: Cannot demote the sole system manager.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_promotion ON public.profiles;
CREATE TRIGGER trg_prevent_self_promotion
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_self_promotion();


-- 3-4. Remove obsolete bootstrap_first_manager (conflicting auth requirements)
DROP FUNCTION IF EXISTS public.bootstrap_first_manager();


-- 3-5. promote_user_to_manager(UUID)
--      Callable by authenticated users, but internally protected by is_manager().
CREATE OR REPLACE FUNCTION public.promote_user_to_manager(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
BEGIN
  IF NOT public.is_manager() AND auth.role() NOT IN ('service_role','postgres') THEN
    RAISE EXCEPTION 'Access Denied: Only active managers can promote users.';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'Target user ID % does not exist in auth.users.', target_user_id;
  END IF;

  -- Prevent self-promotion via this function (the trigger also catches it,
  -- but defence in depth here stops it one layer earlier)
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Self-promotion is not permitted. Ask another manager or an administrator.';
  END IF;

  INSERT INTO public.profiles (user_id, role)
  VALUES (target_user_id, 'manager')
  ON CONFLICT (user_id) DO UPDATE SET role = 'manager';
END;
$$;


-- 3-6. set_manager_by_email(TEXT)
--      Restricted to postgres / service_role (SQL Editor administration only).
CREATE OR REPLACE FUNCTION public.set_manager_by_email(target_email TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid
  FROM   auth.users
  WHERE  LOWER(email) = LOWER(target_email);

  IF v_uid IS NULL THEN
    RAISE EXCEPTION
      'User with email % not found in auth.users. Ensure the account exists first.',
      target_email;
  END IF;

  INSERT INTO public.profiles (user_id, role)
  VALUES (v_uid, 'manager')
  ON CONFLICT (user_id) DO UPDATE SET role = 'manager';
END;
$$;


-- 3-7. save_roster_snapshot(…) — atomic RPC with full payload validation
CREATE OR REPLACE FUNCTION public.save_roster_snapshot(
  p_version_number INTEGER,
  p_roster_month   DATE,
  p_status         TEXT,
  p_notes          TEXT,
  p_entries        JSONB,
  p_day_results    JSONB,
  p_conflicts      JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_version_id          UUID;
  v_final_version_number INTEGER;
  item                  JSONB;
  v_employee_id         UUID;
  v_brand_id            UUID;
  v_bp_id               UUID;
  v_work_date           DATE;
BEGIN
  -- Permission
  IF NOT public.is_manager() AND auth.role() NOT IN ('service_role','postgres') THEN
    RAISE EXCEPTION 'Unauthorized: Only managers can save roster versions.';
  END IF;

  -- Validate: roster_month must be the first day of the month
  IF p_roster_month IS NULL THEN
    RAISE EXCEPTION 'Validation: p_roster_month must not be NULL.';
  END IF;
  IF p_roster_month <> date_trunc('month', p_roster_month)::DATE THEN
    RAISE EXCEPTION
      'Validation: p_roster_month (%) must be the first day of the month.',
      p_roster_month;
  END IF;

  -- Validate: status
  IF COALESCE(p_status,'draft') NOT IN ('draft','published','archived') THEN
    RAISE EXCEPTION
      'Validation: status must be draft, published, or archived. Got: %',
      p_status;
  END IF;

  -- Validate: entries array – required fields
  IF p_entries IS NOT NULL THEN
    IF jsonb_typeof(p_entries) <> 'array' THEN
      RAISE EXCEPTION 'Validation: p_entries must be a JSON array.';
    END IF;
    FOR item IN SELECT jsonb_array_elements(p_entries) LOOP
      IF item->>'brand_id' IS NULL OR item->>'employee_id' IS NULL OR item->>'work_date' IS NULL THEN
        RAISE EXCEPTION 'Validation: each entry must have brand_id, employee_id, and work_date. Got: %', item;
      END IF;
      -- Validate FK references exist
      v_employee_id := (item->>'employee_id')::UUID;
      v_brand_id    := (item->>'brand_id')::UUID;
      v_work_date   := (item->>'work_date')::DATE;
      IF NOT EXISTS (SELECT 1 FROM public.employees WHERE id = v_employee_id) THEN
        RAISE EXCEPTION 'Validation: employee_id % does not exist in employees.', v_employee_id;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM public.brands WHERE id = v_brand_id) THEN
        RAISE EXCEPTION 'Validation: brand_id % does not exist in brands.', v_brand_id;
      END IF;
    END LOOP;
  END IF;

  -- Validate: day_results array – required fields
  IF p_day_results IS NOT NULL THEN
    IF jsonb_typeof(p_day_results) <> 'array' THEN
      RAISE EXCEPTION 'Validation: p_day_results must be a JSON array.';
    END IF;
    FOR item IN SELECT jsonb_array_elements(p_day_results) LOOP
      IF item->>'brand_process_id' IS NULL OR item->>'work_date' IS NULL THEN
        RAISE EXCEPTION 'Validation: each day_result must have brand_process_id and work_date. Got: %', item;
      END IF;
      v_bp_id := (item->>'brand_process_id')::UUID;
      IF NOT EXISTS (SELECT 1 FROM public.brand_processes WHERE id = v_bp_id) THEN
        RAISE EXCEPTION 'Validation: brand_process_id % does not exist in brand_processes.', v_bp_id;
      END IF;
    END LOOP;
  END IF;

  -- Validate: conflicts array – required fields
  IF p_conflicts IS NOT NULL THEN
    IF jsonb_typeof(p_conflicts) <> 'array' THEN
      RAISE EXCEPTION 'Validation: p_conflicts must be a JSON array.';
    END IF;
    FOR item IN SELECT jsonb_array_elements(p_conflicts) LOOP
      IF item->>'work_date' IS NULL OR item->>'code' IS NULL
         OR item->>'explanation' IS NULL OR item->>'recommendation' IS NULL
      THEN
        RAISE EXCEPTION
          'Validation: each conflict must have work_date, code, explanation, and recommendation. Got: %', item;
      END IF;
    END LOOP;
  END IF;

  -- Concurrency: serialize version-number assignment for the same roster_month
  PERFORM pg_advisory_xact_lock(hashtext('roster_version_' || p_roster_month::text));

  -- Determine the final version number
  IF p_version_number IS NULL OR p_version_number <= 0 THEN
    SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_final_version_number
    FROM   public.roster_versions
    WHERE  roster_month = p_roster_month;
  ELSE
    IF EXISTS (
      SELECT 1 FROM public.roster_versions
      WHERE  roster_month    = p_roster_month
        AND  version_number  = p_version_number
    ) THEN
      -- Requested number already in use: auto-increment
      SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_final_version_number
      FROM   public.roster_versions
      WHERE  roster_month = p_roster_month;
    ELSE
      v_final_version_number := p_version_number;
    END IF;
  END IF;

  IF v_final_version_number <= 0 THEN
    RAISE EXCEPTION 'Validation: computed version_number must be positive. Got: %', v_final_version_number;
  END IF;

  -- Insert version header
  INSERT INTO public.roster_versions (
    version_number, roster_month, status, notes, created_by
  ) VALUES (
    v_final_version_number,
    p_roster_month,
    COALESCE(p_status, 'draft'),
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_version_id;

  -- Insert entries
  IF p_entries IS NOT NULL AND jsonb_array_length(p_entries) > 0 THEN
    INSERT INTO public.roster_entries (version_id, brand_id, employee_id, work_date)
    SELECT
      v_version_id,
      (item->>'brand_id')::UUID,
      (item->>'employee_id')::UUID,
      (item->>'work_date')::DATE
    FROM jsonb_array_elements(p_entries) AS item;
  END IF;

  -- Insert day results
  IF p_day_results IS NOT NULL AND jsonb_array_length(p_day_results) > 0 THEN
    INSERT INTO public.roster_day_results (
      version_id, brand_process_id, work_date, is_open, required_staff, count
    )
    SELECT
      v_version_id,
      (item->>'brand_process_id')::UUID,
      (item->>'work_date')::DATE,
      COALESCE((item->>'is_open')::BOOLEAN,  true),
      COALESCE((item->>'required_staff')::INTEGER, 1),
      COALESCE((item->>'count')::INTEGER, 0)
    FROM jsonb_array_elements(p_day_results) AS item;
  END IF;

  -- Insert conflicts
  IF p_conflicts IS NOT NULL AND jsonb_array_length(p_conflicts) > 0 THEN
    INSERT INTO public.roster_conflicts (
      version_id, employee_id, brand_process_id, work_date,
      code, severity, explanation, recommendation
    )
    SELECT
      v_version_id,
      NULLIF(item->>'employee_id',      '')::UUID,
      NULLIF(item->>'brand_process_id', '')::UUID,
      (item->>'work_date')::DATE,
      item->>'code',
      COALESCE(item->>'severity', 'critical'),
      item->>'explanation',
      item->>'recommendation'
    FROM jsonb_array_elements(p_conflicts) AS item;
  END IF;

  RETURN v_version_id;

  -- Any exception propagates and rolls back the entire transaction
END;
$$;


-- 3-8. restore_roster_snapshot(UUID, TEXT) — clones into a new version; never
--      touches the source version or its child rows.
CREATE OR REPLACE FUNCTION public.restore_roster_snapshot(
  p_source_version_id UUID,
  p_notes             TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_source          RECORD;
  v_new_version_id  UUID;
  v_next_version_num INTEGER;
BEGIN
  IF NOT public.is_manager() AND auth.role() NOT IN ('service_role','postgres') THEN
    RAISE EXCEPTION 'Unauthorized: Only managers can restore roster versions.';
  END IF;

  SELECT * INTO v_source
  FROM   public.roster_versions
  WHERE  id = p_source_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source roster version % not found.', p_source_version_id;
  END IF;

  -- Concurrency: same lock key as save so restores and concurrent saves for the
  -- same month are serialized.
  PERFORM pg_advisory_xact_lock(hashtext('roster_version_' || v_source.roster_month::text));

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version_num
  FROM   public.roster_versions
  WHERE  roster_month = v_source.roster_month;

  -- Create the new version header (source is never touched)
  INSERT INTO public.roster_versions (
    version_number, roster_month, status, notes, created_by
  ) VALUES (
    v_next_version_num,
    v_source.roster_month,
    'draft',
    COALESCE(p_notes, 'Restored from Version ' || v_source.version_number),
    auth.uid()
  )
  RETURNING id INTO v_new_version_id;

  -- Clone entries
  INSERT INTO public.roster_entries (version_id, brand_id, employee_id, work_date)
  SELECT v_new_version_id, brand_id, employee_id, work_date
  FROM   public.roster_entries
  WHERE  version_id = p_source_version_id;

  -- Clone day results
  INSERT INTO public.roster_day_results (
    version_id, brand_process_id, work_date, is_open, required_staff, count
  )
  SELECT v_new_version_id, brand_process_id, work_date, is_open, required_staff, count
  FROM   public.roster_day_results
  WHERE  version_id = p_source_version_id;

  -- Clone conflicts
  INSERT INTO public.roster_conflicts (
    version_id, employee_id, brand_process_id, work_date,
    code, severity, explanation, recommendation
  )
  SELECT v_new_version_id, employee_id, brand_process_id, work_date,
         code, severity, explanation, recommendation
  FROM   public.roster_conflicts
  WHERE  version_id = p_source_version_id;

  RETURN v_new_version_id;
END;
$$;


-- ==============================================================================
-- PART 4: FUNCTION PERMISSIONS (EXACT SIGNATURES, MINIMAL PRIVILEGES)
-- ==============================================================================

-- Revoke from PUBLIC and anon (belt-and-suspenders; SECURITY DEFINER already
-- controls execution context, but explicit revokes eliminate any residual grants).
REVOKE ALL ON FUNCTION public.is_manager()                                                    FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.handle_new_user()                                               FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.promote_user_to_manager(UUID)                                   FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_manager_by_email(TEXT)                                      FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.save_roster_snapshot(INTEGER, DATE, TEXT, TEXT, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.restore_roster_snapshot(UUID, TEXT)                             FROM PUBLIC, anon;

-- Administrative functions also revoked from ordinary authenticated users
REVOKE ALL ON FUNCTION public.set_manager_by_email(TEXT) FROM authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user()          FROM authenticated;

-- Only postgres / service_role may call administrative functions
GRANT EXECUTE ON FUNCTION public.set_manager_by_email(TEXT) TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user()          TO postgres, service_role;

-- Authenticated users may call these (each function enforces its own manager check)
GRANT EXECUTE ON FUNCTION public.is_manager()                                                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.promote_user_to_manager(UUID)                                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_roster_snapshot(INTEGER, DATE, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.restore_roster_snapshot(UUID, TEXT)                             TO authenticated;


-- ==============================================================================
-- PART 5: ROW LEVEL SECURITY POLICIES
-- ==============================================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pods                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brands                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.brand_processes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_offs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaves                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_versions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_entries        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_day_results    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roster_conflicts      ENABLE ROW LEVEL SECURITY;

-- Drop existing policies on the 15 application tables ONLY (targeted cleanup)
DO $$
DECLARE
  pol RECORD;
  target_tables TEXT[] := ARRAY[
    'profiles','pods','employees','brands','processes','brand_processes',
    'assignments','weekly_offs','holidays','leaves','employee_availability',
    'roster_versions','roster_entries','roster_day_results','roster_conflicts'
  ];
BEGIN
  FOR pol IN (
    SELECT schemaname, tablename, policyname
    FROM   pg_policies
    WHERE  schemaname = 'public'
      AND  tablename  = ANY(target_tables)
  ) LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      pol.policyname, pol.schemaname, pol.tablename
    );
  END LOOP;
END $$;


-- 5-A. OPERATIONAL MASTER DATA (8 tables): full CRUD restricted to managers
DO $$
DECLARE
  tbl    TEXT;
  tables TEXT[] := ARRAY[
    'pods','employees','brands','processes','brand_processes',
    'assignments','weekly_offs','holidays'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'CREATE POLICY "Authenticated users can select" ON public.%I
       FOR SELECT TO authenticated USING (true);', tbl);
    EXECUTE format(
      'CREATE POLICY "Managers can insert" ON public.%I
       FOR INSERT TO authenticated WITH CHECK (public.is_manager());', tbl);
    EXECUTE format(
      'CREATE POLICY "Managers can update" ON public.%I
       FOR UPDATE TO authenticated
       USING (public.is_manager()) WITH CHECK (public.is_manager());', tbl);
    EXECUTE format(
      'CREATE POLICY "Managers can delete" ON public.%I
       FOR DELETE TO authenticated USING (public.is_manager());', tbl);
  END LOOP;
END $$;


-- 5-B. CONFIDENTIAL HR TABLES: leaves & employee_availability — managers only
CREATE POLICY "Managers can select leaves"
  ON public.leaves FOR SELECT TO authenticated
  USING (public.is_manager());
CREATE POLICY "Managers can insert leaves"
  ON public.leaves FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update leaves"
  ON public.leaves FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers can delete leaves"
  ON public.leaves FOR DELETE TO authenticated
  USING (public.is_manager());

CREATE POLICY "Managers can select availability"
  ON public.employee_availability FOR SELECT TO authenticated
  USING (public.is_manager());
CREATE POLICY "Managers can insert availability"
  ON public.employee_availability FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY "Managers can update availability"
  ON public.employee_availability FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers can delete availability"
  ON public.employee_availability FOR DELETE TO authenticated
  USING (public.is_manager());


-- 5-C. IMMUTABLE HISTORICAL ROSTER SNAPSHOT TABLES
-- SELECT allowed for all authenticated users.
-- INSERT is denied at the policy level for authenticated users; the SECURITY
--   DEFINER RPCs (save_roster_snapshot / restore_roster_snapshot) run as the
--   function owner (postgres) which bypasses RLS, so they can still write.
-- UPDATE and DELETE policies are intentionally omitted (no policy = deny).
CREATE POLICY "Authenticated users can select versions"
  ON public.roster_versions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can select entries"
  ON public.roster_entries FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can select day results"
  ON public.roster_day_results FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can select conflicts"
  ON public.roster_conflicts FOR SELECT TO authenticated USING (true);


-- 5-D. PROFILES TABLE
CREATE POLICY "Users and managers can select profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager());
CREATE POLICY "Only managers can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_manager()) WITH CHECK (public.is_manager());
CREATE POLICY "Managers can insert profiles"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.is_manager());
CREATE POLICY "Managers can delete profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_manager());


-- ==============================================================================
-- PART 6: IDEMPOTENT & RELATIONAL SEED DATA
-- ==============================================================================

DO $$
DECLARE
  v_proc_cs  UUID;
  v_proc_acc UUID;
  v_proc_ndr UUID;
  v_proc_ret UUID;

  v_pod_alpha UUID;
  v_pod_beta  UUID;
  v_pod_gamma UUID;
  v_pod_delta UUID;
BEGIN

  --------------------------------------------------------------------------
  -- 1. Processes  (standardized codes: CS, ACC, NDR, RET)
  --------------------------------------------------------------------------
  INSERT INTO public.processes (code, name) VALUES
    ('CS',  'Customer Support'),
    ('ACC', 'Abandoned Cart Conversions'),
    ('NDR', 'Non-Delivery Report Management'),
    ('RET', 'Retention Operations')
  ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_proc_cs  FROM public.processes WHERE code = 'CS';
  SELECT id INTO v_proc_acc FROM public.processes WHERE code = 'ACC';
  SELECT id INTO v_proc_ndr FROM public.processes WHERE code = 'NDR';
  SELECT id INTO v_proc_ret FROM public.processes WHERE code = 'RET';

  --------------------------------------------------------------------------
  -- 2. Pods
  --------------------------------------------------------------------------
  INSERT INTO public.pods (name) VALUES
    ('Pod Alpha (Direct Growth)'),
    ('Pod Beta (Enterprise D2C)'),
    ('Pod Gamma (High-Volume Logistics)'),
    ('Pod Delta (Lifestyle & Wellness)')
  ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_pod_alpha FROM public.pods WHERE name = 'Pod Alpha (Direct Growth)';
  SELECT id INTO v_pod_beta  FROM public.pods WHERE name = 'Pod Beta (Enterprise D2C)';
  SELECT id INTO v_pod_gamma FROM public.pods WHERE name = 'Pod Gamma (High-Volume Logistics)';
  SELECT id INTO v_pod_delta FROM public.pods WHERE name = 'Pod Delta (Lifestyle & Wellness)';

  --------------------------------------------------------------------------
  -- 3. 31 Employees (preserves existing IDs via full_name match)
  --------------------------------------------------------------------------
  INSERT INTO public.employees (id, full_name, pod_id, is_active)
  SELECT
    COALESCE(e.id, emp_data.default_id),
    emp_data.full_name,
    emp_data.pod_id,
    true
  FROM (VALUES
    ('20000000-0000-0000-0000-000000000001'::uuid, 'Rahul Sharma',    v_pod_alpha),
    ('20000000-0000-0000-0000-000000000002'::uuid, 'Priya Nair',      v_pod_beta),
    ('20000000-0000-0000-0000-000000000003'::uuid, 'Amit Verma',      v_pod_gamma),
    ('20000000-0000-0000-0000-000000000004'::uuid, 'Sneha Kulkarni',  v_pod_delta),
    ('20000000-0000-0000-0000-000000000005'::uuid, 'Vikram Patel',    v_pod_alpha),
    ('20000000-0000-0000-0000-000000000006'::uuid, 'Ananya Iyer',     v_pod_alpha),
    ('20000000-0000-0000-0000-000000000007'::uuid, 'Rohan Mehta',     v_pod_alpha),
    ('20000000-0000-0000-0000-000000000008'::uuid, 'Neha Gupta',      v_pod_alpha),
    ('20000000-0000-0000-0000-000000000009'::uuid, 'Siddharth Rao',   v_pod_beta),
    ('20000000-0000-0000-0000-000000000010'::uuid, 'Pooja Hegde',     v_pod_beta),
    ('20000000-0000-0000-0000-000000000011'::uuid, 'Arjun Das',       v_pod_beta),
    ('20000000-0000-0000-0000-000000000012'::uuid, 'Tanvi Joshi',     v_pod_beta),
    ('20000000-0000-0000-0000-000000000013'::uuid, 'Karan Malhotra',  v_pod_gamma),
    ('20000000-0000-0000-0000-000000000014'::uuid, 'Divya Pillai',    v_pod_gamma),
    ('20000000-0000-0000-0000-000000000015'::uuid, 'Manish Reddy',    v_pod_gamma),
    ('20000000-0000-0000-0000-000000000016'::uuid, 'Shruti Saxena',   v_pod_gamma),
    ('20000000-0000-0000-0000-000000000017'::uuid, 'Deepak Chawla',   v_pod_delta),
    ('20000000-0000-0000-0000-000000000018'::uuid, 'Meera Sen',       v_pod_delta),
    ('20000000-0000-0000-0000-000000000019'::uuid, 'Gaurav Ghosh',    v_pod_delta),
    ('20000000-0000-0000-0000-000000000020'::uuid, 'Ritu Bhatia',     v_pod_delta),
    ('20000000-0000-0000-0000-000000000021'::uuid, 'Aditya Singh',    v_pod_alpha),
    ('20000000-0000-0000-0000-000000000022'::uuid, 'Swati Deshmukh',  v_pod_beta),
    ('20000000-0000-0000-0000-000000000023'::uuid, 'Varun Kapoor',    v_pod_alpha),
    ('20000000-0000-0000-0000-000000000024'::uuid, 'Ishita Bansal',   v_pod_alpha),
    ('20000000-0000-0000-0000-000000000025'::uuid, 'Nikhil Jain',     v_pod_beta),
    ('20000000-0000-0000-0000-000000000026'::uuid, 'Aarti Sethi',     v_pod_beta),
    ('20000000-0000-0000-0000-000000000027'::uuid, 'Sameer Qureshi',  v_pod_gamma),
    ('20000000-0000-0000-0000-000000000028'::uuid, 'Kriti Sondhi',    v_pod_gamma),
    ('20000000-0000-0000-0000-000000000029'::uuid, 'Harsh Vardhan',   v_pod_delta),
    ('20000000-0000-0000-0000-000000000030'::uuid, 'Pallavi Roy',     v_pod_delta),
    ('20000000-0000-0000-0000-000000000031'::uuid, 'Kavya Menon',     v_pod_alpha)
  ) AS emp_data(default_id, full_name, pod_id)
  LEFT JOIN public.employees e ON e.full_name = emp_data.full_name
  ON CONFLICT (full_name) DO UPDATE SET
    pod_id    = EXCLUDED.pod_id,
    is_active = true;

  -- Appoint pod leads
  UPDATE public.pods SET lead_employee_id =
    (SELECT id FROM public.employees WHERE full_name = 'Rahul Sharma'    LIMIT 1)
  WHERE id = v_pod_alpha;
  UPDATE public.pods SET lead_employee_id =
    (SELECT id FROM public.employees WHERE full_name = 'Priya Nair'      LIMIT 1)
  WHERE id = v_pod_beta;
  UPDATE public.pods SET lead_employee_id =
    (SELECT id FROM public.employees WHERE full_name = 'Amit Verma'      LIMIT 1)
  WHERE id = v_pod_gamma;
  UPDATE public.pods SET lead_employee_id =
    (SELECT id FROM public.employees WHERE full_name = 'Sneha Kulkarni'  LIMIT 1)
  WHERE id = v_pod_delta;

  --------------------------------------------------------------------------
  -- 4. 22 Brands (18 single-resource + 4 multi-resource)
  --------------------------------------------------------------------------
  INSERT INTO public.brands (name, pod_id, is_active) VALUES
    ('Bolt Mobility',        v_pod_alpha, true),
    ('Iris Eyewear',         v_pod_alpha, true),
    ('Jive Audio',           v_pod_alpha, true),
    ('Nova Athleisure',      v_pod_alpha, true),
    ('Orbit Watches',        v_pod_alpha, true),
    ('Chai Craft',           v_pod_beta,  true),
    ('EcoNest Essentials',   v_pod_beta,  true),
    ('Haven Home Decor',     v_pod_beta,  true),
    ('Mythic Brews',         v_pod_beta,  true),
    ('Quirk Collective',     v_pod_beta,  true),
    ('Krave Snacks',         v_pod_gamma, true),
    ('Pulse Fitness',        v_pod_gamma, true),
    ('Root & Stem Greens',   v_pod_gamma, true),
    ('Aura Wellness',        v_pod_delta, true),
    ('Dune Organics',        v_pod_delta, true),
    ('FreshBite Nutrition',  v_pod_delta, true),
    ('Glow Botanics',        v_pod_delta, true),
    ('Lumina Skincare',      v_pod_delta, true),
    ('Stellar Luxe Apparel', v_pod_alpha, true),
    ('Urban Nomad Gear',     v_pod_beta,  true),
    ('Terra Foods Global',   v_pod_gamma, true),
    ('Zenith Living',        v_pod_delta, true)
  ON CONFLICT (name) DO UPDATE SET
    pod_id    = EXCLUDED.pod_id,
    is_active = EXCLUDED.is_active;

  --------------------------------------------------------------------------
  -- 5. 30 Brand-Process slots (relational join; no hardcoded UUIDs)
  --------------------------------------------------------------------------
  INSERT INTO public.brand_processes (brand_id, process_id, min_staff, calendar_rule)
  SELECT b.id, p.id, d.min_staff, d.calendar_rule
  FROM (VALUES
    -- Bolt Mobility: 2 slots
    ('Bolt Mobility',        'CS',  1, '365_days'),
    ('Bolt Mobility',        'ACC', 1, 'no_holidays'),
    -- 17 single-slot brands
    ('Iris Eyewear',         'CS',  1, 'no_sundays_holidays'),
    ('Jive Audio',           'CS',  1, 'no_holidays'),
    ('Nova Athleisure',      'CS',  1, '365_days'),
    ('Orbit Watches',        'CS',  1, 'no_sundays_holidays'),
    ('Chai Craft',           'CS',  1, '365_days'),
    ('EcoNest Essentials',   'CS',  1, 'no_holidays'),
    ('Haven Home Decor',     'CS',  1, 'no_sundays_holidays'),
    ('Mythic Brews',         'CS',  1, 'no_holidays'),
    ('Quirk Collective',     'CS',  1, 'no_sundays_holidays'),
    ('Krave Snacks',         'CS',  1, '365_days'),
    ('Pulse Fitness',        'CS',  1, 'no_holidays'),
    ('Root & Stem Greens',   'CS',  1, 'no_sundays_holidays'),
    ('Aura Wellness',        'CS',  1, '365_days'),
    ('Dune Organics',        'CS',  1, 'no_holidays'),
    ('FreshBite Nutrition',  'CS',  1, 'no_sundays_holidays'),
    ('Glow Botanics',        'CS',  1, '365_days'),
    ('Lumina Skincare',      'CS',  1, 'no_holidays'),
    -- Stellar Luxe Apparel: 3 slots
    ('Stellar Luxe Apparel', 'CS',  1, '365_days'),
    ('Stellar Luxe Apparel', 'ACC', 1, 'no_holidays'),
    ('Stellar Luxe Apparel', 'NDR', 1, 'no_sundays_holidays'),
    -- Urban Nomad Gear: 3 slots (standardized RET)
    ('Urban Nomad Gear',     'CS',  1, '365_days'),
    ('Urban Nomad Gear',     'ACC', 1, 'no_holidays'),
    ('Urban Nomad Gear',     'RET', 1, 'no_sundays_holidays'),
    -- Terra Foods Global: 2 slots (CS min_staff=2)
    ('Terra Foods Global',   'CS',  2, '365_days'),
    ('Terra Foods Global',   'NDR', 1, 'no_sundays_holidays'),
    -- Zenith Living: 3 slots
    ('Zenith Living',        'CS',  1, '365_days'),
    ('Zenith Living',        'ACC', 1, 'no_holidays'),
    ('Zenith Living',        'NDR', 1, 'no_sundays_holidays')
  ) AS d(brand_name, proc_code, min_staff, calendar_rule)
  JOIN public.brands    b ON b.name = d.brand_name
  JOIN public.processes p ON p.code = d.proc_code
  ON CONFLICT (brand_id, process_id) DO UPDATE SET
    min_staff     = EXCLUDED.min_staff,
    calendar_rule = EXCLUDED.calendar_rule,
    is_active     = true;

  --------------------------------------------------------------------------
  -- 6. 31 Assignments (all resolved relationally; no hardcoded UUIDs)
  --------------------------------------------------------------------------
  INSERT INTO public.assignments (employee_id, brand_process_id, is_active, is_primary)
  SELECT e.id, bp.id, d.is_active, d.is_primary
  FROM (VALUES
    ('Vikram Patel',   'Bolt Mobility',        'CS',  true,  true),
    ('Vikram Patel',   'Bolt Mobility',        'ACC', true,  false),
    ('Ananya Iyer',    'Iris Eyewear',         'CS',  true,  true),
    ('Rohan Mehta',    'Jive Audio',           'CS',  true,  true),
    ('Neha Gupta',     'Nova Athleisure',      'CS',  true,  true),
    ('Aditya Singh',   'Orbit Watches',        'CS',  true,  true),
    ('Siddharth Rao',  'Chai Craft',           'CS',  true,  true),
    ('Pooja Hegde',    'EcoNest Essentials',   'CS',  true,  true),
    ('Arjun Das',      'Haven Home Decor',     'CS',  true,  true),
    ('Tanvi Joshi',    'Mythic Brews',         'CS',  true,  true),
    ('Swati Deshmukh', 'Quirk Collective',     'CS',  true,  true),
    ('Karan Malhotra', 'Krave Snacks',         'CS',  true,  true),
    ('Divya Pillai',   'Pulse Fitness',        'CS',  true,  true),
    ('Manish Reddy',   'Root & Stem Greens',   'CS',  true,  true),
    ('Shruti Saxena',  'Aura Wellness',        'CS',  true,  true),
    ('Deepak Chawla',  'Dune Organics',        'CS',  true,  true),
    ('Meera Sen',      'FreshBite Nutrition',  'CS',  true,  true),
    ('Gaurav Ghosh',   'Glow Botanics',        'CS',  true,  true),
    ('Ritu Bhatia',    'Lumina Skincare',      'CS',  true,  true),
    ('Rahul Sharma',   'Stellar Luxe Apparel', 'CS',  true,  true),
    ('Varun Kapoor',   'Stellar Luxe Apparel', 'ACC', true,  true),
    ('Ishita Bansal',  'Stellar Luxe Apparel', 'NDR', true,  true),
    ('Priya Nair',     'Urban Nomad Gear',     'CS',  true,  true),
    ('Nikhil Jain',    'Urban Nomad Gear',     'ACC', true,  true),
    ('Aarti Sethi',    'Urban Nomad Gear',     'RET', true,  true),
    ('Amit Verma',     'Terra Foods Global',   'CS',  true,  true),
    ('Sameer Qureshi', 'Terra Foods Global',   'CS',  true,  true),
    ('Kriti Sondhi',   'Terra Foods Global',   'NDR', true,  true),
    ('Sneha Kulkarni', 'Zenith Living',        'CS',  true,  true),
    ('Harsh Vardhan',  'Zenith Living',        'ACC', true,  true),
    ('Pallavi Roy',    'Zenith Living',        'NDR', true,  true)
    -- Kavya Menon intentionally has NO assignment (unassigned backup)
  ) AS d(emp_name, brand_name, proc_code, is_active, is_primary)
  JOIN public.employees     e  ON e.full_name   = d.emp_name
  JOIN public.brands        b  ON b.name        = d.brand_name
  JOIN public.processes     p  ON p.code        = d.proc_code
  JOIN public.brand_processes bp ON bp.brand_id = b.id AND bp.process_id = p.id
  ON CONFLICT (employee_id, brand_process_id) DO UPDATE SET
    is_active  = EXCLUDED.is_active,
    is_primary = EXCLUDED.is_primary;

  --------------------------------------------------------------------------
  -- 7. Weekly offs (0 = Sunday … 6 = Saturday)
  --------------------------------------------------------------------------
  INSERT INTO public.weekly_offs (employee_id, day_of_week)
  SELECT e.id, d.day_of_week
  FROM (VALUES
    ('Rahul Sharma',   0), ('Priya Nair',     0), ('Amit Verma',     1),
    ('Sneha Kulkarni', 0), ('Vikram Patel',   0), ('Ananya Iyer',    0),
    ('Rohan Mehta',    0), ('Neha Gupta',     2), ('Siddharth Rao',  0),
    ('Pooja Hegde',    0), ('Arjun Das',      0), ('Tanvi Joshi',    0),
    ('Karan Malhotra', 3), ('Divya Pillai',   0), ('Manish Reddy',   0),
    ('Shruti Saxena',  4), ('Deepak Chawla',  0), ('Meera Sen',      0),
    ('Gaurav Ghosh',   5), ('Ritu Bhatia',    0), ('Aditya Singh',   0),
    ('Swati Deshmukh', 0), ('Varun Kapoor',   6), ('Ishita Bansal',  0),
    ('Nikhil Jain',    1), ('Aarti Sethi',    0), ('Sameer Qureshi', 2),
    ('Kriti Sondhi',   0), ('Harsh Vardhan',  3), ('Pallavi Roy',    0),
    ('Kavya Menon',    0)
  ) AS d(emp_name, day_of_week)
  JOIN public.employees e ON e.full_name = d.emp_name
  ON CONFLICT (employee_id, day_of_week) DO NOTHING;

  --------------------------------------------------------------------------
  -- 8. Public holidays 2026
  --------------------------------------------------------------------------
  INSERT INTO public.holidays (name, holiday_date, brand_id)
  SELECT d.name, d.holiday_date::date, NULL
  FROM (VALUES
    ('Republic Day',       '2026-01-26'),
    ('Holi Festival',      '2026-03-03'),
    ('Good Friday',        '2026-04-03'),
    ('Eid ul-Fitr',        '2026-03-20'),
    ('Independence Day',   '2026-08-15'),
    ('Gandhi Jayanti',     '2026-10-02'),
    ('Diwali / Deepavali', '2026-11-08'),
    ('Christmas Day',      '2026-12-25')
  ) AS d(name, holiday_date)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.holidays h
    WHERE  h.name         = d.name
      AND  h.holiday_date = d.holiday_date::date
  );

  --------------------------------------------------------------------------
  -- 9. Seed approved leaves / comp-offs
  --------------------------------------------------------------------------
  INSERT INTO public.leaves (employee_id, status, start_date, end_date, leave_type)
  SELECT e.id, d.status, d.start_date::date, d.end_date::date, d.leave_type
  FROM (VALUES
    ('Vikram Patel',   'approved', '2026-11-12', '2026-11-14', 'planned_leave'),
    ('Sameer Qureshi', 'approved', '2026-11-16', '2026-11-16', 'comp_off'),
    ('Tanvi Joshi',    'pending',  '2026-11-20', '2026-11-22', 'planned_leave'),
    ('Rohan Mehta',    'approved', '2026-11-04', '2026-11-05', 'planned_leave')
  ) AS d(emp_name, status, start_date, end_date, leave_type)
  JOIN public.employees e ON e.full_name = d.emp_name
  WHERE NOT EXISTS (
    SELECT 1 FROM public.leaves l
    WHERE  l.employee_id = e.id AND l.start_date = d.start_date::date
  );

  --------------------------------------------------------------------------
  -- 10. Seed availability block
  --------------------------------------------------------------------------
  INSERT INTO public.employee_availability (employee_id, start_date, end_date)
  SELECT e.id, '2026-11-28'::date, '2026-11-30'::date
  FROM   public.employees e
  WHERE  e.full_name = 'Meera Sen'
    AND  NOT EXISTS (
           SELECT 1 FROM public.employee_availability ea
           WHERE  ea.employee_id = e.id
             AND  ea.start_date  = '2026-11-28'::date
         );

END $$;


-- ==============================================================================
-- PART 7: POST-SEED INTEGRITY VALIDATION
-- Fails loudly (RAISE EXCEPTION) if any assessment count deviates.
-- ==============================================================================
DO $$
DECLARE
  v_emp_count    INTEGER;
  v_brand_count  INTEGER;
  v_pod_count    INTEGER;
  v_proc_count   INTEGER;
  v_bp_count     INTEGER;
  v_assign_count INTEGER;
  v_kavya_id     UUID;
  v_kavya_assign INTEGER;
  v_bad_codes    TEXT;
BEGIN
  -- 1. 31 active employees
  SELECT COUNT(*) INTO v_emp_count
  FROM   public.employees WHERE is_active = true;
  IF v_emp_count <> 31 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 31 active employees, found %.', v_emp_count;
  END IF;

  -- 2. 22 active brands
  SELECT COUNT(*) INTO v_brand_count
  FROM   public.brands WHERE is_active = true;
  IF v_brand_count <> 22 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 22 active brands, found %.', v_brand_count;
  END IF;

  -- 3. 4 operational pods
  SELECT COUNT(*) INTO v_pod_count FROM public.pods;
  IF v_pod_count <> 4 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 4 pods, found %.', v_pod_count;
  END IF;

  -- 4. Exactly 4 processes with correct codes
  SELECT COUNT(*) INTO v_proc_count FROM public.processes;
  IF v_proc_count <> 4 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 4 processes (CS,ACC,NDR,RET), found %.', v_proc_count;
  END IF;
  SELECT string_agg(code, ', ' ORDER BY code) INTO v_bad_codes
  FROM   public.processes
  WHERE  code NOT IN ('CS','ACC','NDR','RET');
  IF v_bad_codes IS NOT NULL THEN
    RAISE EXCEPTION
      'Validation Failed: Non-standard process codes found: %.', v_bad_codes;
  END IF;

  -- 5. 30 active brand-process slots
  SELECT COUNT(*) INTO v_bp_count
  FROM   public.brand_processes WHERE is_active = true;
  IF v_bp_count <> 30 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 30 active brand-process slots, found %.', v_bp_count;
  END IF;

  -- 6. 31 active assignments
  SELECT COUNT(*) INTO v_assign_count
  FROM   public.assignments WHERE is_active = true;
  IF v_assign_count <> 31 THEN
    RAISE EXCEPTION
      'Validation Failed: Expected 31 active assignments, found %.', v_assign_count;
  END IF;

  -- 7. Kavya Menon exists and has 0 active assignments
  SELECT id INTO v_kavya_id
  FROM   public.employees WHERE full_name = 'Kavya Menon';
  IF v_kavya_id IS NULL THEN
    RAISE EXCEPTION 'Validation Failed: Kavya Menon not found in employees.';
  END IF;
  SELECT COUNT(*) INTO v_kavya_assign
  FROM   public.assignments
  WHERE  employee_id = v_kavya_id AND is_active = true;
  IF v_kavya_assign <> 0 THEN
    RAISE EXCEPTION
      'Validation Failed: Kavya Menon must have 0 active assignments, found %.', v_kavya_assign;
  END IF;

  RAISE NOTICE
    'SUCCESS: All assessment counts validated — 31 employees, 22 brands, '
    '4 pods, 4 processes (CS/ACC/NDR/RET), 30 brand-process slots, '
    '31 assignments, Kavya Menon unassigned.';
END $$;