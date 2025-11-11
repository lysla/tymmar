# Risks and Bugs

## Active Bugs

### 1. Employment Date Validation Logic Error
- **Location:** `src/components/WeekGrid.tsx:18-19`
- **Type:** Bug
- **Status:** Open
- **Description:** Variables `inStart` and `inEnd` appear to have swapped logic when checking if a day falls within employment bounds:
  ```typescript
  const inStart = !employeeEndDateISO || !isBefore(d, employeeEndDateISO);
  const inEnd = !employeeStartDateISO || !isAfter(d, employeeStartDateISO);
  ```
  Should likely be:
  ```typescript
  const inStart = !employeeStartDateISO || !isBefore(d, employeeStartDateISO);
  const inEnd = !employeeEndDateISO || !isAfter(d, employeeEndDateISO);
  ```
  **Impact:** Days may be incorrectly enabled/disabled in the UI when employee has start/end dates defined
- **Next Steps:** Review logic with test cases for employees with `startDate` and `endDate` set

### 2. Typo in Type Definition
- **Location:** `src/types/schema.ts:75`
- **Type:** Bug (typo)
- **Status:** Open
- **Description:** `DayExpectation` interface has `exptectedHours` (should be `expectedHours`)
- **Impact:** Code will fail to compile if this field is accessed with correct spelling; database column is spelled correctly (`expected_hours`)
- **Next Steps:** Rename to `expectedHours` and verify all references

---

## Technical Risks

### 3. Unreviewed Reports Module
- **Location:** `api/reports.ts:2`
- **Type:** Risk (code review pending)
- **Status:** Open
- **Description:** File contains comment "HAVE YET TO REVIEW THIS FILE!!!" indicating incomplete review process
- **Impact:** Code appears functional but may contain undiscovered issues; admin reports are business-critical for payroll workflows
- **Next Steps:** Conduct thorough code review, add integration tests for report accuracy

### 4. No Validation Before Period Closure
- **Location:** `api/_periods/patch.ts`, `src/context/PeriodDataContext.tsx:closeOrReopenPeriod`
- **Type:** Risk (business logic)
- **Status:** Open
- **Description:** Periods can be closed even if not all days have entries or if total hours are zero
- **Impact:** Employees might accidentally close incomplete weeks, requiring admin intervention to reopen
- **Next Steps:** Add backend validation to check `totalDaysWithEntries >= 5` (or configurable threshold) before allowing closure

### 5. AI Endpoint Has No Rate Limiting
- **Location:** `api/ai.ts`
- **Type:** Risk (cost/abuse)
- **Status:** Open
- **Description:** No rate limiting or quota management on `/api/ai` endpoint
- **Impact:** Malicious or careless users could trigger expensive OpenAI API calls; single user could exhaust API budget
- **Next Steps:** Implement Vercel rate limiting or Upstash Redis-based throttling (e.g., 10 requests per user per minute)

### 6. Admin Actions Are Not Audited
- **Location:** All admin-only endpoints (`api/_employees/*`, `api/_settings/*`, `api/_periods/patch.ts`)
- **Type:** Risk (compliance/accountability)
- **Status:** Open
- **Description:** No audit trail for admin actions (who edited employee records, who closed/reopened periods, etc.)
- **Impact:** Impossible to trace data integrity issues or unauthorized changes; fails compliance requirements in regulated industries
- **Next Steps:** Create `audit_log` table with columns: `actor_user_id`, `action`, `entity_type`, `entity_id`, `timestamp`, `details`; log all admin mutations

### 7. No Error Boundaries in React App
- **Location:** `src/main.tsx`, component tree
- **Type:** Risk (reliability)
- **Status:** Open
- **Description:** No React error boundaries to catch rendering errors
- **Impact:** Single uncaught error in any component crashes entire app, showing blank screen to users
- **Next Steps:** Add top-level error boundary in `main.tsx` and boundary around `PeriodDataProvider` (largest state container)

### 8. Supabase Service Role Key in Environment
- **Location:** `api/_shared/supabase.ts`
- **Type:** Risk (security)
- **Status:** Open (acceptable if properly secured)
- **Description:** Backend uses `SUPABASE_SERVICE_ROLE_KEY` which bypasses RLS
- **Impact:** If leaked, attacker has full database access; proper secret management is critical
- **Next Steps:** Verify key is stored in Vercel environment variables (not `.env` file in repo); rotate key periodically; consider using Supabase's anon key + RLS policies instead of service role where possible

---

## Technical Debt

### 9. Missing Employee-Specific Settings Retrieval
- **Location:** `api/_settings/get.ts:42`
- **Type:** Technical Debt
- **Status:** Open (documented TODO)
- **Description:** TODO comment indicates endpoint should fetch employee-specific settings via `employees.settingsId`, currently only returns default setting for non-admin users
- **Impact:** Employees cannot have custom work-hour schedules (e.g., part-time employees with 4-day weeks); all employees share default settings
- **Next Steps:** Implement logic:
  1. Fetch employee record for current user
  2. If `settingsId` is not null, return that setting
  3. Otherwise return default setting

### 10. Projects Feature Incomplete
- **Location:** `db/schema.ts:136-167` (projects tables), `src/components/WeekGrid.tsx:92-97` (disabled project dropdown)
- **Type:** Technical Debt
- **Status:** Postponed
- **Description:** Database schema includes `projects` and `employee_projects` tables with foreign keys from `day_entries.projectId`, but UI shows "— Project (soon) —" disabled dropdown
- **Impact:** Cannot track time per project; reduces usefulness for project-based billing or resource allocation
- **Next Steps:**
  1. Create `/api/projects` CRUD endpoints
  2. Enable project dropdown in `WeekGrid` with list of employee's assigned projects
  3. Display project breakdown in reports

