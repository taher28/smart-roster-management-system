# DataStraw – Smart Roster Management System

### Workforce Planning with Deterministic, Constraint-Based Scheduling

Developed for the **DataStraw Technologies AI + Tech Internship Assessment**.

**Live Application:** https://smart-roster-management-system-iota.vercel.app/

**GitHub Repository:** https://github.com/taher28/smart-roster-management-system

**Demo Video:** https://drive.google.com/file/d/16d7X0XnO4JlqF4Ulivkz5I3prMpAzXOq/view?usp=drivesdk

**LinkedIn Profile:** www.linkedin.com/in/taher-saterdawala

---

## 1. Project Overview

DataStraw is a workforce roster management application designed for companies managing multiple client brands and operational processes.

It helps managers organise employees, pods, processes, assignments, working calendars, weekly offs and leaves. The system generates monthly employee rosters while checking staffing requirements and identifying scheduling conflicts.

The bundled assessment dataset contains:

- **31 employees**
- **22 client brands**
- **4 operational pods**
- **4 operational processes:**
  - Customer Support (CS)
  - Abandoned Cart Conversion (ACC)
  - Non-Delivery Reports (NDR)
  - Retention (RET)

The main objective is to simplify workforce planning and help managers identify staffing gaps before finalising a roster.

### Main Features

- Dashboard with workforce and roster summaries.
- Employee, brand, process and pod management.
- Employee-to-brand-process assignments.
- Weekly-off, holiday, leave and availability management.
- Monthly roster generation for November 2026.
- Company-wide, pod-wise, brand-wise, process-wise and employee-wise roster views.
- Conflict detection with explanations and recommendations.
- Manual roster editing followed by revalidation.
- Local roster version history and restore functionality.
- CSV export of roster information.

---

## 2. Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React 19, Vite |
| Styling | Tailwind CSS 4 |
| Routing | React Router |
| Programming Language | JavaScript |
| Scheduling Algorithm | Deterministic Bounded Backtracking, MRV |
| Demo Data | JavaScript Seed Data |
| Demo Persistence | Browser LocalStorage |
| Testing | Vitest |
| Deployment | Vercel |
| Database Integration | Supabase client support in the codebase; not configured for this local demo |

### System Architecture

```text
             React + Vite Interface
                       |
                       v
              Pages and Components
                       |
                       v
               Data Service Layer
              (dataService.js)
                       |
             +---------+---------+
             |                   |
             v                   v
       Bundled Seed Data     LocalStorage
        (mockData.js)        (Demo Changes)
             |
             v
       Scheduling Engine
       (rosterEngine.js)
             |
       +-----+------+----------+
       |            |          |
       v            v          v
   Allocation   Constraints  Conflicts
       |            |          |
       +------------+----------+
                    |
                    v
          Roster Views and Reports
                    |
          +---------+---------+
          |                   |
          v                   v
     Version History       CSV Export
```

---

## 3. Database and Data Management

The application uses a structured data model consisting of the following logical entities:

1. **Employees:** Employee information, pod membership and active/inactive status.
2. **Pods:** Four operational groups with designated leads.
3. **Brands:** Client brands with active/inactive status.
4. **Processes:** CS, ACC, NDR and RET.
5. **Brand Processes:** Process-specific staffing requirements and operating calendars.
6. **Assignments:** Employee qualifications for specific brand-process combinations, including primary assignment preferences.
7. **Weekly Offs:** Employee rest days represented using day-of-week values (0 = Sunday through 6 = Saturday).
8. **Holidays:** Company-wide or brand-specific holidays.
9. **Leaves:** Planned leaves and comp-offs with approval status.
10. **Employee Availability:** Explicit date ranges when employees are unavailable.
11. **Roster Versions:** Saved snapshots of generated or manually adjusted rosters.
12. **Roster Entries:** Employee, brand and work-date assignments.
13. **Roster Day Results:** Required staffing, assigned count and open/closed status.
14. **Roster Conflicts:** Conflict codes, severity, explanations and recommendations.

### Supabase Integration Status

Supabase client support is present in the project codebase, but the submitted demonstration is **not connected to a live Supabase database or remote authentication service**.

Due to the remaining development time, the application uses:

- Bundled JavaScript seed data for the assessment dataset.
- Browser LocalStorage for demo changes and roster snapshots.
- A local Demo Manager session for demonstration access.

The Supabase database schema and seed-data setup were not completed or verified for this submission. Therefore, the application should not be considered a live multi-user Supabase deployment.

LocalStorage is browser-specific. Changes are not synchronised between different users, browsers or devices.

---

## 4. How Roster Generation Works

The scheduling logic is implemented in:

`src/lib/scheduling/rosterEngine.js`

It uses a deterministic, bounded constraint-satisfaction approach with a **Minimum Remaining Values (MRV)** heuristic.

