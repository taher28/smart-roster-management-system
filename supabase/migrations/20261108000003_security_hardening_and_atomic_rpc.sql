-- ==============================================================================
-- DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
-- Migration: 20261108000003_security_hardening_and_atomic_rpc.sql
-- Description: Strict RLS policies, viewer default role, and atomic transactional RPCs
-- ==============================================================================

-- 1. Ensure default role in profiles is 'viewer' (not manager)
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'viewer';

-- 2. Update new user trigger to assign 'viewer' role by default
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, role)
  VALUES (NEW.id, 'viewer')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Controlled Manager Promotion Function
-- Only callable by authenticated managers or service role
CREATE OR REPLACE FUNCTION public.promote_user_to_manager(target_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_manager() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Access Denied: Only active managers can promote users.';
  END IF;

  UPDATE public.profiles
  SET role = 'manager'
  WHERE user_id = target_user_id;
END;
$$;

-- 4. Harden is_manager() with explicit safe search_path
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'manager'
  );
$$;

-- 5. Atomic Transactional RPC to Save Roster Snapshot
-- Guarantees atomicity: all tables are committed together or rolled back completely
CREATE OR REPLACE FUNCTION public.save_roster_snapshot(
  p_version_number INTEGER,
  p_roster_month DATE,
  p_status TEXT,
  p_notes TEXT,
  p_entries JSONB,
  p_day_results JSONB,
  p_conflicts JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_version_id UUID;
BEGIN
  -- Security check: Must be manager
  IF NOT public.is_manager() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only managers can save roster versions.';
  END IF;

  -- Create version header
  INSERT INTO public.roster_versions (
    version_number,
    roster_month,
    status,
    notes,
    created_by
  ) VALUES (
    p_version_number,
    p_roster_month,
    p_status,
    p_notes,
    auth.uid()
  )
  RETURNING id INTO v_version_id;

  -- Insert entries atomically
  IF p_entries IS NOT NULL AND jsonb_array_length(p_entries) > 0 THEN
    INSERT INTO public.roster_entries (
      version_id,
      brand_id,
      employee_id,
      work_date
    )
    SELECT
      v_version_id,
      (item->>'brand_id')::UUID,
      (item->>'employee_id')::UUID,
      (item->>'work_date')::DATE
    FROM jsonb_array_elements(p_entries) AS item;
  END IF;

  -- Insert day results atomically
  IF p_day_results IS NOT NULL AND jsonb_array_length(p_day_results) > 0 THEN
    INSERT INTO public.roster_day_results (
      version_id,
      brand_process_id,
      work_date,
      is_open,
      required_staff,
      count
    )
    SELECT
      v_version_id,
      (item->>'brand_process_id')::UUID,
      (item->>'work_date')::DATE,
      COALESCE((item->>'is_open')::BOOLEAN, true),
      COALESCE((item->>'required_staff')::INTEGER, 1),
      COALESCE((item->>'count')::INTEGER, 0)
    FROM jsonb_array_elements(p_day_results) AS item;
  END IF;

  -- Insert conflicts atomically
  IF p_conflicts IS NOT NULL AND jsonb_array_length(p_conflicts) > 0 THEN
    INSERT INTO public.roster_conflicts (
      version_id,
      employee_id,
      brand_process_id,
      work_date,
      code,
      severity,
      explanation,
      recommendation
    )
    SELECT
      v_version_id,
      NULLIF(item->>'employee_id', '')::UUID,
      NULLIF(item->>'brand_process_id', '')::UUID,
      (item->>'work_date')::DATE,
      item->>'code',
      COALESCE(item->>'severity', 'critical'),
      item->>'explanation',
      item->>'recommendation'
    FROM jsonb_array_elements(p_conflicts) AS item;
  END IF;

  RETURN v_version_id;
END;
$$;

-- 6. Atomic RPC to Restore a Previous Version into a New Snapshot
CREATE OR REPLACE FUNCTION public.restore_roster_snapshot(
  p_source_version_id UUID,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_source RECORD;
  v_new_version_id UUID;
  v_next_version_num INTEGER;
BEGIN
  IF NOT public.is_manager() AND auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Unauthorized: Only managers can restore roster versions.';
  END IF;

  SELECT * INTO v_source FROM public.roster_versions WHERE id = p_source_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Source roster version not found.';
  END IF;

  SELECT COALESCE(MAX(version_number), 0) + 1 INTO v_next_version_num
  FROM public.roster_versions
  WHERE roster_month = v_source.roster_month;

  INSERT INTO public.roster_versions (
    version_number,
    roster_month,
    status,
    notes,
    created_by
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
  FROM public.roster_entries
  WHERE version_id = p_source_version_id;

  -- Clone day results
  INSERT INTO public.roster_day_results (version_id, brand_process_id, work_date, is_open, required_staff, count)
  SELECT v_new_version_id, brand_process_id, work_date, is_open, required_staff, count
  FROM public.roster_day_results
  WHERE version_id = p_source_version_id;

  -- Clone conflicts
  INSERT INTO public.roster_conflicts (version_id, employee_id, brand_process_id, work_date, code, severity, explanation, recommendation)
  SELECT v_new_version_id, employee_id, brand_process_id, work_date, code, severity, explanation, recommendation
  FROM public.roster_conflicts
  WHERE version_id = p_source_version_id;

  RETURN v_new_version_id;
END;
$$;

-- 7. Remove all permissive 'OR true' policies and enforce strict RLS
DO $$
DECLARE
  tbl TEXT;
  tables TEXT[] := ARRAY[
    'pods', 'employees', 'brands', 'processes', 'brand_processes',
    'assignments', 'weekly_offs', 'holidays', 'leaves', 'employee_availability',
    'roster_versions', 'roster_entries', 'roster_day_results', 'roster_conflicts'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    -- Drop old loose policies
    EXECUTE format('DROP POLICY IF EXISTS "Allow select for all" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow manager insert" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow manager update" ON public.%I;', tbl);
    EXECUTE format('DROP POLICY IF EXISTS "Allow manager delete" ON public.%I;', tbl);

    -- Clean, hardened policies:
    -- Authenticated users (managers, leads, viewers) can read operational data
    EXECUTE format('CREATE POLICY "Authenticated users can select" ON public.%I FOR SELECT TO authenticated USING (true);', tbl);

    -- Only verified managers can insert, update, or delete
    EXECUTE format('CREATE POLICY "Managers can insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (public.is_manager());', tbl);
    EXECUTE format('CREATE POLICY "Managers can update" ON public.%I FOR UPDATE TO authenticated USING (public.is_manager()) WITH CHECK (public.is_manager());', tbl);
    EXECUTE format('CREATE POLICY "Managers can delete" ON public.%I FOR DELETE TO authenticated USING (public.is_manager());', tbl);
  END LOOP;
END $$;

-- Hardened profiles table RLS policies
DROP POLICY IF EXISTS "Allow select for all" ON public.profiles;
DROP POLICY IF EXISTS "Allow manager insert" ON public.profiles;
DROP POLICY IF EXISTS "Allow manager update" ON public.profiles;
DROP POLICY IF EXISTS "Allow manager delete" ON public.profiles;

-- Users can read their own profile, managers can read all profiles
CREATE POLICY "Users and managers can select profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_manager());

-- Users cannot self-promote; only managers can update profiles
CREATE POLICY "Only managers can update profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_manager())
  WITH CHECK (public.is_manager());
