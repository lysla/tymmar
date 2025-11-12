# Risks & Bugs

### SPA cannot start (routing + provider wiring)
- **Type:** Bug
- **Status:** Open
- **Details:** `src/main.tsx` imports `AppRouter` from `./AppRouter` even though the file lives in `src/router/AppRouter.tsx`, and `Dashboard` calls `useEmployee()` before any `EmployeeProvider` is mounted. The combination causes TypeScript build failures and runtime errors (“useEmployee must be used within <EmployeeProvider>”).
- **Next steps:** Fix the import path, reorganize `Dashboard` so the provider wraps the hook consumer, and ensure other pages mount contexts before reading them.

### Admin settings schema mismatch
- **Type:** Bug / Data mismatch
- **Status:** Open
- **Details:** `AdminFormSetting` and related admin pages still use `mon_hours`/`tue_hours` keys, but the shared `Setting` types and API expect camelCase (`monHours`, …). Requests therefore serialize `undefined` values, causing validation failures on the server and leaving settings impossible to create/edit.
- **Next steps:** Update form state, validation, initial values, and UI renderers to use camelCase; verify API payloads follow the Drizzle schema.

### API handlers fall through to 405
- **Type:** Bug / Reliability
- **Status:** Open
- **Details:** `/api/employees`, `/api/settings`, `/api/day_entries`, and `/api/periods` call the appropriate helper but never return afterward, so the handler continues and responds with `405 Method Not Allowed`. Vercel logs show “Cannot set headers after they are sent”.
- **Next steps:** Switch to `switch` or `if/else` plus `return` after each handled method.

### Week persistence pipeline broken
- **Type:** Bug
- **Status:** Open
- **Details:**
  - Frontend sends `{ payload: … }` to `PUT /api/day_entries`, while the API expects `req.body.entries`.
  - `/api/day_entries` selects only the employee id, never the `settingsId`, so expected hours always fall back to defaults.
  - `/api/periods` lacks a GET handler, the existing PATCH branch never runs (`if (method !== 'PATCH')`), and the payload contract mismatches the frontend (server expects `period.weekKey`, client sends `fromDateISO`).
  - `PeriodDataContext` never invokes `loadMonthPeriods`, so the calendar cannot render monthly status.
- **Next steps:** Align payload keys, fetch `settingsId`, add `useEffect` for month loading, implement a real GET handler plus a proper PATCH guard and payload normalization.

### Employment bounds validation inverted
- **Type:** Bug / UX
- **Status:** Open
- **Details:** `WeekGrid` determines whether a day falls inside an employee’s contract using `employeeEndDateISO` in the start comparison and `employeeStartDateISO` in the end comparison. This inversion lets people edit outside their contract while blocking valid ranges.
- **Next steps:** Normalize bounds to `Date` objects and perform correct `isBefore`/`isAfter` checks.

### AI input reference error
- **Type:** Bug
- **Status:** Open
- **Details:** `AIInput` uses `!aiBusy && !closed` and similar checks, but `closed` is undefined (the prop is named `isClosed`). Pressing Enter throws a ReferenceError and blocks the AI flow.
- **Next steps:** Replace `closed` with `isClosed` when computing `disabled` flags and event handlers.

### Manual admin reset endpoint is unsafe
- **Type:** Risk / Security
- **Status:** Open
- **Details:** `/api/manual-set-admin` loops through users, finds a hard-coded email, and sets the password to `password` while flagging `app_metadata.is_admin = true`. If deployed accidentally, this endpoint is a critical security backdoor.
- **Next steps:** Remove the route or protect it behind environment flags; never ship it to production.