### Scheduling Process

**1. Calendar Evaluation**

The engine checks whether each brand process is operational on a particular date based on its configured operating calendar and applicable holidays.

**2. Hard Constraint Filtering**

An employee is excluded from allocation when:

- The employee is inactive.
- The employee is on approved leave or comp-off.
- The employee is on a designated weekly off.
- The employee has an explicit unavailability period.
- The employee has already been assigned to another brand on that date.

**3. Single-Resource Brand Allocation**

Single-resource brands rely on a dedicated specialist. If the specialist is unavailable, the required coverage remains unfilled rather than violating scheduling constraints.

**4. Multi-Resource Allocation**

For multi-resource brands, the engine allocates specialists to required process slots.

MRV prioritises slots with the fewest eligible candidates. Bounded backtracking explores alternative assignments within the configured search limit.

**5. Workload Balancing**

Candidate ordering considers primary assignment preference and cumulative monthly workload.

**6. Coverage Evaluation**

The engine compares assigned staff against required staff and reports the resulting coverage and scheduling status.

### Roster Status

| Status | Meaning |
|---|---|
| FEASIBLE | All required staffing slots were filled. |
| INFEASIBLE | One or more required slots could not be filled under the current constraints. |
| SEARCH_LIMIT_REACHED | The configured search budget was reached before feasibility could be established. |

---

## 5. Conflict Detection and Handling

Conflict detection is implemented in:

`src/lib/scheduling/conflictDetector.js`

The system identifies scheduling problems such as:

- No assigned employee.
- Insufficient staffing.
- Approved leave or comp-off conflict.
- Double booking.
- Weekly-off violation.
- Approved-leave violation.
- Unavailable resource.
- Assignment on a closed day.

Managers can inspect the affected date, brand/process, staffing gap, explanation and suggested resolution through the Conflicts screen.

The application aims to preserve valid assignments and report uncovered requirements instead of silently generating an invalid roster.

---

## 6. Manual Editing and Version History

Managers can open a roster cell and add or remove employees where permitted.

After a manual change:

1. The updated assignment is saved.
2. The roster is revalidated.
3. Coverage information is updated.
4. Any resulting conflicts are displayed.

### Version History

The application supports local roster snapshots.

Managers can:

- View saved roster versions.
- Restore an earlier snapshot.
- Continue working from a restored version.

Since the demonstration uses LocalStorage, version history is limited to the same browser profile and device. It is not a central transactional database history.

---

## 7. Assessment Questions and Answers

### Q1. How did you model employees, brands, processes, pods and their relationships?

The application uses a structured relational-style data model.

- **Employees and Pods:** Employees belong to operational pods.
- **Brands and Processes:** Brands are connected to operational processes through brand-process relationships.
- **Assignments:** Employees are assigned to specific brand-process combinations rather than only to brands. This supports employees qualified for multiple processes.
- **Working Rules:** Weekly offs, leaves, holidays and availability are maintained separately so that the scheduling engine can evaluate each condition independently.

This approach keeps employee eligibility and brand-specific staffing requirements organised.

### Q2. How does your system generate a roster and determine whether it satisfies the required constraints?

The engine processes dates and evaluates whether each brand process is open.

It filters employees based on active status, approved leave, weekly offs, explicit unavailability and the one-brand-per-day restriction.

It then allocates the required staff, using MRV and bounded backtracking for multi-resource allocation.

Finally, it calculates coverage and returns a scheduling status with conflicts wherever required slots remain unfilled.

### Q3. How did you handle the difference between single-resource brands and brands with multiple employees?

The application supports two types of staffing arrangements:

- **Single-resource brands:** Depend on one dedicated specialist. If that employee is unavailable, the shift remains uncovered.
- **Multi-resource brands:** Have multiple qualified employees, allowing the solver to consider alternative candidates while respecting assignments and availability.

This helps the system handle different staffing requirements across brands.

### Q4. What happens when an employee manages all processes for a brand but is unavailable on a required working day?

The scheduler does not assign an employee who is on approved leave, weekly off or explicit unavailability.

If no eligible replacement is available, the system records the staffing deficit and displays the reason in the conflict view.

The manager can review the issue and make a permitted manual adjustment.

### Q5. How does your system handle conflicting requirements or insufficient staffing?

The engine preserves valid assignments and reports uncovered staffing requirements.

It distinguishes between an infeasible roster and a search-limit result.

Conflict information is made available to managers so they can understand the reason for the gap and decide how to resolve it.

### Q6. Which parts of the process did you automate, and which did you leave under human control? Why?

**Automated:**

- Operating calendar evaluation.
- Employee eligibility checks.
- Roster allocation.
- Coverage calculation.
- Conflict detection.
- Workload-based candidate ordering.

**Under human control:**

