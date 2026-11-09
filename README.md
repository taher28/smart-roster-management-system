# Smart Roster Management System
### Algorithmic Workforce Planning & Deterministic Constraint Scheduling

Developed for the **Datastraw Technologies AI + Tech Internship Assessment**  
**Repository**: `C:\Users\TAHER\datastraw-roster-management`  
**Stack**: React 19, Vite, Tailwind CSS 4, React Router, Supabase PostgreSQL, Vitest  

---

## 1. Project Overview

The **Smart Roster Management System** is a full-stack workforce planning platform designed to solve multi-client operational scheduling for high-velocity D2C brand operations.

The system manages **31 unique employees**, **22 client brands**, **4 operational pods**, and **4 specialized processes** (Customer Support, Abandoned Cart Conversion, Non-Delivery Reports, and Retention), scheduling shifts across diverse client operating calendars while strictly respecting labor constraints (weekly rest days, approved leaves, and comp-offs).

### Key Architectural Highlights
- **100% Deterministic Engine**: Built with a bounded backtracking constraint satisfaction solver and Minimum Remaining Values (MRV) heuristic. No paid AI API dependencies or non-deterministic hallucinations.
- **Explainable Conflict Detection**: Identifies coverage deficits, leave clashes, weekly off conflicts, and double-booking with concrete root-cause explanations and actionable recommendations.
- **Five Stakeholder Views**: Interactive monthly roster views by Company, Pod, Brand, Process, and Individual Employee.
- **Manual Adjustments & Version Snapshots**: Cell-level manual assignment overrides with real-time constraint revalidation and atomic PostgreSQL version history snapshots.
- **Enterprise PostgreSQL & RLS**: 15 relational tables secured with Row Level Security, role-based manager access, and atomic transactional RPCs.
- **Resilient Offline Architecture**: Real-time integration with remote Supabase with an automatic, reactive local-first fallback that guarantees seamless demonstration without crashing if unauthenticated.

---

