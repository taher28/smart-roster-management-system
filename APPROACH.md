# Approach Note — Smart Roster Management System
**Prepared for**: Datastraw Technologies AI + Tech Internship Assessment  
**Author**: Candidate  
**Project Location**: `C:\Users\TAHER\datastraw-roster-management`  

---

## 1. Problem Understanding & Core Challenges

Datastraw manages operational specialists across diverse client brands, operational pods, and multi-channel workflows (Customer Support, Abandoned Cart Conversion, Non-Delivery Reports, and Retention). The scheduling problem has several distinct characteristics that make naive greedy algorithms fail:

1. **Brand Distribution**: Approximately 80% of brands are single-resource brands (managed by 1 dedicated specialist), while 20% are multi-resource brands (typically 3 specialists covering processes with minimum staffing requirements).
2. **Diverse Operating Calendars**: Client brands operate under different calendar regimes:
   - `365_days`: Operating all days of the year (including Sundays and national holidays).
   - `no_holidays`: Operating 7 days a week, closed only on public holidays.
   - `no_sundays_holidays`: Standard 6-day operations, closed on Sundays and public holidays.
3. **Multi-Process Brand Coverage Rule**: When an employee works on a brand on a given day, they cover all open processes for which they are eligible without double-booking or being counted twice for the same process.
4. **Labor Constraints & Fairness**: Employees have mandatory weekly rest days (weekly offs), approved leaves, and comp-offs. Over-allocation on open single-resource brands produces unavoidable structural gaps unless backup float resources are assigned.
5. **Deterministic Bounded Backtracking**: No paid AI API dependencies or stochastic methods; the system must produce explainable, repeatable, and mathematically verified schedules.

---

## 2. System Architecture

The application is structured into four clearly decoupled layers:

```
┌─────────────────────────────────────────────────────────────┐
│                       React 19 Frontend                     │
│   (Vite, React Router, Tailwind CSS 4, Lucide Icons)        │
│   - 10 Module Pages + 5 Roster Views (Company, Pod, Brand,  │
│     Process, Employee) + History Drawer + CSV Export        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                      Data Access Layer                      │
│                  (`src/lib/dataService.js`)                 │
│   - Connects to Supabase PostgreSQL & Auth                  │
│   - Reactive local-first fallback (offline resilience)       │
│   - Calls Atomic RPCs (`save_roster_snapshot`)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                 Deterministic Scheduling Engine             │
│               (`src/lib/scheduling/rosterEngine.js`)         │
│   - MRV (Minimum Remaining Values) heuristic                │
│   - Bounded Backtracking Solver                             │
│   - Multi-Process Rule & Single-Brand Daily Cap             │
│   - Statuses: FEASIBLE, INFEASIBLE, SEARCH_LIMIT_REACHED    │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    PostgreSQL & Supabase                    │
│   - 15 Relational Tables with Foreign Keys & Unique Bounds  │
│   - Strict Row-Level Security (Authenticated & Managers)    │
│   - Atomic Transactional RPCs for Version Snapshots         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Model & Entities

The relational database schema is structured around 15 tables:

1. **`profiles`**: User account roles (`manager`, `lead`, `viewer`). New signups default to `viewer`.
2. **`pods`**: 4 operational pods with designated leads (`lead_employee_id`).
3. **`employees`**: 31 specialists with pod memberships and active/inactive status.
4. **`brands`**: 22 client brands (18 single-resource, 4 multi-resource).
5. **`processes`**: 4 operational processes (`CS`, `ACC`, `NDR`, `Retention`).
6. **`brand_processes`**: Process configuration per brand with independent calendars (`365_days`, `no_holidays`, `no_sundays_holidays`), shifts, and `min_staff`.
7. **`assignments`**: Qualification links between employees and brand processes, marking `is_primary`.
8. **`weekly_offs`**: Fixed weekly rest days (0 = Sunday to 6 = Saturday) per employee.
9. **`holidays`**: National and brand-specific public holidays.
10. **`leaves`**: Planned leaves and comp-offs with status (`approved`, `pending`, `rejected`).
11. **`employee_availability`**: Explicit date blockages.
12. **`roster_versions`**: Immutable roster version headers with month and notes.
13. **`roster_entries`**: Scheduled shifts `(version_id, brand_id, employee_id, work_date)`.
14. **`roster_day_results`**: Process-level coverage fulfillment `(required_staff, count, is_open)`.
15. **`roster_conflicts`**: Diagnostic records detailing understaffing, leave violations, or double bookings.

---

## 4. Scheduling Algorithm & Constraint Satisfaction

### Hard Constraints (Never Violated)
- Employee must be active (`is_active = true`).
- Employee must not be on approved leave or comp-off on that date.
- Employee must not be on their designated weekly off on that date.
- Employee must not have an active availability block.
- Employee cannot work for two different brands on the same calendar day (no cross-brand double booking).
- Brand process must be open according to its operating calendar.
- Employee can only cover processes to which they are assigned.
- An employee cannot be counted twice toward the same process on the same date.

### Soft Constraints (Optimization Heuristics)
- **Primary Assignment Preference**: Employees assigned as `is_primary = true` are selected first.
- **Fair Workload Balancing**: Employees with fewer cumulative scheduled shifts in the month are prioritized for open multi-resource slots.

### Solver Algorithm Workflow
1. **Date-by-Date Partitioning**: Because an employee's availability is date-specific, the solver processes days chronologically while maintaining cumulative shift counters.
2. **Single-Resource Allocation**: For the 18 single-resource brands, the sole assigned employee is scheduled if available and covers all open eligible brand processes simultaneously.
3. **Multi-Resource MRV Backtracking**:
   - For multi-resource brands, unsatisfied requirement slots are identified.
   - Slots are sorted by **Minimum Remaining Values (MRV)**—the slot with the fewest available eligible candidates is scheduled first.
   - If a slot has 0 candidates (e.g., all assigned employees are on scheduled weekly off or leave), the engine records the deficit and proceeds with remaining slots to maximize coverage.
   - Bounded search cutoff prevents infinite loops when search limits are configured.
4. **Three Status Codes**:
   - `FEASIBLE`: 100% of required shifts filled with 0 conflicts.
   - `INFEASIBLE`: One or more required shifts cannot be legally staffed without violating hard constraints; best-effort valid allocation is saved with full diagnostics.
   - `SEARCH_LIMIT_REACHED`: Search budget exhausted before completing exploration.

---

## 5. Conflict Diagnosis & Human-in-the-Loop Design

Every conflict diagnosed by the engine and the real-time conflict detector provides:
- **Exact Date, Brand, and Process**
- **Required Staff vs. Available Staff vs. Assigned Staff**
- **Specific Root Cause**: e.g., *"Sole assigned manager for Bolt Mobility cannot work: Vikram Patel is on scheduled Weekly Off."*
- **Actionable Recommendation**: e.g., *"Deploy unassigned backup resource (e.g., Kavya Menon) or reassign cross-pod coverage."*

### Why Human-in-the-Loop?
We intentionally left manual overriding and historical snapshot restoration under human manager control:
- Client agreements may permit temporary overtime or temporary cross-brand sharing during peak surges.
- When an employee is sick or on emergency leave, a human manager must decide whether to deploy an unassigned backup (Kavya Menon), negotiate process closure, or reassign a pod lead.
- The system prevents blind algorithm decisions from making unauthorized commercial commitments while giving managers instant real-time conflict feedback.

---

## 6. Limitations & Scalability Considerations

- **Current Scale**: For 31 employees, 22 brands, and 30 days, the engine completes in < 150 ms in pure JavaScript.
- **At 2x Scale (60+ employees, 45+ brands)**:
  - Backtracking search space remains manageable with MRV heuristic.
  - Roster view rendering benefits from virtualized table windowing.
  - Heavy constraint evaluations can be offloaded to Web Workers or Supabase Edge Functions.