- Leave approval decisions.
- Manual roster adjustments.
- Conflict resolution.
- Roster review and restoration.

Scheduling can be automated, but managers should retain control over important workforce decisions and exceptions.

### Q7. If the company doubled its team and brand count, what would you change about your solution?

For a larger deployment, I would consider:

1. **Parallel Scheduling:** Divide scheduling work across independent operational groups.
2. **Virtualised Rendering:** Use windowed rendering for large roster grids.
3. **Integer Linear Programming:** Introduce an optimisation solver such as HiGHS or GLPK for complex staffing allocation.
4. **Automated Backup Recommendations:** Recommend qualified backup employees based on availability and process eligibility.

These are potential future improvements rather than features currently implemented.

### Q8. If you had one additional week to work on this, what would you improve first?

I would prioritise:

1. Automated float-staff recommendations to help fill uncovered shifts.
2. A shift-swapping workflow with manager approval.
3. Multiple shift time blocks for morning, evening and night operations.
4. Email or Slack notifications when conflicts arise or roster versions are published.

---

## 8. Local Setup and Execution

### Prerequisites

- Node.js 18 or newer (Node.js 20 LTS recommended).
- npm.

### Clone the Repository

```bash
git clone https://github.com/taher28/smart-roster-management-system.git

cd smart-roster-management-system

npm install
```

### Start the Development Server

```bash
npm run dev
```

Open the local URL printed by Vite, usually:

`http://localhost:5173`

### Demo Login

1. Open the application.
2. On the login page, click **Launch Demo Manager Session**.
3. The application opens using the bundled assessment dataset.

### Local Demo Configuration

The local-only demonstration does not require a Supabase project, database setup or Supabase credentials.

The Supabase client must be optional when environment variables are absent, and authentication calls must be guarded accordingly.

The application should use the local Demo Manager session and LocalStorage for the demonstration.

---

## 9. Testing and Production Build

### Run Unit Tests

```bash
npm test
```

### Create Production Build

```bash
npm run build
```

The repository includes a Vitest suite covering:

- Calendar rules.
- Leave and availability checks.
- Roster-generation scenarios.
- Multi-process coverage.
- Conflict detection.

Run the commands on the final submitted code and report the actual results.

---

## 10. Demo Video and Screenshots

A short walkthrough should demonstrate the main application features.

### Suggested Demo Flow

1. Login page and Demo Manager session.
2. Dashboard and workforce summary.
3. Employee and pod management.
4. Brand and process management.
5. Assignments and working rules.
6. Leave management.
7. November 2026 roster generation.
8. Company, Pod, Brand, Process and Employee views.
9. Conflict detection and explanation.
10. Manual roster editing and revalidation.
11. Version history and restore.
12. CSV export.

### Demo Video

**Video Link:** [Add your Google Drive video link here]

### Suggested Screenshot Names

- `01-login-demo.png`
- `02-dashboard.png`
- `03-employees.png`
- `04-brands-processes.png`
- `05-assignments-working-rules.png`
- `06-leave-management.png`
- `07-roster-generated.png`
- `08-roster-filter-views.png`
- `09-conflicts.png`
- `10-manual-edit.png`
- `11-version-history.png`
- `12-csv-export.png`

---

## 11. Deployment

The application is deployed on Vercel.

**Live Application:**

https://smart-roster-management-system-iota.vercel.app/

**GitHub Repository:**

https://github.com/taher28/smart-roster-management-system

The deployed application should be tested to ensure that the demo login, roster generation, conflict detection and other key features work correctly.

---

## 12. Scope and Limitations

- The submitted demonstration uses bundled seed data and browser LocalStorage.
- It is not a live multi-user database deployment.
- Changes made in one browser are not synchronised with other browsers or devices.
- Supabase remote database setup, authentication, RLS and PostgreSQL snapshot functionality are not completed or verified for this submission.
- The scheduling engine uses deterministic constraint-based logic; it is not a generative-AI scheduling service.
- Roster results depend on the current dataset and scheduling rules.
- Any sample roster metrics should be regenerated during the final demonstration rather than assumed to match previous runs.

---

## 13. Submission Checklist

- [ ] Live application URL included.
- [ ] GitHub repository accessible.
- [ ] LinkedIn profile link included.
- [ ] Demo video recorded and uploaded.
- [ ] Local installation instructions verified.
- [ ] Demo Manager login tested.
- [ ] November 2026 roster generation tested.
- [ ] All five roster views checked.
- [ ] Conflict detection demonstrated.
- [ ] Manual editing and revalidation tested.
- [ ] Local version history and restore tested.
- [ ] CSV export tested.
- [ ] Unit tests executed.
- [ ] Production build completed.
- [ ] `.env.local` and real credentials excluded from the submission ZIP.

---

**Developed as part of the DataStraw Technologies AI + Tech Internship Assessment.**