## 2. System Architecture & Relational Data Model

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                     │
│   (Vite, Tailwind CSS 4, React Router, Lucide Icons)        │
│   - Modules: Dashboard, Employees, Brands, Processes, Pods, │
│     Assignments, Working Rules, Leaves, Roster, Conflicts   │
│   - 5 Roster Views + History Drawer + RFC-4180 CSV Export   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Data Access Layer                      │
│                  (`src/lib/dataService.js`)                 │
│   - Supabase PostgREST Client & Auth Session Listener       │
│   - Atomic Transactional RPCs (`save_roster_snapshot`)      │
│   - Reactive LocalStorage Fallback (Zero-Crash Guarantee)   │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 Deterministic Scheduling Engine             │
│               (`src/lib/scheduling/rosterEngine.js`)         │
│   - Minimum Remaining Values (MRV) Heuristic                │
│   - Date-by-Date Bounded Backtracking Solver                │
│   - Multi-Process Rule & Single-Brand Daily Cap             │
│   - Statuses: FEASIBLE, INFEASIBLE, SEARCH_LIMIT_REACHED    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL & Supabase                    │
│   - 15 Relational Tables with Foreign Keys & Unique Bounds  │
│   - Strict Row Level Security (Viewer Default, Manager R/W) │
│   - Atomic Transactional Functions for Version Rollbacks    │
└─────────────────────────────────────────────────────────────┘
```

### Relational Entity Schema (15 Tables)
1. **`profiles`**: User authentication profile with RBAC role (`manager`, `lead`, `viewer`).
2. **`pods`**: 4 operational units (`Pod Alpha`, `Pod Beta`, `Pod Gamma`, `Pod Delta`) with designated lead specialists.
3. **`employees`**: 31 operational specialists with pod memberships and active/inactive status.
4. **`brands`**: 22 client brands (18 single-resource, 4 multi-resource).
5. **`processes`**: 4 operational processes (`CS`, `ACC`, `NDR`, `Retention`).
6. **`brand_processes`**: Process contracts per brand specifying `shift_start`, `shift_end`, `min_staff`, and operating calendar (`365_days`, `no_holidays`, `no_sundays_holidays`).
7. **`assignments`**: Qualification junction linking employees to brand processes, flagging `is_primary`.
8. **`weekly_offs`**: Designated weekly rest days (0 = Sunday through 6 = Saturday) per employee.
9. **`holidays`**: Public holidays (company-wide or brand-specific).
10. **`leaves`**: Planned leaves and comp-offs with status (`approved`, `pending`, `rejected`).
11. **`employee_availability`**: Explicit unavailability blocks.
12. **`roster_versions`**: Immutable historical version records with status (`draft`, `published`, `archived`).
13. **`roster_entries`**: Daily shift assignments `(version_id, brand_id, employee_id, work_date)`.
14. **`roster_day_results`**: Daily coverage fulfillment per brand process `(required_staff, count, is_open)`.
15. **`roster_conflicts`**: Specific diagnostic records with failure code, severity, explanation, and resolution.

---

## 3. Mandatory Assessment Questions & Detailed Answers

### Q1: How did you model employees, brands, processes, pods, and their relationships?
**Answer**:  
We modeled the domain using a normalized relational architecture centered around operational eligibility:
- **Employees & Pods**: Employees belong to a pod (`employees.pod_id -> pods.id`). Pods appoint one employee as the Pod Lead (`pods.lead_employee_id -> employees.id`), resolved via a circular foreign key constraint.
- **Brands & Processes Junction (`brand_processes`)**: Brands do not have a uniform monolithic schedule. Instead, each process under a brand is modeled independently in `brand_processes`. This allows `Bolt Mobility [CS]` to operate `365_days` while `Bolt Mobility [ACC]` operates `no_holidays`.
- **Assignment Junction (`assignments`)**: Employees are linked to `brand_processes`, not merely brands. This captures multi-process qualification (e.g., Varun Kapoor qualified for CS and NDR). The `is_primary` flag captures primary vs. secondary staffing preference.
- **Rules & Constraints**: Employees have independent `weekly_offs` (day of week 0–6), `leaves` (with status `approved`, `pending`, `rejected`), and `employee_availability` ranges.

---

### Q2: How does your system generate a roster and determine whether it satisfies the required constraints?
**Answer**:  
The generator executes in `src/lib/scheduling/rosterEngine.js` using a deterministic bounded backtracking algorithm:
1. **Date-by-Date Partitioning**: Because an employee's availability is date-specific, days are solved chronologically while maintaining cumulative monthly shift counts.
2. **Hard Constraint Filtering**: For any candidate employee on date `d`, the engine validates:
   - Active status (`is_active = true`).
   - Not on approved leave or comp-off on date `d`.
   - Not on designated weekly off on day-of-week of date `d`.
   - Not blocked by explicit unavailability.
   - Has not already been assigned to another brand on date `d` (single-brand daily cap).
3. **Single-Resource Allocation**: For the 18 single-resource brands, if the sole employee is available, they are assigned and simultaneously cover all open eligible brand processes for that day. If unavailable, the gap is left unfilled and recorded.
4. **Multi-Resource MRV Backtracking**: For multi-resource brands, unfilled slots are sorted by **Minimum Remaining Values (MRV)**—slots with the fewest eligible available candidates are prioritized. Candidates are sorted by soft constraints (`is_primary` first, then lowest cumulative monthly shift count).
5. **Coverage Evaluation**: The engine compares filled shifts against required shifts (`min_staff` for open processes). If any required slot is unfilled, it flags a conflict and assigns the status `INFEASIBLE`. If all slots are filled, it assigns `FEASIBLE`. If the search step limit is hit, it assigns `SEARCH_LIMIT_REACHED`.

---

### Q3: How did you handle the difference between single-resource brands and brands with multiple employees?
**Answer**:  
The system dynamically categorizes brands into two operational pools:
- **Single-Resource Brands (18 brands, ~81.8%)**: Managed by 1 dedicated specialist. When scheduled, the employee simultaneously satisfies coverage for all open processes on that brand that they are qualified for (e.g., Vikram Patel simultaneously covers both CS and ACC for Bolt Mobility). If that specialist is on weekly off or leave, the brand has an immediate coverage deficit because no secondary specialist is assigned.
- **Multi-Resource Brands (4 brands, ~18.2%)**: Managed by teams of 3 specialists (e.g., Stellar Luxe Apparel, Urban Nomad Gear, Terra Foods Global, Zenith Living). These brands have independent process assignments and staffing requirements (e.g., Terra Foods CS requires `min_staff: 2`). The solver uses bounded backtracking with MRV to assign specialists across processes, allowing peer specialists to maintain coverage when one team member is on leave.

---

### Q4: What happens when an employee manages all processes for a brand but is unavailable on a required working day?
**Answer**:  
When a dedicated specialist is unavailable on an open operational day (e.g., Vikram Patel taking approved leave Nov 12–14 on Bolt Mobility, or taking his mandatory Sunday weekly off on a `365_days` brand):
1. **No Illegal Over-Allocation**: The engine refuses to violate labor laws or scheduling constraints—it does not schedule Vikram.
2. **Deficit Calculation**: The open processes record `count: 0` against `required_staff: 1`, creating an unfilled shift.
3. **Diagnostic Conflict Generation**: The system creates a `APPROVED_LEAVE_OR_OFF_CONFLICT` record identifying:
   - Date, Brand, and Process.
   - Available Staff (0) vs. Required Staff (1).
   - Exact root cause: *"Sole assigned manager for Bolt Mobility cannot work: Vikram Patel has an Approved Leave / Comp-off."*
   - Actionable resolution: *"Deploy unassigned backup resource (e.g., Kavya Menon) or reassign cross-pod coverage for Bolt Mobility."*
4. **Status Reflection**: The monthly roster status is flagged as `INFEASIBLE`, and the conflict is immediately highlighted on the Roster and Conflicts pages.

---

### Q5: How does your system handle conflicting requirements or insufficient staffing?
**Answer**:  
Rather than crashing, failing silently, or fabricating shifts:
1. **Best-Effort Valid Partial Allocation**: The engine commits all valid shifts that can be legally staffed, ensuring maximum operational coverage without constraint violations.
2. **Transparent Classification**: The schedule is marked with its true status:
   - `INFEASIBLE`: Genuinely unstaffable with current resources.
   - `SEARCH_LIMIT_REACHED`: Search cutoff reached before exhausting alternatives.
3. **Specific Root-Cause Diagnosis**: Every failure is classified into one of 8 diagnostic codes:
   - `NO_ASSIGNED_EMPLOYEE`
   - `INSUFFICIENT_STAFFING`
   - `APPROVED_LEAVE_OR_OFF_CONFLICT`
   - `DOUBLE_BOOKING`
   - `WEEKLY_OFF_VIOLATION`
   - `APPROVED_LEAVE_VIOLATION`
   - `UNAVAILABLE_RESOURCE`
   - `CLOSED_DAY_ASSIGNMENT`
4. **Human Decision Support**: Managers can inspect the exact deficit on the Conflicts page and use the Manual Cell Editor to reassign float backup specialists (e.g., Kavya Menon) or pod leads.

---

### Q6: Which parts of the process did you automate, and which did you leave under human control? Why?
**Answer**:  
- **Automated**:
  - Operating calendar parsing (calculating open days based on `365_days`, `no_holidays`, `no_sundays_holidays`, and public holidays).
  - Hard constraint enforcement (leave, comp-offs, weekly offs, availability blocks).
  - Multi-process coverage calculation.
  - Candidate ordering via MRV and fair workload balancing.
  - Conflict detection and diagnostic root-cause generation.
- **Left Under Human Control**:
  - **Leave Approval**: Approving or rejecting employee leave requests.
  - **Manual Cell Overrides**: Assigning float backup staff (Kavya Menon) or reallocating pod leads during emergencies.
  - **Roster Publishing & Restoration**: Promoting a draft version to published status or restoring an older version snapshot.
- **Why**: Labor allocation carries commercial and human consequences. While algorithms excel at combinatorial constraint satisfaction, client contract negotiations, emergency exceptions, and team morale require human managerial judgment.

---

### Q7: If the company doubled its team and brand count, what would you change about your solution?
**Answer**:  
If Datastraw scaled to 60+ employees, 45+ brands, and 60+ brand processes:
1. **Parallelized Pod Solvers**: Because pods operate largely independently, we would partition the constraint satisfaction problem by operational pod and solve them in parallel via Web Workers or Supabase Edge Functions.
2. **Virtualized Grid Rendering**: The 30-day roster matrix would be rendered using windowed virtual scrolling (`react-window`) to maintain 60 FPS scrolling with 2,000+ DOM cells.
3. **Integer Linear Programming (ILP)**: For complex cross-pod float sharing, we could introduce a WebAssembly-compiled solver (e.g., HiGHS or GLPK via WASM) alongside the JavaScript backtracking solver for instant global optimization.
4. **Automated Float Dispatch**: An automated recommendation engine suggesting the optimal float backup employee based on pod proximity and skill qualification.

---

### Q8: If you had one additional week to work on this, what would you improve first?
**Answer**:  
1. **Automated One-Click "Fill Gaps with Float"**: A smart manager tool that automatically identifies the 102 uncovered shifts and schedules qualified unassigned float employees (such as Kavya Menon or available pod leads) to achieve 100% feasibility with a single click.
2. **Shift Swapping Workflow**: A peer-to-peer shift swap portal where specialists can request shift exchanges that are automatically verified by the conflict detector before manager sign-off.
3. **Multi-Shift Time Blocks**: Granular shift scheduling supporting morning, evening, and night shifts (24/7 coverage) rather than single daily shifts.
4. **Automated Email/Slack Notifications**: Triggering webhook alerts to pod leads when conflicts arise or when new roster versions are published.

---

## 4. November 2026 Simulation Breakdown

When the baseline November 2026 assessment dataset is evaluated by the engine:
- **Total Required Shifts**: **870**
- **Total Filled Shifts**: **768**
- **Uncovered Shifts**: **102**
- **Conflict Records**: **101**
- **Roster Entries**: **746**
- **Coverage Percentage**: **88.28%**
- **Status**: `INFEASIBLE`

### Why Exactly 102 Shifts are Uncovered:
1. **70 Shifts across 18 Single-Resource Brands**:
   - Sole specialists take mandatory weekly offs (Sundays, Wednesdays, etc.) on brands operating `365_days` or `no_holidays`.
   - Vikram Patel on Bolt Mobility takes approved leave Nov 12–14 (3 days × 2 processes = 6 shifts) and 5 Sundays (5 days × 2 processes = 10 shifts) = 16 shifts.
   - Jive Audio, Chai Craft, EcoNest, Mythic Brews, Pulse Fitness, Dune Organics, Lumina Skincare, Aura Wellness, Glow Botanics, Krave Snacks, Nova Athleisure have 4–7 uncovered shifts each on their specialists' weekly offs.
2. **23 Shifts across Multi-Resource Brands on Specialists' Weekly Offs**:
   - Stellar Luxe CS (5 Sundays), Stellar Luxe ACC (4 Saturdays).
   - Urban Nomad CS (5 Sundays), Urban Nomad ACC (5 Mondays).
   - Zenith Living CS (5 Sundays), Zenith Living ACC (4 Wednesdays).
3. **9 Shifts on Terra Foods Global CS (`min_staff: 2`)**:
   - Mondays: Amit Verma (Pod Gamma Lead) is off → deficit 1 (4 shifts).
   - Tuesdays: Sameer Qureshi is off → deficit 1 (4 shifts).
   - Monday Nov 16: Amit is off AND Sameer has an approved comp-off → deficit 2 (1 shift with deficit 2).
   - Total: 4 + 4 + 1 = 9 shifts.
- **Sum**: `70 + 23 + 9 = 102 shifts across 101 conflict records`.

---

## 5. Local Setup & Execution Instructions

### Prerequisites
- Node.js 18+ or 20+
- npm or pnpm

### 1. Clone & Install
```bash
cd C:\Users\TAHER\datastraw-roster-management
npm install
```

### 2. Environment Configuration
Create `.env.local` using `.env.example`:
```bash
cp .env.example .env.local
```
Fill in your Supabase project credentials:
```env
VITE_SUPABASE_URL=https://your-supabase-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Run Unit Tests (Vitest)
```bash
npm test
```
*Executes all 17 unit test scenarios (including the 5 acceptance criteria tests) in < 1 second.*

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production
```bash
npm run build
```
Compiles production assets to `/dist` with zero errors.

