/**
 * DATASTRAW TECHNOLOGIES - SMART ROSTER MANAGEMENT SYSTEM
 * COMPLETE REALISTIC DATASET (31 Employees, 22 Brands, 4 Pods, 4 Processes)
 */

export const INITIAL_PODS = [
  { id: '00000000-0000-0000-0000-000000000001', name: 'Pod Alpha (Direct Growth)', lead_employee_id: '20000000-0000-0000-0000-000000000001' },
  { id: '00000000-0000-0000-0000-000000000002', name: 'Pod Beta (Enterprise D2C)', lead_employee_id: '20000000-0000-0000-0000-000000000002' },
  { id: '00000000-0000-0000-0000-000000000003', name: 'Pod Gamma (High-Volume Logistics)', lead_employee_id: '20000000-0000-0000-0000-000000000003' },
  { id: '00000000-0000-0000-0000-000000000004', name: 'Pod Delta (Lifestyle & Wellness)', lead_employee_id: '20000000-0000-0000-0000-000000000004' }
];

export const INITIAL_PROCESSES = [
  { id: '10000000-0000-0000-0000-000000000001', code: 'CS', name: 'Customer Support', description: 'Real-time multi-channel client inquiries, chat, and email tickets.' },
  { id: '10000000-0000-0000-0000-000000000002', code: 'ACC', name: 'Abandoned Cart Conversions', description: 'Outreach and checkout recovery via WhatsApp, SMS, and email.' },
  { id: '10000000-0000-0000-0000-000000000003', code: 'NDR', name: 'Non-Delivery Report Management', description: 'Courier re-attempts, address validation, and RTO reduction.' },
  { id: '10000000-0000-0000-0000-000000000004', code: 'RET', name: 'Retention Operations', description: 'VIP client follow-ups, win-back flows, and feedback loops.' }
];

