# Architecture

## Frontend (Vite + React)
- **Entrypoint (`src/main.tsx`)** bootstraps React, React Router, and the `AuthProvider`. Once fixed, it should also mount the employee + period providers around consumer routes.
- **Routing (`src/router`)**
  - `AppRouter` defines public (`/signin`), employee (`/`), and admin (`/admin`, `/admin/signin`) routes.
  - `RouteGuards` leverage `useAuth` to redirect unauthenticated or non-admin users, using loading spinners while Supabase restores the session.
- **State & Contexts (`src/context`, `src/hooks`)**
  - `AuthContext` wraps Supabase auth, exposes the current user, admin flag, session token helper, and sign-in/out methods.
  - `EmployeeContext` fetches the employee profile for the logged-in Supabase user and caches/refetches it.
  - `PeriodDataContext` owns weekly state: selected range, expected hours, draft vs. persisted entries, AI commands, saving/closing actions, and month metadata. It depends on helper utilities under `src/helpers` for ISO/date math.
- **Components**
  - `WeekNavigator` (react-day-picker) controls the active week, constrained by employment start/end dates.
  - `WeekGrid` renders daily progress, entry editors, and per-day summary bars (colored by `DAY_TYPE_COLORS`).
  - `ButtonsToolbar` and `AIInput` surface global actions (save week, close/reopen, AI fill).
  - Admin-specific components live under `src/components/admin` (sidebar, employee/settings forms).
- **Pages**
  - `Dashboard` orchestrates employee-specific providers and renders `DashboardBody`, which combines the navigator, AI composer, progress summary, week grid, and toolbar.
  - `SignIn` and `AdminSignIn` pages share structure but enforce different redirects/metadata checks.
  - `/pages/admin/*` implement CRUD tables and forms for employees, hour settings, and reports.
- **Styling** is handled through Tailwind’s `@theme` API plus custom utility classes defined in `src/index.css`. Fonts live in `src/assets/fonts`.

## Backend (Vercel Serverless + Supabase + Drizzle)
- **Shared libs (`api/_shared`)**
  - `auth.ts` validates `Authorization: Bearer <token>` headers against Supabase, exposing `requireUser` and `requireAdmin` helpers that throw HTTP-like errors.
  - `db.ts` instantiates a Drizzle client over the primary Postgres connection string.
  - `supabase.ts` exposes both anon and service-role Supabase clients for user management tasks.
- **Domain routes**
  - `/api/employees`, `/api/settings`, `/api/day_entries`, `/api/periods`, `/api/reports`, `/api/ai`, `/api/manual-set-admin`.
  - Each CRUD-style route proxies to an `_module` folder (e.g., `_employees/get.ts`) to keep handlers small and reusable.
  - Routes rely on Drizzle schema definitions in `db/schema.ts`, which describe tables/views for settings, employees, periods, day entries/expectations, projects, and join tables.
- **Auth boundaries**
  - Admin endpoints (employees, settings, reports) require `requireAdmin`; day entry + period operations only require authenticated employees.
  - The Supabase service-role client (`supadmin`) is used when provisioning or deleting Supabase auth users in tandem with the employees table.
- **AI endpoint** (`/api/ai`) validates the request body with `zod` schemas defined under `api/_ai` and delegates to OpenAI (via `@ai-sdk/openai` + `generateObject`) with a constrained schema output.

## Data Flow
1. **Authentication**
   - Client signs in through Supabase; `AuthProvider` listens for session changes and exposes JWT acquisition via `getAccessToken`.
   - Employee data is fetched server-side (`GET /api/employees` → `v_employees` view) with internal admin fallbacks.
2. **Week lifecycle**
   - `PeriodDataContext` fetches entries (`GET /api/day_entries?from=&to=`) and, when saving, sends normalized entries payloads to `PUT /api/day_entries`.
   - Closing/reopening periods should issue `PATCH /api/periods` and rely on server-side enforcement whether totals meet expected hours.
   - Monthly status data is intended to come from `GET /api/periods?from=&to=` to color-code the day-picker.
3. **Administration**
   - Employee CRUD flows call `/api/employees` with JSON bodies matching `EmployeeForm`.
   - Hour settings flows call `/api/settings`, ensuring only one default record at a time within a transaction.
   - Reports fetch aggregated rows or CSV exports from `/api/reports`.

## Observed Conventions & Patterns
- Backend modules throw typed errors with `status` codes that the top-level handler converts to HTTP responses.
- Frontend follows the Constitution guidelines: emoji “👀” comments annotate intent, contexts wrap hook consumers, and helper functions live under `src/helpers`.
- Nx is only used for caching; there is no workspace graph defined yet.

## Notable Gaps
- No automated tests exist for either frontend or backend logic; linting is the only enforced check.
- Provider composition is currently incorrect (dashboard calls `useEmployee` before mounting `EmployeeProvider`).
- `/api/periods` lacks GET support and the existing PATCH handler expects a different payload than the frontend sends.
- Admin forms still use snake_case field names which do not align with the TypeScript domain types or Drizzle schema, leading to runtime failures.