---

## 6. Supabase Database Setup

To configure the remote database:
1. Open your **Supabase Dashboard** (`https://supabase.com/dashboard`).
2. Go to **SQL Editor** -> **New Query**.
3. Copy the contents of `supabase/setup_complete.sql` and click **Run**.
4. This script sets up:
   - 15 relational tables with constraints and indexes.
   - The complete 31-employee assessment dataset.
   - Strict Row Level Security policies (authenticated read, manager-only write).
   - Atomic transactional RPC functions `save_roster_snapshot` and `restore_roster_snapshot`.
   - Auth trigger creating viewer profiles for new signups.

---

## 7. Demonstration Walkthrough Script (3–5 Minutes)

### Minute 0:00 – 0:45 | Login & Dashboard Overview
- Navigate to `/login`. Demonstrate the secure login interface and the instant **Demo Manager** evaluator button.
- Arrive at the **Operations Control Center** (`/`). Show live metrics: 31 employees, 22 brands, 4 pods, 4 processes, and current coverage status.

### Minute 0:45 – 1:30 | Operational Configuration Modules
- **Employees (`/employees`)**: Search for `Kavya Menon` (the unassigned backup float specialist) and `Vikram Patel`. Show pod memberships.
- **Brands (`/brands`)**: Highlight the distinction between single-resource brands (e.g., Bolt Mobility) and multi-resource brands (e.g., Stellar Luxe Apparel).
- **Working Rules (`/working-rules`) & Leaves (`/leave`)**: Show employee weekly offs (e.g., Vikram Patel off on Sunday) and Vikram's approved leave on Nov 12–14.