### 11. Notes Field Exists But Is Hidden
- **Location:** `src/components/WeekGrid.tsx:104-105` (commented out), `db/schema.ts:95` (schema definition)
- **Type:** Technical Debt
- **Status:** Open (feature partially implemented)
- **Description:** `day_entries.note` column exists in database but input field is commented out in UI
- **Impact:** Employees cannot add context to time entries (e.g., "Worked on client X presentation"); reduces timesheet clarity
- **Next Steps:** Uncomment input field, add character limit (e.g., 500 chars), update `updateEntry` to handle `note` field

### 12. No Automated Tests
- **Location:** Entire codebase
- **Type:** Technical Debt
- **Status:** Open
- **Description:** No test suite present (no `*.test.ts` files, no test runner configured)
- **Impact:** High risk of regressions when refactoring; difficult to validate business logic correctness (e.g., hour calculations, period closure logic)
- **Next Steps:**
  1. Add Vitest for unit tests
  2. Priority areas: `PeriodDataContext.equalEntriesForDates`, date helpers, API validation logic
  3. Add Playwright for E2E tests (sign in → fill week → save → verify persistence)

### 13. Error Handling Is Inconsistent
- **Location:** Multiple API endpoints, frontend fetch calls
- **Type:** Technical Debt
- **Status:** Open
- **Description:** Some API routes return `{ error: string }`, others throw exceptions; frontend sometimes shows generic "Failed to load" messages
- **Impact:** Poor user experience when errors occur; difficult to debug production issues
- **Next Steps:**
  1. Standardize API response format: `{ success: boolean, data?: T, error?: { message: string, code: string } }`
  2. Create `ApiError` class with structured error codes
  3. Add toast notification system for user-facing errors

### 14. Date Utilities Are Scattered
- **Location:** `src/helpers/date.ts`, `api/_entries/put.ts:getExpectedHoursForDate`, inline date logic in components
- **Type:** Technical Debt (code organization)
- **Status:** Open
- **Description:** Date manipulation logic duplicated across frontend and backend; some utils only exist in one layer
- **Impact:** Increases maintenance burden; risk of frontend/backend calculating dates differently
- **Next Steps:** Create shared `@tymmar/shared` package with date utils, types, constants; import in both frontend and backend

---

## Design Limitations

### 15. Single-Week Editing Scope
- **Type:** Design Limitation
- **Status:** By Design (acceptable)
- **Description:** UI only allows editing one week at a time; cannot bulk-fill multiple weeks or copy week templates
- **Impact:** Repetitive data entry for employees with consistent schedules
- **Next Steps (Future Enhancement):** Add "Copy Previous Week" button, bulk-fill UI for date ranges

### 16. No Mobile-Optimized UI
- **Type:** Design Limitation
- **Status:** Open
- **Description:** Grid layout and calendar picker are not optimized for mobile viewports
- **Impact:** Difficult to use on phones; employees must use desktop or large tablet
- **Next Steps (Future Enhancement):** Add responsive breakpoints, stack days vertically on mobile, use native date picker

### 17. Admin Cannot Edit Employee Time Entries
- **Type:** Design Limitation
- **Status:** By Design (debatable)
- **Description:** Admins can view reports but cannot directly edit an employee's time entries (would need to sign in as that employee)
- **Impact:** If employee makes a mistake, admin must ask them to fix it; no "edit on behalf of" capability
- **Next Steps (Future Enhancement):** Add "Edit as Employee" impersonation mode for admins in `/admin/employee/:id/edit` page

---

## Monitoring & Observability Gaps

### 18. No Logging Infrastructure
- **Type:** Risk (operations)
- **Status:** Open
- **Description:** No structured logging in API routes; only default Vercel function logs
- **Impact:** Difficult to debug production issues, understand usage patterns, or detect abuse
- **Next Steps:** Integrate logging library (e.g., Pino), log all API requests with `userId`, `endpoint`, `duration`, `statusCode`

### 19. No Performance Monitoring
- **Type:** Risk (performance)
- **Status:** Open
- **Description:** No frontend performance tracking (e.g., page load time, API latency)
- **Impact:** Cannot identify slow queries or degraded user experience
- **Next Steps:** Integrate Vercel Analytics or Sentry Performance Monitoring; add timing logs for slow DB queries

---

## Summary

### Critical (Fix Immediately)
- **Bug #1:** Employment date validation logic error (WeekGrid.tsx:18-19)
- **Bug #2:** Typo in `DayExpectation.exptectedHours` type definition

### High Priority (Address Soon)
- **Risk #5:** AI endpoint rate limiting
- **Risk #7:** No React error boundaries
- **Debt #12:** No automated tests
- **Risk #4:** Period closure validation

### Medium Priority (Plan for Next Quarter)
- **Risk #6:** Admin action audit logging
- **Debt #9:** Employee-specific settings retrieval (TODO)
- **Debt #13:** Error handling standardization
- **Risk #3:** Reports module review

### Low Priority (Future Enhancements)
- **Debt #10:** Projects feature completion
- **Debt #11:** Notes field UI
- **Limitation #16:** Mobile optimization
- **Limitation #17:** Admin edit-on-behalf capability

---

**Overall Risk Assessment:** **Medium**

The codebase is functional and demonstrates good practices, but lacks production-readiness features (tests, error boundaries, audit logging, rate limiting). The two active bugs (employment dates, typo) are straightforward to fix but could cause user-facing issues if triggered.

Recommendation: Address Critical and High Priority items before promoting to production use in regulated environments or larger teams.
