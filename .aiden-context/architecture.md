# Architecture

## System Architecture Overview

Tymmar follows a **modern serverless web application architecture** with clear separation between frontend, backend, and database layers. The system is deployed on Vercel with Supabase managing authentication and database hosting.

### High-Level Architecture Diagram (Conceptual)

```
┌─────────────────────────────────────────────────────────────┐
│                         CLIENT                              │
│  React 19 SPA (Vite) + React Router 7 + TailwindCSS       │
│  Contexts: Auth, Employee, PeriodData                      │
└────────────────┬────────────────────────────────────────────┘
                 │ HTTPS + JWT Bearer Tokens
                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL EDGE NETWORK                      │
│  Static Assets (HTML, JS, CSS, Images)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              VERCEL SERVERLESS FUNCTIONS (API)              │
│  /api/employees, /api/day_entries, /api/periods,           │
│  /api/settings, /api/reports, /api/ai                      │
│  Runtime: Node.js | Auth: Supabase JWT Verification        │
└────────┬────────────────────────────────┬───────────────────┘
         │                                 │
         ▼                                 ▼
┌────────────────────┐          ┌──────────────────────────┐
│   SUPABASE AUTH    │          │   OPENAI API             │
│  User Management   │          │   GPT-4o-mini            │
│  JWT Tokens        │          │   (AI entry suggestions) │
└────────────────────┘          └──────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                  SUPABASE POSTGRESQL                        │
│  Drizzle ORM Access | Row-Level Security Enabled           │
│  Tables: employees, settings, day_entries, periods, etc.   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

### Frontend Architecture

#### 1. Application Entry (src/main.tsx)
- Initializes React root with StrictMode
- Wraps app in `BrowserRouter` and `AuthProvider`
- Renders `AppRouter` as root component

#### 2. Router System (src/router/)
- **AppRouter.tsx:** Route definitions and conditional rendering based on auth state
  - Employee routes: `/` (Dashboard), `/signin`
  - Admin routes: `/admin/*` (nested layout with sidebar)
  - Fallback: Redirects unknown paths to `/`
- **RouteGuards.tsx:**
  - `RequireAuth`: Redirects to `/signin` if no user
  - `RequireAdmin`: Redirects to `/admin/signin` if not admin (or `/` if regular user)

#### 3. Context Providers (src/context/)
**AuthContext.tsx:**
- Manages Supabase session state
- Provides `user`, `loading`, `isAdmin`, `getAccessToken`, `signInWithPassword`, `signOut`
- Subscribes to auth state changes
- Accessed via `useAuth()` hook

**EmployeeContext.tsx:**
- Fetches current user's employee profile via `/api/employees?id=me`
- Tracks status: `idle | loading | ok | missing | error`
- Provides `employee`, `status`, `refetch()`
- Used by Dashboard to determine if employee profile exists

**PeriodDataContext.tsx** (largest context, ~420 lines):
- Manages **all week data** for the employee:
  - Current period (`fromDate`, `toDate`, `period` record)
  - Entry state: `entriesByDate` (persisted), `draftEntriesByDate` (UI state)
  - Expected hours per day (`expectedByDay`, `expectationsByDate`)
  - Week totals, percentage completion, closed status
  - Calendar navigation (`visibleMonth`, `setVisibleMonth`, `jumpToPeriod`)
  - Month-level period summaries (`monthPeriods`)
- Provides CRUD operations: `addEntry`, `updateEntry`, `removeEntry`
- Period actions: `savePeriod`, `closeOrReopenPeriod`
- AI integration: `aiCmd`, `aiBusy`, `aiMsg`, `handleAIApply`
- Detects unsaved changes via `isDirty` flag (compares draft vs. persisted entries)
- **Key Logic:**
  - `equalEntriesForDates`: Deep comparison of entry arrays to detect changes
  - `loadPeriod`: Fetches period data from `/api/day_entries?from=X&to=Y`
  - `loadMonthPeriods`: Fetches summary data for calendar month view
  - `savePeriod`: PUTs draft entries to `/api/day_entries`
  - `handleAIApply`: Calls `/api/ai` with current entries + user command, normalizes AI response, updates draft state

#### 4. Pages (src/pages/)
**Dashboard.tsx:**
- Main employee view
- Conditionally renders based on employee status (loading/error/missing/ok)
- Wraps `DashboardBody` in `EmployeeProvider` and `PeriodDataProvider`
- **DashboardBody:**
  - Displays weekly progress bar (stacked by entry type: work/sick/time_off)
  - Renders `WeekNavigator` (calendar picker), `AIComposer`, `WeekGrid`, `FloatingToolbar`
  - Shows "unsaved edits" warning when `isDirty` is true
  - Displays "closed" badge when period is locked

**SignIn.tsx:**
- Email/password form
- Calls `signInWithPassword` from AuthContext
- Redirects to Dashboard on success

**Admin Pages (src/pages/admin/):**
- AdminDashboard, AdminAddEmployee, AdminEditEmployee
- AdminSettings, AdminAddSetting, AdminEditSetting
- AdminReports, AdminSignIn
- All wrapped in `AdminLayout` with sidebar navigation
- Use admin-specific API calls (require admin JWT)

#### 5. Components (src/components/)
**WeekGrid.tsx:**
- Renders 7-column day view (Monday–Sunday)
- For each day:
  - Shows expected hours, total hours, percentage, progress bar (segmented by entry type)
  - Lists all entries with inputs for hours, type dropdown (work/sick/time_off)
  - "+ Entry" button (disabled if period closed or outside employment dates)
  - Remove button per entry
- **Bug (lines 18-19):** `inStart` and `inEnd` logic appears swapped—should be `!isAfter` and `!isBefore` respectively to correctly check if day is within employment bounds

**WeekNavigator.tsx:**
- Inline `react-day-picker` calendar
- Highlights weeks with existing periods (using `monthPeriods` data)
- Shows green/yellow/red indicators based on week completion percentage
- Clicking a date jumps to that week via `jumpToPeriod(mondayISO)`

**AIInput.tsx:**
- Text input for natural language commands
- "Apply AI" button triggers `handleAIApply` from context
- Displays AI messages (errors or informational)
- Disabled when period is closed or AI is busy

**ButtonsToolbar.tsx:**
- Floating action buttons (bottom-right)
- "Save" button (disabled when not dirty or saving)
- "Close/Reopen Period" button (only visible when appropriate)

**Admin Components (src/components/admin/):**
- AdminSidebar, AdminFormEmployee, AdminFormSetting
- Reusable forms for CRUD operations

#### 6. Helpers (src/helpers/)
- **date.ts:** Date formatting and week calculation utilities (`getMonday`, `toISO`, `isDateAllowed`, `fmtDayLabel`, etc.)
- **shallowEqual.ts:** Object comparison utility

#### 7. Types (src/types/)
- TypeScript interfaces for all entities: `Employee`, `Setting`, `DayEntry`, `Period`, `DayExpectation`, etc.
- **Bug (line 75):** Typo in `DayExpectation` interface—`exptectedHours` should be `expectedHours`
- Enums: `DAY_TYPES = ["work", "sick", "time_off"]`

---

### Backend Architecture

#### API Route Structure (/api/*)
All API routes follow Vercel serverless function conventions with `export const config = { runtime: "nodejs" }`.

**Route Organization Pattern:**
```
/api/employees.ts          → router delegates to /api/_employees/*
  ↳ /_employees/get.ts     → GET handler
  ↳ /_employees/post.ts    → POST handler (create employee)
  ↳ /_employees/put.ts     → PUT handler (update employee)
  ↳ /_employees/delete.ts  → DELETE handler
```

This pattern repeats for `/api/settings`, `/api/_settings/*`, etc.

#### Shared Backend Utilities (/api/_shared/)
**auth.ts:**
- `requireUser(req)`: Verifies JWT from `Authorization: Bearer <token>` header, returns Supabase `User` object
- `requireAdmin(req)`: Same as above but also checks `user.app_metadata.is_admin === true`
- Throws HTTP errors (401, 403) with `status` property for proper error handling

**db.ts:**
- Exports Drizzle database connection instance
- Configured via `DATABASE_URL` environment variable

**supabase.ts:**
- Exports Supabase client for server-side auth verification
- Uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (service role required to verify JWTs)

#### Key API Endpoints

**`/api/employees`** (admin-only for list/create/update/delete, employees can fetch own profile):
- `GET ?id=me` → returns current user's employee record
- `GET` (admin) → lists all employees
- `POST` (admin) → creates employee + Supabase Auth user in transaction
- `PUT` (admin) → updates employee + optionally updates Supabase Auth email
- `DELETE` (admin) → soft-delete by setting `endDate` or hard-delete from DB

**`/api/day_entries`** (employee-scoped):
- `GET ?from=YYYY-MM-DD&to=YYYY-MM-DD` → returns:
  - Period record (creates if missing)
  - `entriesByDate` map of all entries in date range
  - `expectationsByDate` map of expected hours per day
  - `totals` per day (aggregated hours by type)
  - `totalDaysWithEntries` count
- `PUT` → saves entire week of entries (replaces existing entries for given dates):
  1. Validates input format and hours (0-24 per entry)
  2. Checks period not closed
  3. Deletes existing entries for those dates
  4. Inserts new entries (skips zero-hour entries)
  5. Upserts `day_expectations` to snapshot expected hours
  6. Updates `periods` table with new totals

**`/api/periods`**:
- `GET ?from=X&to=Y` → returns all period records between dates (for calendar month view)
- `PATCH` → close or reopen a period:
  - Body: `{ action: "close"|"reopen", fromDateISO: "YYYY-MM-DD" }`
  - Sets `closed` flag and `closedAt` timestamp

**`/api/settings`**:
- `GET` (employee) → returns default setting
- `GET ?id=N` (admin) → returns specific setting by ID
- `GET` (admin) → lists all settings
- `POST` (admin) → creates new setting
- `PUT` (admin) → updates setting
- `DELETE` (admin) → deletes setting (fails if in use by employees)
- **TODO (line 42 in get.ts):** Employee endpoint should fetch employee-specific setting via `employees.settingsId`, currently only fetches default

**`/api/reports`** (admin-only):
- `GET ?report=by-dates&from=X&to=Y&employeeId=N&format=csv`
  - Returns daily breakdown of hours by type across date range
  - Supports filtering by employee or "all"
  - Exports as JSON or CSV
- `GET ?report=missing-periods&before=X&onlyActive=true`
  - Lists unclosed periods before reference date
  - `onlyActive=true` filters to periods within employee employment dates
  - Helps identify incomplete timesheets
- **Note (line 2):** File marked as "HAVE YET TO REVIEW THIS FILE!!!" but appears functional

**`/api/ai`** (POST, authenticated):
- Body: `{ command: string, currentEntries: [...] }`
- Validates input via Zod schema (`InputSchema`)
- Calls OpenAI `generateObject` with structured output schema (`OutputSchema`)
- System prompt instructs AI to:
  - Return JSON matching schema (array of `{ date, entries: [{ hours, type }] }`)
  - Respect expected hours per day (never assume 8-hour days)
  - Handle commands like "fill week", "I was sick Monday", "reset Tuesday", etc.
  - Treat all entry types (work/sick/time_off) equally for hour calculations
- Returns `{ suggestions: [...], error?: string }`
- Frontend normalizes suggestions and validates dates before applying

---

### Database Schema (db/schema.ts)

**Key Tables:**

**`settings`:**
- Per-weekday expected hours (monHours, tueHours, ..., sunHours) as `numeric(4,2)`
- `isDefault` boolean (unique constraint ensures only one default via partial index)
- Used to calculate expected hours for time entry validation

**`employees`:**
- Links to Supabase Auth via `userId` (unique, not null)
- Optional `settingsId` reference (nullable, defaults to system default if null)
- `startDate` and `endDate` define employment period
- Cascade delete: removing employee deletes all their entries, periods, etc.

**`v_employees`** (view):
- Joins `employees` with `auth.users` to expose email addresses
- Uses `security invoker` mode (executes with permissions of calling user)

**`day_entries`:**
- Granular time entries (one row per entry)
- Fields: `employeeId`, `workDate`, `type` (enum), `projectId` (nullable), `hours` (numeric 5,2), `note` (nullable)
- Indexes on `(workDate)`, `(employeeId, workDate)`, `(workDate, employeeId)` for query performance
- Cascade deletes when employee removed

**`day_expectations`:**
- Snapshots expected hours at time of entry save
- Unique constraint on `(employeeId, workDate)` (one expectation per day)
- Prevents historical data from changing when settings are updated later

**`periods`:**
- Aggregates week-level data: `totalHours`, `expectedHours`, `closed` status
- `weekKey` format: "YYYY-Www" (ISO week notation)
- Unique constraint on `(employeeId, weekKey)`
- Indexed on `(closed, weekStartDate)` for reports

**`projects`:** (not yet integrated)
- Title, description, dates, progress, status
- Created by admin (`createdBy` references user ID)

**`employee_projects`:** (not yet integrated)
- Many-to-many linking employees to projects
- Composite primary key on `(employeeId, projectId)`

**Row-Level Security (RLS):**
- All tables have `.enableRLS()` but actual policies must be configured in Supabase dashboard
- Backend uses service role key (bypasses RLS) but client-side queries would be restricted
- Assumption: RLS policies enforce employee can only see own data, admins see all

---

## Data Flow Examples

### Example 1: Employee Saves Weekly Entries
1. Employee edits entries in UI → `PeriodDataContext` updates `draftEntriesByDate`
2. `isDirty` becomes true (draft ≠ persisted)
3. Employee clicks "Save" → `savePeriod()` called
4. Frontend sends `PUT /api/day_entries` with JSON body: `{ payload: { "2025-01-13": [{type: "work", hours: 8, ...}], ... } }`
5. Backend (`api/_entries/put.ts`):
   - Validates JWT → gets `employeeId`
   - Validates all dates and hours
   - Checks period not closed
   - Begins transaction:
     - Deletes existing entries for those dates
     - Inserts new entries (skips zero-hour entries)
     - Upserts `day_expectations` with current setting values
     - Updates `periods` table with recalculated `totalHours` and `expectedHours`
   - Returns 200 OK
6. Frontend updates `entriesByDate` to match `draftEntriesByDate`, `isDirty` becomes false
7. Calls `loadMonthPeriods()` to refresh calendar indicators

### Example 2: Admin Closes Period
1. Admin opens employee's Dashboard (viewing as employee via admin impersonation, or checking reports)
2. Admin clicks "Close Period" → `closeOrReopenPeriod()` called
3. Frontend sends `PATCH /api/periods` with body: `{ action: "close", fromDateISO: "2025-01-13" }`
4. Backend (`api/_periods/patch.ts`):
   - Validates JWT → requires admin
   - Derives `weekKey` from `fromDateISO`
   - Updates `periods` table: `SET closed = true, closedAt = NOW()`
   - Returns updated period
5. Frontend updates local `period.closed = true`
6. UI disables all inputs in `WeekGrid`, hides "Save" button, shows "Reopen Period" button

### Example 3: AI Fills Week
1. Employee types "Fill a normal week" in AI input → clicks "Apply AI"
2. Frontend calls `handleAIApply()` in `PeriodDataContext`
3. Prepares payload:
   ```json
   {
     "command": "Fill a normal week",
     "currentEntries": [
       { "date": "2025-01-13", "expectedHours": 8, "weekdayName": "monday", "entries": [] },
       ...
     ]
   }
   ```
4. Sends `POST /api/ai`
5. Backend (`api/ai.ts`):
   - Validates JWT
   - Validates input schema
   - Calls OpenAI `generateObject` with system prompt + user message
   - Returns `{ suggestions: [{ date: "2025-01-13", entries: [{ hours: 8, type: "work" }] }, ...] }`
6. Frontend normalizes suggestions:
   - Filters to dates in current week
   - Filters to dates within employment bounds
   - Caps hours to 0-24 range
7. Updates `draftEntriesByDate` with normalized suggestions
8. `isDirty` becomes true → employee can review and click "Save"

---

## Technical Patterns

### Frontend Patterns
- **Context + Hook Pattern:** Contexts provide state, hooks consume it (`useAuth`, `useEmployee`, `usePeriodDataContext`)
- **Optimistic UI:** Draft state (`draftEntriesByDate`) allows instant UI updates before save
- **Dirty Tracking:** Deep equality check detects unsaved changes
- **Snapshot Pattern:** `day_expectations` preserves historical expected hours even if settings change

### Backend Patterns
- **Shared Auth Layer:** `requireUser` and `requireAdmin` eliminate duplicate auth logic
- **Transaction-Based Writes:** Complex updates (save period entries) use DB transactions
- **Delegation Pattern:** Top-level route files (`api/employees.ts`) delegate to method-specific handlers (`api/_employees/get.ts`)
- **HTTP Error Objects:** Errors carry `.status` property for proper status code mapping

### Database Patterns
- **Aggregate Tables:** `periods` denormalizes weekly totals for faster queries
- **Snapshot Tables:** `day_expectations` captures point-in-time expected hours
- **Soft Deletes:** Employees can be soft-deleted via `endDate` before hard deletion
- **Partial Indexes:** Unique index on `settings.isDefault WHERE isDefault = true` allows only one default

---

## Security Considerations

1. **Authentication:** Supabase JWT tokens verified on every API request
2. **Authorization:** Admin flag checked via `app_metadata.is_admin`
3. **RLS Enabled:** All tables have RLS enabled (policies configured in Supabase)
4. **Input Validation:** API validates date formats, hour ranges, enum types
5. **SQL Injection Protection:** Drizzle ORM uses parameterized queries
6. **CORS:** Vercel handles CORS automatically for same-origin requests
7. **Secrets Management:** Environment variables for API keys (OpenAI, Supabase)

**Potential Risks:**
- No explicit rate limiting on AI endpoint (could be expensive if abused)
- Admin privilege escalation: No audit log for admin actions
- Period closure: No validation that all days have entries before closing (allows closing incomplete weeks)

---

## Deployment Architecture

**Vercel Configuration:**
- `vite.config.ts`: Frontend build config
- `vercel.json` (implied): Routes `/api/*` to serverless functions
- Environment variables: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`

**Database Migration:**
- Drizzle Kit commands: `npx drizzle-kit generate`, `npx drizzle-kit push`
- Migrations stored in `/drizzle` directory
- Manually applied to Supabase Postgres instance

**Build Pipeline:**
1. `npm run build` → `tsc -b` (type-check) + `vite build` (bundle frontend)
2. Vercel deploys `/dist` as static assets
3. Vercel deploys `/api` as serverless functions

---

## Summary

Tymmar's architecture demonstrates **modern best practices** with clear separation of concerns, type safety across boundaries, and scalable serverless deployment. The frontend context pattern provides clean state management, while the backend's delegation and shared auth utilities reduce duplication.

**Key Strengths:**
- Clean separation of draft vs. persisted state
- Snapshot pattern for historical data integrity
- AI integration with structured output validation
- Comprehensive indexing for query performance

**Areas for Improvement:**
- Test coverage (currently zero)
- Error boundaries in React app
- Standardized API response format
- Logging and observability layer
- Rate limiting on AI endpoint

Assumption: Codebase is designed for maintainability over extreme performance—acceptable for target scale (small-to-medium organizations).
