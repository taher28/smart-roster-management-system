-- ==============================================================================
-- DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
-- Migration: 20261108000002_seed_dataset.sql
-- Description: Realistic Seed Dataset
-- - 4 Operational Pods & 4 Pod Leads
-- - 4 Operational Processes (CS, ACC, NDR, Retention)
-- - 31 Unique Employees (18 single-resource + 12 multi-resource + 1 unassigned backup)
-- - 22 D2C Brands (18 single-resource + 4 multi-resource)
-- - Realistic brand-process calendar rules & staffing requirements
-- - Weekly offs, Public Holidays, Approved Leaves, and Comp-offs
-- ==============================================================================

DO $$
DECLARE
  -- Pod IDs
  p_alpha UUID := '00000000-0000-0000-0000-000000000001';
  p_beta  UUID := '00000000-0000-0000-0000-000000000002';
  p_gamma UUID := '00000000-0000-0000-0000-000000000003';
  p_delta UUID := '00000000-0000-0000-0000-000000000004';

  -- Process IDs
  proc_cs   UUID := '10000000-0000-0000-0000-000000000001';
  proc_acc  UUID := '10000000-0000-0000-0000-000000000002';
  proc_ndr  UUID := '10000000-0000-0000-0000-000000000003';
  proc_ret  UUID := '10000000-0000-0000-0000-000000000004';