export const INITIAL_EMPLOYEES = [
  // 4 Pod Leads
  { id: '20000000-0000-0000-0000-000000000001', full_name: 'Rahul Sharma', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Lead (Pod Alpha)' },
  { id: '20000000-0000-0000-0000-000000000002', full_name: 'Priya Nair', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Lead (Pod Beta)' },
  { id: '20000000-0000-0000-0000-000000000003', full_name: 'Amit Verma', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Lead (Pod Gamma)' },
  { id: '20000000-0000-0000-0000-000000000004', full_name: 'Sneha Kulkarni', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Lead (Pod Delta)' },

  // 18 Dedicated Single-Resource Brand Managers
  { id: '20000000-0000-0000-0000-000000000005', full_name: 'Vikram Patel', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000006', full_name: 'Ananya Iyer', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000007', full_name: 'Rohan Mehta', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000008', full_name: 'Neha Gupta', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000009', full_name: 'Siddharth Rao', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000010', full_name: 'Pooja Hegde', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000011', full_name: 'Arjun Das', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000012', full_name: 'Tanvi Joshi', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000013', full_name: 'Karan Malhotra', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000014', full_name: 'Divya Pillai', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000015', full_name: 'Manish Reddy', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000016', full_name: 'Shruti Saxena', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000017', full_name: 'Deepak Chawla', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000018', full_name: 'Meera Sen', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000019', full_name: 'Gaurav Ghosh', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000020', full_name: 'Ritu Bhatia', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000021', full_name: 'Aditya Singh', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operations Specialist' },
  { id: '20000000-0000-0000-0000-000000000022', full_name: 'Swati Deshmukh', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Operations Specialist' },

  // Multi-Resource Brand Members
  { id: '20000000-0000-0000-0000-000000000023', full_name: 'Varun Kapoor', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Support Specialist' },
  { id: '20000000-0000-0000-0000-000000000024', full_name: 'Ishita Bansal', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Logistics Specialist' },
  { id: '20000000-0000-0000-0000-000000000025', full_name: 'Nikhil Jain', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Recovery Specialist' },
  { id: '20000000-0000-0000-0000-000000000026', full_name: 'Aarti Sethi', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, role_title: 'Retention Specialist' },
  { id: '20000000-0000-0000-0000-000000000027', full_name: 'Sameer Qureshi', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'Support Specialist' },
  { id: '20000000-0000-0000-0000-000000000028', full_name: 'Kriti Sondhi', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, role_title: 'NDR Specialist' },
  { id: '20000000-0000-0000-0000-000000000029', full_name: 'Harsh Vardhan', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'Support Specialist' },
  { id: '20000000-0000-0000-0000-000000000030', full_name: 'Pallavi Roy', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, role_title: 'NDR Specialist' },

  // 1 Unassigned Backup Employee
  { id: '20000000-0000-0000-0000-000000000031', full_name: 'Kavya Menon', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, role_title: 'Operational Backup & Float Specialist' }
];

export const INITIAL_BRANDS = [
  // 18 Single-Resource Brands
  { id: '30000000-0000-0000-0000-000000000001', name: 'Bolt Mobility', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000002', name: 'Iris Eyewear', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000003', name: 'Jive Audio', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000004', name: 'Nova Athleisure', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000005', name: 'Orbit Watches', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000006', name: 'Chai Craft', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000007', name: 'EcoNest Essentials', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000008', name: 'Haven Home Decor', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000009', name: 'Mythic Brews', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000010', name: 'Quirk Collective', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000011', name: 'Krave Snacks', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000012', name: 'Pulse Fitness', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000013', name: 'Root & Stem Greens', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000014', name: 'Aura Wellness', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000015', name: 'Dune Organics', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000016', name: 'FreshBite Nutrition', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000017', name: 'Glow Botanics', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'single' },
  { id: '30000000-0000-0000-0000-000000000018', name: 'Lumina Skincare', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'single' },

  // 4 Multi-Resource Brands
  { id: '30000000-0000-0000-0000-000000000019', name: 'Stellar Luxe Apparel', pod_id: '00000000-0000-0000-0000-000000000001', is_active: true, type: 'multi' },
  { id: '30000000-0000-0000-0000-000000000020', name: 'Urban Nomad Gear', pod_id: '00000000-0000-0000-0000-000000000002', is_active: true, type: 'multi' },
  { id: '30000000-0000-0000-0000-000000000021', name: 'Terra Foods Global', pod_id: '00000000-0000-0000-0000-000000000003', is_active: true, type: 'multi' },
  { id: '30000000-0000-0000-0000-000000000022', name: 'Zenith Living', pod_id: '00000000-0000-0000-0000-000000000004', is_active: true, type: 'multi' }
];

export const INITIAL_BRAND_PROCESSES = [
  // Bolt Mobility (Single) - CS & ACC
  { id: '40000000-0000-0000-0000-000000000001', brand_id: '30000000-0000-0000-0000-000000000001', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000002', brand_id: '30000000-0000-0000-0000-000000000001', process_id: '10000000-0000-0000-0000-000000000002', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },

  // Iris Eyewear (Single) - CS (no sundays/holidays)
  { id: '40000000-0000-0000-0000-000000000003', brand_id: '30000000-0000-0000-0000-000000000002', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000004', brand_id: '30000000-0000-0000-0000-000000000003', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000005', brand_id: '30000000-0000-0000-0000-000000000004', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000006', brand_id: '30000000-0000-0000-0000-000000000005', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000007', brand_id: '30000000-0000-0000-0000-000000000006', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000008', brand_id: '30000000-0000-0000-0000-000000000007', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000009', brand_id: '30000000-0000-0000-0000-000000000008', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000010', brand_id: '30000000-0000-0000-0000-000000000009', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000011', brand_id: '30000000-0000-0000-0000-000000000010', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000012', brand_id: '30000000-0000-0000-0000-000000000011', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000013', brand_id: '30000000-0000-0000-0000-000000000012', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000014', brand_id: '30000000-0000-0000-0000-000000000013', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000015', brand_id: '30000000-0000-0000-0000-000000000014', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000016', brand_id: '30000000-0000-0000-0000-000000000015', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000017', brand_id: '30000000-0000-0000-0000-000000000016', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000018', brand_id: '30000000-0000-0000-0000-000000000017', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000019', brand_id: '30000000-0000-0000-0000-000000000018', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },

  // Multi-Resource: Stellar Luxe Apparel (CS, ACC, NDR)
  { id: '40000000-0000-0000-0000-000000000020', brand_id: '30000000-0000-0000-0000-000000000019', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000021', brand_id: '30000000-0000-0000-0000-000000000019', process_id: '10000000-0000-0000-0000-000000000002', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000022', brand_id: '30000000-0000-0000-0000-000000000019', process_id: '10000000-0000-0000-0000-000000000003', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },

  // Multi-Resource: Urban Nomad Gear (CS, ACC, Retention)
  { id: '40000000-0000-0000-0000-000000000023', brand_id: '30000000-0000-0000-0000-000000000020', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000024', brand_id: '30000000-0000-0000-0000-000000000020', process_id: '10000000-0000-0000-0000-000000000002', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000025', brand_id: '30000000-0000-0000-0000-000000000020', process_id: '10000000-0000-0000-0000-000000000004', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },

  // Multi-Resource: Terra Foods Global (CS min_staff=2, NDR)
  { id: '40000000-0000-0000-0000-000000000026', brand_id: '30000000-0000-0000-0000-000000000021', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 2, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000027', brand_id: '30000000-0000-0000-0000-000000000021', process_id: '10000000-0000-0000-0000-000000000003', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },

  // Multi-Resource: Zenith Living (CS, ACC, NDR)
  { id: '40000000-0000-0000-0000-000000000028', brand_id: '30000000-0000-0000-0000-000000000022', process_id: '10000000-0000-0000-0000-000000000001', min_staff: 1, calendar_rule: '365_days', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000029', brand_id: '30000000-0000-0000-0000-000000000022', process_id: '10000000-0000-0000-0000-000000000002', min_staff: 1, calendar_rule: 'no_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true },
  { id: '40000000-0000-0000-0000-000000000030', brand_id: '30000000-0000-0000-0000-000000000022', process_id: '10000000-0000-0000-0000-000000000003', min_staff: 1, calendar_rule: 'no_sundays_holidays', shift_start: '09:00:00', shift_end: '18:00:00', is_active: true }
];

export const INITIAL_ASSIGNMENTS = [
  // 18 Single-Resource Brand Assignments
  { id: '50000000-0000-0000-0000-000000000001', employee_id: '20000000-0000-0000-0000-000000000005', brand_process_id: '40000000-0000-0000-0000-000000000001', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000002', employee_id: '20000000-0000-0000-0000-000000000005', brand_process_id: '40000000-0000-0000-0000-000000000002', is_active: true, is_primary: false }, // Multi-process
  { id: '50000000-0000-0000-0000-000000000003', employee_id: '20000000-0000-0000-0000-000000000006', brand_process_id: '40000000-0000-0000-0000-000000000003', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000004', employee_id: '20000000-0000-0000-0000-000000000007', brand_process_id: '40000000-0000-0000-0000-000000000004', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000005', employee_id: '20000000-0000-0000-0000-000000000008', brand_process_id: '40000000-0000-0000-0000-000000000005', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000006', employee_id: '20000000-0000-0000-0000-000000000021', brand_process_id: '40000000-0000-0000-0000-000000000006', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000007', employee_id: '20000000-0000-0000-0000-000000000009', brand_process_id: '40000000-0000-0000-0000-000000000007', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000008', employee_id: '20000000-0000-0000-0000-000000000010', brand_process_id: '40000000-0000-0000-0000-000000000008', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000009', employee_id: '20000000-0000-0000-0000-000000000011', brand_process_id: '40000000-0000-0000-0000-000000000009', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000010', employee_id: '20000000-0000-0000-0000-000000000012', brand_process_id: '40000000-0000-0000-0000-000000000010', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000011', employee_id: '20000000-0000-0000-0000-000000000022', brand_process_id: '40000000-0000-0000-0000-000000000011', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000012', employee_id: '20000000-0000-0000-0000-000000000013', brand_process_id: '40000000-0000-0000-0000-000000000012', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000013', employee_id: '20000000-0000-0000-0000-000000000014', brand_process_id: '40000000-0000-0000-0000-000000000013', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000014', employee_id: '20000000-0000-0000-0000-000000000015', brand_process_id: '40000000-0000-0000-0000-000000000014', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000015', employee_id: '20000000-0000-0000-0000-000000000016', brand_process_id: '40000000-0000-0000-0000-000000000015', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000016', employee_id: '20000000-0000-0000-0000-000000000017', brand_process_id: '40000000-0000-0000-0000-000000000016', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000017', employee_id: '20000000-0000-0000-0000-000000000018', brand_process_id: '40000000-0000-0000-0000-000000000017', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000018', employee_id: '20000000-0000-0000-0000-000000000019', brand_process_id: '40000000-0000-0000-0000-000000000018', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000019', employee_id: '20000000-0000-0000-0000-000000000020', brand_process_id: '40000000-0000-0000-0000-000000000019', is_active: true, is_primary: true },

  // Stellar Luxe (3 employees)
  { id: '50000000-0000-0000-0000-000000000020', employee_id: '20000000-0000-0000-0000-000000000001', brand_process_id: '40000000-0000-0000-0000-000000000020', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000021', employee_id: '20000000-0000-0000-0000-000000000023', brand_process_id: '40000000-0000-0000-0000-000000000021', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000022', employee_id: '20000000-0000-0000-0000-000000000024', brand_process_id: '40000000-0000-0000-0000-000000000022', is_active: true, is_primary: true },

  // Urban Nomad (3 employees)
  { id: '50000000-0000-0000-0000-000000000023', employee_id: '20000000-0000-0000-0000-000000000002', brand_process_id: '40000000-0000-0000-0000-000000000023', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000024', employee_id: '20000000-0000-0000-0000-000000000025', brand_process_id: '40000000-0000-0000-0000-000000000024', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000025', employee_id: '20000000-0000-0000-0000-000000000026', brand_process_id: '40000000-0000-0000-0000-000000000025', is_active: true, is_primary: true },

  // Terra Foods (3 employees: Amit + Sameer on CS [min_staff 2], Kriti on NDR)
  { id: '50000000-0000-0000-0000-000000000026', employee_id: '20000000-0000-0000-0000-000000000003', brand_process_id: '40000000-0000-0000-0000-000000000026', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000027', employee_id: '20000000-0000-0000-0000-000000000027', brand_process_id: '40000000-0000-0000-0000-000000000026', is_active: true, is_primary: false },
  { id: '50000000-0000-0000-0000-000000000028', employee_id: '20000000-0000-0000-0000-000000000028', brand_process_id: '40000000-0000-0000-0000-000000000027', is_active: true, is_primary: true },

  // Zenith Living (3 employees: Sneha, Harsh, Pallavi)
  { id: '50000000-0000-0000-0000-000000000029', employee_id: '20000000-0000-0000-0000-000000000004', brand_process_id: '40000000-0000-0000-0000-000000000028', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000030', employee_id: '20000000-0000-0000-0000-000000000029', brand_process_id: '40000000-0000-0000-0000-000000000029', is_active: true, is_primary: true },
  { id: '50000000-0000-0000-0000-000000000031', employee_id: '20000000-0000-0000-0000-000000000030', brand_process_id: '40000000-0000-0000-0000-000000000030', is_active: true, is_primary: true }
];

export const INITIAL_WEEKLY_OFFS = [
  { id: '60000000-0000-0000-0000-000000000001', employee_id: '20000000-0000-0000-0000-000000000001', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000002', employee_id: '20000000-0000-0000-0000-000000000002', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000003', employee_id: '20000000-0000-0000-0000-000000000003', day_of_week: 1 },
  { id: '60000000-0000-0000-0000-000000000004', employee_id: '20000000-0000-0000-0000-000000000004', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000005', employee_id: '20000000-0000-0000-0000-000000000005', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000006', employee_id: '20000000-0000-0000-0000-000000000006', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000007', employee_id: '20000000-0000-0000-0000-000000000007', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000008', employee_id: '20000000-0000-0000-0000-000000000008', day_of_week: 2 },
  { id: '60000000-0000-0000-0000-000000000009', employee_id: '20000000-0000-0000-0000-000000000009', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000010', employee_id: '20000000-0000-0000-0000-000000000010', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000011', employee_id: '20000000-0000-0000-0000-000000000011', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000012', employee_id: '20000000-0000-0000-0000-000000000012', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000013', employee_id: '20000000-0000-0000-0000-000000000013', day_of_week: 3 },
  { id: '60000000-0000-0000-0000-000000000014', employee_id: '20000000-0000-0000-0000-000000000014', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000015', employee_id: '20000000-0000-0000-0000-000000000015', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000016', employee_id: '20000000-0000-0000-0000-000000000016', day_of_week: 4 },
  { id: '60000000-0000-0000-0000-000000000017', employee_id: '20000000-0000-0000-0000-000000000017', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000018', employee_id: '20000000-0000-0000-0000-000000000018', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000019', employee_id: '20000000-0000-0000-0000-000000000019', day_of_week: 5 },
  { id: '60000000-0000-0000-0000-000000000020', employee_id: '20000000-0000-0000-0000-000000000020', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000021', employee_id: '20000000-0000-0000-0000-000000000021', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000022', employee_id: '20000000-0000-0000-0000-000000000022', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000023', employee_id: '20000000-0000-0000-0000-000000000023', day_of_week: 6 },
  { id: '60000000-0000-0000-0000-000000000024', employee_id: '20000000-0000-0000-0000-000000000024', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000025', employee_id: '20000000-0000-0000-0000-000000000025', day_of_week: 1 },
  { id: '60000000-0000-0000-0000-000000000026', employee_id: '20000000-0000-0000-0000-000000000026', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000027', employee_id: '20000000-0000-0000-0000-000000000027', day_of_week: 2 },
  { id: '60000000-0000-0000-0000-000000000028', employee_id: '20000000-0000-0000-0000-000000000028', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000029', employee_id: '20000000-0000-0000-0000-000000000029', day_of_week: 3 },
  { id: '60000000-0000-0000-0000-000000000030', employee_id: '20000000-0000-0000-0000-000000000030', day_of_week: 0 },
  { id: '60000000-0000-0000-0000-000000000031', employee_id: '20000000-0000-0000-0000-000000000031', day_of_week: 0 }
];

export const INITIAL_HOLIDAYS = [
  { id: '70000000-0000-0000-0000-000000000001', name: 'Republic Day', holiday_date: '2026-01-26', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000002', name: 'Holi Festival', holiday_date: '2026-03-03', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000003', name: 'Good Friday', holiday_date: '2026-04-03', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000004', name: 'Eid ul-Fitr', holiday_date: '2026-03-20', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000005', name: 'Independence Day', holiday_date: '2026-08-15', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000006', name: 'Gandhi Jayanti', holiday_date: '2026-10-02', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000007', name: 'Diwali / Deepavali', holiday_date: '2026-11-08', brand_id: null },
  { id: '70000000-0000-0000-0000-000000000008', name: 'Christmas Day', holiday_date: '2026-12-25', brand_id: null }
];

export const INITIAL_LEAVES = [
  // Vikram Patel (sole manager of Bolt Mobility) on approved leave Nov 12-14
  { id: '80000000-0000-0000-0000-000000000001', employee_id: '20000000-0000-0000-0000-000000000005', status: 'approved', start_date: '2026-11-12', end_date: '2026-11-14', leave_type: 'planned_leave' },
  // Sameer Qureshi on comp-off Nov 16
  { id: '80000000-0000-0000-0000-000000000002', employee_id: '20000000-0000-0000-0000-000000000027', status: 'approved', start_date: '2026-11-16', end_date: '2026-11-16', leave_type: 'comp_off' },
  // Pending leave for Tanvi Joshi
  { id: '80000000-0000-0000-0000-000000000003', employee_id: '20000000-0000-0000-0000-000000000012', status: 'pending', start_date: '2026-11-20', end_date: '2026-11-22', leave_type: 'planned_leave' },
  // Approved leave for Rohan Mehta
  { id: '80000000-0000-0000-0000-000000000004', employee_id: '20000000-0000-0000-0000-000000000007', status: 'approved', start_date: '2026-11-04', end_date: '2026-11-05', leave_type: 'planned_leave' }
];

export const INITIAL_AVAILABILITY = [
  { id: '90000000-0000-0000-0000-000000000001', employee_id: '20000000-0000-0000-0000-000000000018', start_date: '2026-11-28', end_date: '2026-11-30' }
];
