# Execution Plan

## Objectives
1. Boot the SPA without runtime or TypeScript blockers.
2. Restore the employee week workflow (fetch → edit → AI assist → save → close) end-to-end.
3. Enable admin teams to manage settings/employees reliably.
4. Ensure API handlers honor supported HTTP methods and reflect the client-side contracts.

## Tasks
1. **Stabilize routing and providers**
   - Point `src/main.tsx` to `router/AppRouter` and keep imports explicit.
   - Refactor `Dashboard` so `EmployeeProvider` wraps the hook consumer (`DashboardBody`) before `useEmployee()` is called.
2. **Fix authentication affordances**
   - Update `AuthContext.signInWithPassword` to return the Supabase `User` on success.
   - Use the returned user in `AdminSignIn` to validate `app_metadata.is_admin` before redirecting.
3. **Repair employee week UX**
   - Replace undefined `closed` references inside `AIInput` with `isClosed` checks.
   - Correct employment-bound calculations in `WeekGrid` and normalize the employee start/end dates in `PeriodDataContext`.
   - Trigger `loadMonthPeriods()` whenever the visible month changes so the calendar gains period metadata.
4. **Align admin settings UI with the Drizzle schema**
   - Convert `AdminFormSetting` (and all callers) to camelCase fields, fix initial values, named imports, and success messaging.
   - Ensure admin fetch calls apply Authorization headers only when a token exists.
   - In `AdminEditEmployee/Setting`, hydrate form state with `json.employee`/`json.setting` instead of the whole payload.
5. **Restore week persistence backend contract**
   - Update `PeriodDataContext.savePeriod` to send `{ entries }`, and `closeOrReopenPeriod` to include `period.weekKey` (fallback to `isoWeekKeyFromMonday`).
   - Extend `/api/day_entries` to select `settingsId` for the employee.
   - Implement `GET /api/periods` for the authenticated employee and fix the PATCH dispatcher plus payload parsing.
6. **Harden API handlers**
   - Refactor `/api/employees`, `/api/settings`, `/api/day_entries`, and `/api/periods` to return immediately after handling each allowed verb (switch statement or if/else chain) so they no longer fall through to `405`.
7. **Quality gate**
   - Run `npm run lint` and ensure zero errors/warnings.