BEGIN
  -- ----------------------------------------------------------------------------
  -- 1. SEED PROCESSES
  -- ----------------------------------------------------------------------------
  INSERT INTO public.processes (id, code, name) VALUES
    (proc_cs,  'CS',        'Customer Support'),
    (proc_acc, 'ACC',       'Abandoned Cart Conversions'),
    (proc_ndr, 'NDR',       'Non-Delivery Report Management'),
    (proc_ret, 'Retention', 'Retention Operations')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, code = EXCLUDED.code;

  -- ----------------------------------------------------------------------------
  -- 2. SEED PODS (Initial insert before assigning leads)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.pods (id, name) VALUES
    (p_alpha, 'Pod Alpha (Direct Growth)'),
    (p_beta,  'Pod Beta (Enterprise D2C)'),
    (p_gamma, 'Pod Gamma (High-Volume Logistics)'),
    (p_delta, 'Pod Delta (Lifestyle & Wellness)')
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

  -- ----------------------------------------------------------------------------
  -- 3. SEED 31 EMPLOYEES
  -- 4 Pod Leads:
  --   emp 01: Rahul Sharma (Lead Pod Alpha)
  --   emp 02: Priya Nair (Lead Pod Beta)
  --   emp 03: Amit Verma (Lead Pod Gamma)
  --   emp 04: Sneha Kulkarni (Lead Pod Delta)
  -- 18 Single-Resource Brand Owners:
  --   emp 05 to emp 22
  -- 8 Multi-Resource Brand Members (with leads also assigned):
  --   emp 23 to emp 30
  -- 1 Unassigned Backup Employee:
  --   emp 31: Kavya Menon (Backup Resource / Operational Float)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.employees (id, full_name, pod_id, is_active) VALUES
    -- Leads
    ('20000000-0000-0000-0000-000000000001', 'Rahul Sharma',    p_alpha, true),
    ('20000000-0000-0000-0000-000000000002', 'Priya Nair',      p_beta,  true),
    ('20000000-0000-0000-0000-000000000003', 'Amit Verma',      p_gamma, true),
    ('20000000-0000-0000-0000-000000000004', 'Sneha Kulkarni',  p_delta, true),

    -- Single-resource dedicated managers (18 employees for 18 brands)
    ('20000000-0000-0000-0000-000000000005', 'Vikram Patel',    p_alpha, true),
    ('20000000-0000-0000-0000-000000000006', 'Ananya Iyer',     p_alpha, true),
    ('20000000-0000-0000-0000-000000000007', 'Rohan Mehta',     p_alpha, true),
    ('20000000-0000-0000-0000-000000000008', 'Neha Gupta',      p_alpha, true),
    ('20000000-0000-0000-0000-000000000009', 'Siddharth Rao',   p_beta,  true),
    ('20000000-0000-0000-0000-000000000010', 'Pooja Hegde',     p_beta,  true),
    ('20000000-0000-0000-0000-000000000011', 'Arjun Das',       p_beta,  true),
    ('20000000-0000-0000-0000-000000000012', 'Tanvi Joshi',     p_beta,  true),
    ('20000000-0000-0000-0000-000000000013', 'Karan Malhotra',  p_gamma, true),
    ('20000000-0000-0000-0000-000000000014', 'Divya Pillai',    p_gamma, true),
    ('20000000-0000-0000-0000-000000000015', 'Manish Reddy',    p_gamma, true),
    ('20000000-0000-0000-0000-000000000016', 'Shruti Saxena',   p_gamma, true),
    ('20000000-0000-0000-0000-000000000017', 'Deepak Chawla',   p_delta, true),
    ('20000000-0000-0000-0000-000000000018', 'Meera Sen',       p_delta, true),
    ('20000000-0000-0000-0000-000000000019', 'Gaurav Ghosh',    p_delta, true),
    ('20000000-0000-0000-0000-000000000020', 'Ritu Bhatia',     p_delta, true),
    ('20000000-0000-0000-0000-000000000021', 'Aditya Singh',    p_alpha, true),
    ('20000000-0000-0000-0000-000000000022', 'Swati Deshmukh',  p_beta,  true),

    -- Multi-resource brand team members (8 specialists who pair with leads/other specialists for 4 brands)
    ('20000000-0000-0000-0000-000000000023', 'Varun Kapoor',    p_alpha, true),
    ('20000000-0000-0000-0000-000000000024', 'Ishita Bansal',   p_alpha, true),
    ('20000000-0000-0000-0000-000000000025', 'Nikhil Jain',     p_beta,  true),
    ('20000000-0000-0000-0000-000000000026', 'Aarti Sethi',     p_beta,  true),
    ('20000000-0000-0000-0000-000000000027', 'Sameer Qureshi',  p_gamma, true),
    ('20000000-0000-0000-0000-000000000028', 'Kriti Sondhi',    p_gamma, true),
    ('20000000-0000-0000-0000-000000000029', 'Harsh Vardhan',   p_delta, true),
    ('20000000-0000-0000-0000-000000000030', 'Pallavi Roy',     p_delta, true),

    -- 1 Unassigned Backup Employee (Section 4 requirement)
    ('20000000-0000-0000-0000-000000000031', 'Kavya Menon',     p_alpha, true)
  ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, pod_id = EXCLUDED.pod_id;

  -- Update Pod Leads
  UPDATE public.pods SET lead_employee_id = '20000000-0000-0000-0000-000000000001' WHERE id = p_alpha;
  UPDATE public.pods SET lead_employee_id = '20000000-0000-0000-0000-000000000002' WHERE id = p_beta;
  UPDATE public.pods SET lead_employee_id = '20000000-0000-0000-0000-000000000003' WHERE id = p_gamma;
  UPDATE public.pods SET lead_employee_id = '20000000-0000-0000-0000-000000000004' WHERE id = p_delta;

  -- ----------------------------------------------------------------------------
  -- 4. SEED 22 BRANDS (18 Single-Resource + 4 Multi-Resource)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.brands (id, name, pod_id, is_active) VALUES
    -- Single-Resource Brands (18 brands)
    ('30000000-0000-0000-0000-000000000001', 'Bolt Mobility',        p_alpha, true),
    ('30000000-0000-0000-0000-000000000002', 'Iris Eyewear',         p_alpha, true),
    ('30000000-0000-0000-0000-000000000003', 'Jive Audio',           p_alpha, true),
    ('30000000-0000-0000-0000-000000000004', 'Nova Athleisure',      p_alpha, true),
    ('30000000-0000-0000-0000-000000000005', 'Orbit Watches',        p_alpha, true),
    ('30000000-0000-0000-0000-000000000006', 'Chai Craft',           p_beta,  true),
    ('30000000-0000-0000-0000-000000000007', 'EcoNest Essentials',   p_beta,  true),
    ('30000000-0000-0000-0000-000000000008', 'Haven Home Decor',     p_beta,  true),
    ('30000000-0000-0000-0000-000000000009', 'Mythic Brews',         p_beta,  true),
    ('30000000-0000-0000-0000-000000000010', 'Quirk Collective',     p_beta,  true),
    ('30000000-0000-0000-0000-000000000011', 'Krave Snacks',         p_gamma, true),
    ('30000000-0000-0000-0000-000000000012', 'Pulse Fitness',        p_gamma, true),
    ('30000000-0000-0000-0000-000000000013', 'Root & Stem Greens',   p_gamma, true),
    ('30000000-0000-0000-0000-000000000014', 'Aura Wellness',        p_delta, true),
    ('30000000-0000-0000-0000-000000000015', 'Dune Organics',        p_delta, true),
    ('30000000-0000-0000-0000-000000000016', 'FreshBite Nutrition',  p_delta, true),
    ('30000000-0000-0000-0000-000000000017', 'Glow Botanics',        p_delta, true),
    ('30000000-0000-0000-0000-000000000018', 'Lumina Skincare',      p_delta, true),

    -- Multi-Resource Brands (4 brands, 3 employees assigned to each)
    ('30000000-0000-0000-0000-000000000019', 'Stellar Luxe Apparel', p_alpha, true),
    ('30000000-0000-0000-0000-000000000020', 'Urban Nomad Gear',     p_beta,  true),
    ('30000000-0000-0000-0000-000000000021', 'Terra Foods Global',   p_gamma, true),
    ('30000000-0000-0000-0000-000000000022', 'Zenith Living',        p_delta, true)
  ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, pod_id = EXCLUDED.pod_id;

  -- ----------------------------------------------------------------------------
  -- 5. SEED BRAND PROCESSES & OPERATING CALENDARS
  -- Operating calendars:
  -- - '365_days': 365 days a year, including Sundays and public holidays
  -- - 'no_holidays': Daily except public holidays
  -- - 'no_sundays_holidays': Daily except Sundays and public holidays
  -- ----------------------------------------------------------------------------
  INSERT INTO public.brand_processes (id, brand_id, process_id, min_staff, calendar_rule) VALUES
    -- Single-resource brands: assigned employee covers CS & ACC or CS & NDR
    ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', proc_acc, 1, 'no_holidays'),

    ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000003', proc_cs,  1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000004', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000005', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000007', '30000000-0000-0000-0000-000000000006', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000008', '30000000-0000-0000-0000-000000000007', proc_cs,  1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000009', '30000000-0000-0000-0000-000000000008', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000010', '30000000-0000-0000-0000-000000000009', proc_cs,  1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000011', '30000000-0000-0000-0000-000000000010', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000012', '30000000-0000-0000-0000-000000000011', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000013', '30000000-0000-0000-0000-000000000012', proc_cs,  1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000014', '30000000-0000-0000-0000-000000000013', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000015', '30000000-0000-0000-0000-000000000014', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000016', '30000000-0000-0000-0000-000000000015', proc_cs,  1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000017', '30000000-0000-0000-0000-000000000016', proc_cs,  1, 'no_sundays_holidays'),
    ('40000000-0000-0000-0000-000000000018', '30000000-0000-0000-0000-000000000017', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000019', '30000000-0000-0000-0000-000000000018', proc_cs,  1, 'no_holidays'),

    -- Multi-resource Brand 19 (Stellar Luxe Apparel): 3 processes, min staff 1
    ('40000000-0000-0000-0000-000000000020', '30000000-0000-0000-0000-000000000019', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000021', '30000000-0000-0000-0000-000000000019', proc_acc, 1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000022', '30000000-0000-0000-0000-000000000019', proc_ndr, 1, 'no_sundays_holidays'),

    -- Multi-resource Brand 20 (Urban Nomad Gear): 3 processes
    ('40000000-0000-0000-0000-000000000023', '30000000-0000-0000-0000-000000000020', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000024', '30000000-0000-0000-0000-000000000020', proc_acc, 1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000025', '30000000-0000-0000-0000-000000000020', proc_ret, 1, 'no_sundays_holidays'),

    -- Multi-resource Brand 21 (Terra Foods Global): CS has min_staff 2 on 365_days
    ('40000000-0000-0000-0000-000000000026', '30000000-0000-0000-0000-000000000021', proc_cs,  2, '365_days'),
    ('40000000-0000-0000-0000-000000000027', '30000000-0000-0000-0000-000000000021', proc_ndr, 1, 'no_sundays_holidays'),

    -- Multi-resource Brand 22 (Zenith Living): CS, ACC, NDR
    ('40000000-0000-0000-0000-000000000028', '30000000-0000-0000-0000-000000000022', proc_cs,  1, '365_days'),
    ('40000000-0000-0000-0000-000000000029', '30000000-0000-0000-0000-000000000022', proc_acc, 1, 'no_holidays'),
    ('40000000-0000-0000-0000-000000000030', '30000000-0000-0000-0000-000000000022', proc_ndr, 1, 'no_sundays_holidays')
  ON CONFLICT (brand_id, process_id) DO UPDATE SET min_staff = EXCLUDED.min_staff, calendar_rule = EXCLUDED.calendar_rule;

  -- ----------------------------------------------------------------------------
  -- 6. SEED ASSIGNMENTS (30 active employee assignments)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.assignments (employee_id, brand_process_id, is_active, is_primary) VALUES
    -- 18 Single-resource brand assignments (emp 5 to 22)
    ('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000001', true, true), -- Vikram -> Bolt Mobility CS
    ('20000000-0000-0000-0000-000000000005', '40000000-0000-0000-0000-000000000002', true, false),-- Vikram -> Bolt Mobility ACC (multi-process!)
    ('20000000-0000-0000-0000-000000000006', '40000000-0000-0000-0000-000000000003', true, true), -- Ananya -> Iris CS
    ('20000000-0000-0000-0000-000000000007', '40000000-0000-0000-0000-000000000004', true, true), -- Rohan -> Jive CS
    ('20000000-0000-0000-0000-000000000008', '40000000-0000-0000-0000-000000000005', true, true), -- Neha -> Nova CS
    ('20000000-0000-0000-0000-000000000021', '40000000-0000-0000-0000-000000000006', true, true), -- Aditya -> Orbit CS
    ('20000000-0000-0000-0000-000000000009', '40000000-0000-0000-0000-000000000007', true, true), -- Siddharth -> Chai CS
    ('20000000-0000-0000-0000-000000000010', '40000000-0000-0000-0000-000000000008', true, true), -- Pooja -> EcoNest CS
    ('20000000-0000-0000-0000-000000000011', '40000000-0000-0000-0000-000000000009', true, true), -- Arjun -> Haven CS
    ('20000000-0000-0000-0000-000000000012', '40000000-0000-0000-0000-000000000010', true, true), -- Tanvi -> Mythic CS
    ('20000000-0000-0000-0000-000000000022', '40000000-0000-0000-0000-000000000011', true, true), -- Swati -> Quirk CS
    ('20000000-0000-0000-0000-000000000013', '40000000-0000-0000-0000-000000000012', true, true), -- Karan -> Krave CS
    ('20000000-0000-0000-0000-000000000014', '40000000-0000-0000-0000-000000000013', true, true), -- Divya -> Pulse CS
    ('20000000-0000-0000-0000-000000000015', '40000000-0000-0000-0000-000000000014', true, true), -- Manish -> Root & Stem CS
    ('20000000-0000-0000-0000-000000000016', '40000000-0000-0000-0000-000000000015', true, true), -- Shruti -> Aura CS
    ('20000000-0000-0000-0000-000000000017', '40000000-0000-0000-0000-000000000016', true, true), -- Deepak -> Dune CS
    ('20000000-0000-0000-0000-000000000018', '40000000-0000-0000-0000-000000000017', true, true), -- Meera -> FreshBite CS
    ('20000000-0000-0000-0000-000000000019', '40000000-0000-0000-0000-000000000018', true, true), -- Gaurav -> Glow Botanics CS
    ('20000000-0000-0000-0000-000000000020', '40000000-0000-0000-0000-000000000019', true, true), -- Ritu -> Lumina CS

    -- Multi-resource Brand 19 (Stellar Luxe): Rahul (Lead), Varun, Ishita
    ('20000000-0000-0000-0000-000000000001', '40000000-0000-0000-0000-000000000020', true, true),  -- Rahul -> Stellar CS
    ('20000000-0000-0000-0000-000000000023', '40000000-0000-0000-0000-000000000021', true, true),  -- Varun -> Stellar ACC
    ('20000000-0000-0000-0000-000000000024', '40000000-0000-0000-0000-000000000022', true, true),  -- Ishita -> Stellar NDR

    -- Multi-resource Brand 20 (Urban Nomad): Priya (Lead), Nikhil, Aarti
    ('20000000-0000-0000-0000-000000000002', '40000000-0000-0000-0000-000000000023', true, true),  -- Priya -> Urban Nomad CS
    ('20000000-0000-0000-0000-000000000025', '40000000-0000-0000-0000-000000000024', true, true),  -- Nikhil -> Urban Nomad ACC
    ('20000000-0000-0000-0000-000000000026', '40000000-0000-0000-0000-000000000025', true, true),  -- Aarti -> Urban Nomad Retention

    -- Multi-resource Brand 21 (Terra Foods): Amit (Lead), Sameer, Kriti (Min staff 2 for CS!)
    ('20000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000026', true, true),  -- Amit -> Terra Foods CS
    ('20000000-0000-0000-0000-000000000027', '40000000-0000-0000-0000-000000000026', true, true),  -- Sameer -> Terra Foods CS (2nd required staff)
    ('20000000-0000-0000-0000-000000000028', '40000000-0000-0000-0000-000000000027', true, true),  -- Kriti -> Terra Foods NDR

    -- Multi-resource Brand 22 (Zenith Living): Sneha (Lead), Harsh, Pallavi
    ('20000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000028', true, true),  -- Sneha -> Zenith CS
    ('20000000-0000-0000-0000-000000000029', '40000000-0000-0000-0000-000000000029', true, true),  -- Harsh -> Zenith ACC
    ('20000000-0000-0000-0000-000000000030', '40000000-0000-0000-0000-000000000030', true, true)   -- Pallavi -> Zenith NDR
  ON CONFLICT (employee_id, brand_process_id) DO UPDATE SET is_active = EXCLUDED.is_active, is_primary = EXCLUDED.is_primary;

  -- ----------------------------------------------------------------------------
  -- 7. SEED WEEKLY OFFS (0 = Sunday, 1 = Monday, ..., 6 = Saturday)
  -- Staggered distribution so coverage exists every day of the week
  -- ----------------------------------------------------------------------------
  INSERT INTO public.weekly_offs (employee_id, day_of_week) VALUES
    ('20000000-0000-0000-0000-000000000001', 0), -- Rahul (Sun)
    ('20000000-0000-0000-0000-000000000002', 0), -- Priya (Sun)
    ('20000000-0000-0000-0000-000000000003', 1), -- Amit (Mon)
    ('20000000-0000-0000-0000-000000000004', 0), -- Sneha (Sun)
    ('20000000-0000-0000-0000-000000000005', 0), -- Vikram (Sun)
    ('20000000-0000-0000-0000-000000000006', 0), -- Ananya (Sun)
    ('20000000-0000-0000-0000-000000000007', 0), -- Rohan (Sun)
    ('20000000-0000-0000-0000-000000000008', 2), -- Neha (Tue)
    ('20000000-0000-0000-0000-000000000009', 0), -- Siddharth (Sun)
    ('20000000-0000-0000-0000-000000000010', 0), -- Pooja (Sun)
    ('20000000-0000-0000-0000-000000000011', 0), -- Arjun (Sun)
    ('20000000-0000-0000-0000-000000000012', 0), -- Tanvi (Sun)
    ('20000000-0000-0000-0000-000000000013', 3), -- Karan (Wed)
    ('20000000-0000-0000-0000-000000000014', 0), -- Divya (Sun)
    ('20000000-0000-0000-0000-000000000015', 0), -- Manish (Sun)
    ('20000000-0000-0000-0000-000000000016', 4), -- Shruti (Thu)
    ('20000000-0000-0000-0000-000000000017', 0), -- Deepak (Sun)
    ('20000000-0000-0000-0000-000000000018', 0), -- Meera (Sun)
    ('20000000-0000-0000-0000-000000000019', 5), -- Gaurav (Fri)
    ('20000000-0000-0000-0000-000000000020', 0), -- Ritu (Sun)
    ('20000000-0000-0000-0000-000000000021', 0), -- Aditya (Sun)
    ('20000000-0000-0000-0000-000000000022', 0), -- Swati (Sun)
    ('20000000-0000-0000-0000-000000000023', 6), -- Varun (Sat)
    ('20000000-0000-0000-0000-000000000024', 0), -- Ishita (Sun)
    ('20000000-0000-0000-0000-000000000025', 1), -- Nikhil (Mon)
    ('20000000-0000-0000-0000-000000000026', 0), -- Aarti (Sun)
    ('20000000-0000-0000-0000-000000000027', 2), -- Sameer (Tue)
    ('20000000-0000-0000-0000-000000000028', 0), -- Kriti (Sun)
    ('20000000-0000-0000-0000-000000000029', 3), -- Harsh (Wed)
    ('20000000-0000-0000-0000-000000000030', 0), -- Pallavi (Sun)
    ('20000000-0000-0000-0000-000000000031', 0)  -- Kavya Backup (Sun)
  ON CONFLICT (employee_id, day_of_week) DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 8. SEED PUBLIC HOLIDAYS (2026/2027)
  -- ----------------------------------------------------------------------------
  INSERT INTO public.holidays (name, holiday_date, brand_id) VALUES
    ('Republic Day',       '2026-01-26', NULL),
    ('Holi',               '2026-03-03', NULL),
    ('Good Friday',        '2026-04-03', NULL),
    ('Eid ul-Fitr',        '2026-03-20', NULL),
    ('Independence Day',   '2026-08-15', NULL),
    ('Gandhi Jayanti',     '2026-10-02', NULL),
    ('Diwali / Deepavali', '2026-11-08', NULL),
    ('Christmas Day',      '2026-12-25', NULL)
  ON CONFLICT DO NOTHING;

  -- ----------------------------------------------------------------------------
  -- 9. SEED REALISTIC APPROVED LEAVES & COMP-OFFS
  -- Useful for demonstrating coverage conflict when sole resource takes leave!
  -- ----------------------------------------------------------------------------
  INSERT INTO public.leaves (employee_id, status, start_date, end_date, leave_type) VALUES
    -- Vikram (sole manager of Bolt Mobility) on approved leave Nov 12-14 -> triggers conflict demo!
    ('20000000-0000-0000-0000-000000000005', 'approved', '2026-11-12', '2026-11-14', 'planned_leave'),
    -- Sameer on comp-off on Nov 16
    ('20000000-0000-0000-0000-000000000027', 'approved', '2026-11-16', '2026-11-16', 'comp_off'),
    -- Pending leave for Tanvi Joshi
    ('20000000-0000-0000-0000-000000000012', 'pending',  '2026-11-20', '2026-11-22', 'planned_leave'),
    -- Approved leave for Rohan Mehta
    ('20000000-0000-0000-0000-000000000007', 'approved', '2026-11-04', '2026-11-05', 'planned_leave')
  ON CONFLICT DO NOTHING;

END $$;