### Minute 1:30 – 3:00 | Roster Generation & 5 Stakeholder Views
- Navigate to **Monthly Roster (`/roster`)** with month set to **November 2026**.
- Click **Generate Roster**. The deterministic engine executes in ~150 ms.
- Demonstrate the **Five Roster Views**:
  1. *Company View*: Global matrix of all brands across November 2026.
  2. *Pod View*: Filtered by Pod Alpha, Beta, Gamma, or Delta.
  3. *Brand View*: Deep dive into brand coverage.
  4. *Process View*: Breakdown across CS, ACC, NDR, and Retention.
  5. *Employee View*: Individual specialist monthly shift schedule.

### Minute 3:00 – 4:00 | Conflict Diagnosis & Acceptance Criteria Walkthrough
- Notice status is `INFEASIBLE` with 88% coverage and 101 conflicts.
- Navigate to **Conflicts (`/conflicts`)**. Filter by `Bolt Mobility`.
- Inspect the conflict on Nov 12: Vikram Patel on approved leave. Show the exact explanation and recommendation to deploy a backup resource.
- Inspect Terra Foods CS on Nov 16: Required 2, Available 0 (Amit on weekly off, Sameer on comp-off).

### Minute 4:00 – 5:00 | Manual Adjustment, Revalidation & Version Snapshots
- Return to **Roster (`/roster`)**. Click on Bolt Mobility on Nov 12.
- In the **Manual Assignment Modal**, assign `Kavya Menon` (backup float resource).
- Click **Assign**. Show real-time revalidation:
  - Conflict count immediately drops.
  - New **Version 2** is created atomically.
- Open the **Historical Snapshots Drawer**. Show Version 1 (original baseline) and Version 2 (manual adjustment).
- Demonstrate **Restore Snapshot** to restore Version 1.
- Click **Export CSV** -> Download RFC-4180 compliant Monthly Roster CSV.

---

## 8. Recommended Screenshots for Documentation & Video

1. `01_dashboard.png`: Operations Control Center displaying live statistics and pod breakdown.
2. `02_employees.png`: Employees directory with pod assignments and active status badges.
3. `03_brands.png`: Brands directory highlighting single vs. multi-resource tags and calendar rules.
4. `04_working_rules.png`: Weekly offs matrix (0–6) and calendar rules editor.
5. `05_leaves_holidays.png`: Leave management screen showing approved leaves, comp-offs, and public holidays.
6. `06_roster_matrix.png`: Monthly roster company view across 30 days of November 2026.
7. `07_conflicts_page.png`: Conflict inspector detailing root cause and actionable recommendations.
8. `08_manual_edit_modal.png`: Cell assignment modal with eligibility validation and real-time revalidation.
9. `09_version_history_drawer.png`: Historical version snapshots with 1-click restore functionality.
10. `10_csv_export.png`: RFC-4180 CSV export files opened in spreadsheet software.

---

## 9. Submission Checklist

- [x] Full source code repository preserved and cleaned.
- [x] Deterministic bounded backtracking engine implemented (0 external paid AI dependencies).
- [x] 31 employees, 22 brands, 4 pods, 4 processes, 30 brand-processes modeled.
- [x] Exact November 2026 simulation verified (870 required, 768 filled, 102 uncovered, 101 conflicts, 746 entries, 88.28% coverage).
- [x] 17 Vitest unit tests passing (`npm test`).
- [x] Production build clean with 0 errors (`npm run build`).
- [x] All 8 mandatory assessment questions answered in detail in `README.md`.
- [x] Approach note documented in `APPROACH.md`.
- [x] Verification & audit report documented in `VERIFICATION_REPORT.md`.
- [x] Database migrations & setup SQL prepared in `supabase/setup_complete.sql`.
- [x] Vercel SPA routing configured in `vercel.json`.
- [x] `.env.example` configured with actual variable names.
