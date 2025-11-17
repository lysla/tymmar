# Risks and Bugs

This document tracks known bugs, technical risks, pending decisions, and technical debt in the Tymmar project. It serves as a living log for transparency and maintenance prioritization.

---

## Critical Security Issues

### SEC-001: Exposed Secrets in Repository

- **Type**: Security Risk
- **Severity**: CRITICAL
- **Status**: Open
- **File**: `/.env`
- **Description**: The `.env` file containing sensitive credentials has been committed to the git repository. This includes:
  - `OPENAI_API_KEY`: OpenAI API key for AI features
  - `DATABASE_URL`: PostgreSQL connection string with username/password
  - `JWT_SECRET`: JWT signing secret
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`: Supabase credentials
- **Impact**:
  - Anyone with repository access can see all credentials
  - Credentials are in git history even if file is removed
  - Risk of unauthorized database access, API abuse, and authentication bypass
- **Next Steps**:
  1. **Immediate**: Rotate all credentials (OpenAI API key, database password, JWT secret, Supabase keys)
  2. Add `.env` to `.gitignore` (if not already present)
  3. Remove `.env` from git history using `git filter-branch` or BFG Repo-Cleaner
  4. Update Vercel environment variables with new credentials
  5. Create `.env.example` template with placeholder values
  6. Document environment setup in README
- **Owner**: Developer
- **Priority**: P0 - Must fix before any production deployment

---

### SEC-002: Insecure Manual Admin Setup Endpoint

- **Type**: Security Vulnerability
- **Severity**: CRITICAL
- **Status**: Open
- **File**: `/api/manual-set-admin.ts`
- **Description**: Endpoint contains hardcoded email (`lysla@lysla.nl`) and allows setting admin role without authentication. File has comment: "HAVE YET TO REVIEW THIS FILE!!!"
- **Code Location**: Lines 1-42
- **Impact**:
  - Anyone can call this endpoint to set admin privileges
  - Hardcoded credentials expose personal email
  - No authentication or authorization required
- **Next Steps**:
  1. **Immediate**: Delete this file or disable the endpoint
  2. If admin setup is needed, create proper admin seeding via database migration
  3. Alternatively, create secure, one-time setup endpoint with secret token
  4. Remove any hardcoded personal information
- **Owner**: Developer
- **Priority**: P0 - Must remove before production

---

### SEC-003: No Rate Limiting

- **Type**: Security Risk
- **Severity**: HIGH
- **Status**: Open
- **Files**: All API endpoints, especially `/api/ai`
- **Description**: No rate limiting is implemented on any API endpoints. AI endpoint is particularly vulnerable due to OpenAI API costs.
- **Impact**:
  - API abuse can drain OpenAI credits
  - DDoS attacks can overwhelm serverless functions
  - Malicious users can spam database writes
- **Next Steps**:
  1. Implement rate limiting middleware using Vercel Edge Config or Upstash Redis
  2. Set limits per user per endpoint (e.g., 10 requests/minute for AI, 100 requests/minute for standard endpoints)
  3. Return 429 Too Many Requests with Retry-After header
  4. Log rate limit violations for monitoring
- **Owner**: Developer
- **Priority**: P1 - Implement before public launch

---

## Critical Bugs

### BUG-001: Undefined Variable Reference in AIInput

- **Type**: Bug (Runtime Error)
- **Severity**: HIGH
- **Status**: Open
- **File**: `/src/components/AIInput.tsx`
- **Lines**: 25, 30, 32
- **Description**: Component references `closed` variable which is not defined. Should likely be `disabled` prop or derived from `period?.closed_at` via context.
- **Code**:
  ```typescript
  // Line 25
  disabled={!aiEnabled || closed || aiLoading}

  // Line 30
  if (closed || !aiEnabled) return;

  // Line 32
  if (period?.closed_at !== null && !closed) {
  ```
- **Impact**:
  - Component will crash with "ReferenceError: closed is not defined" when rendered
  - AI features are unusable
  - User experience is broken on dashboard
- **Root Cause**: Variable rename or refactoring left undefined reference
- **Next Steps**:
  1. Determine correct source of "closed" state (likely `period?.closed_at !== null`)
  2. Replace all `closed` references with correct expression or add `const closed = !!period?.closed_at`
  3. Test AI input functionality after fix
- **Owner**: Developer
- **Priority**: P0 - Blocks AI feature usage

---

### BUG-002: Import Path Inconsistency

- **Type**: Bug (Potential)
- **Severity**: LOW
- **Status**: Open (may work due to module resolution)
- **File**: `/src/main.tsx`
- **Line**: 6
- **Description**: Imports `AppRouter` from `./AppRouter` but actual file is at `./router/AppRouter.tsx`
- **Code**:
  ```typescript
  import AppRouter from './AppRouter';  // Should be './router/AppRouter'
  ```
- **Impact**:
  - May work if TypeScript/Vite resolves module automatically
  - Breaks if module resolution changes
  - Confusing for developers
- **Next Steps**:
  1. Update import to `./router/AppRouter`
  2. Verify application still runs
  3. Check for similar inconsistencies in other imports
- **Owner**: Developer
- **Priority**: P2 - Fix for consistency

---

## Architectural Risks

### ARCH-001: God Component - PeriodDataContext

- **Type**: Technical Debt
- **Severity**: MEDIUM
- **Status**: Open
- **File**: `/src/context/PeriodDataContext.tsx`
- **Lines**: 420 lines (too large)
- **Description**: Context manages too many concerns:
  - Period data state
  - Day entries state
  - Calendar/date selection state
  - AI enabling/loading state
  - Save operations
  - Period close/reopen operations
  - Data fetching and refetching
- **Impact**:
  - Hard to maintain and understand
  - Causes unnecessary re-renders (any state change re-renders all consumers)
  - Difficult to test in isolation
  - Violates Single Responsibility Principle
- **Recommended Refactoring**:
  1. Split into separate contexts:
     - `PeriodContext`: Period data and status
     - `EntriesContext`: Day entries CRUD
     - `CalendarContext`: Date selection and navigation
     - `AIContext`: AI features and loading states
  2. Use context composition where needed
  3. Consider migrating to Zustand or Redux Toolkit for better performance
- **Owner**: Developer
- **Priority**: P2 - Refactor when time allows

---

### ARCH-002: No Service Layer

- **Type**: Architectural Gap
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: All API endpoints
- **Description**: Business logic is scattered across API endpoint handlers. No dedicated service layer for reusable business operations.
- **Impact**:
  - Code duplication across endpoints
  - Hard to test business logic in isolation
  - No clear separation of concerns
  - Difficult to reuse logic in background jobs or CLI tools
- **Recommended Architecture**:
  ```
  api/
    _services/
      employeeService.ts
      periodService.ts
      entryService.ts
    _employees/
      get.ts (thin handler, calls employeeService)
      post.ts
  ```
- **Next Steps**:
  1. Create `api/_services/` directory
  2. Extract business logic from handlers into service functions
  3. Make handlers thin wrappers that call services
  4. Write unit tests for services
- **Owner**: Developer
- **Priority**: P3 - Nice to have for maintainability

---

### ARCH-003: Inconsistent API Response Format

- **Type**: Technical Debt
- **Severity**: LOW
- **Status**: Open
- **Files**: All API endpoints
- **Description**: API responses lack consistent structure. Some use `{ employee }`, others use `{ employees }`, `{ setting }`, `{ settings }`, etc. No standard envelope.
- **Examples**:
  - `GET /api/employees` returns `{ employees: [...] }`
  - `POST /api/employees` returns `{ employee: {...} }`
  - `GET /api/reports` returns direct object with `periodSummaries` property
- **Impact**:
  - Frontend must handle different response shapes
  - Harder to add metadata (pagination, errors, warnings)
  - Inconsistent developer experience
- **Recommended Standard**:
  ```typescript
  {
    success: boolean,
    data: T,
    meta?: { ... },
    errors?: [...],
  }
  ```
- **Next Steps**:
  1. Define standard response interface in `api/_shared/responses.ts`
  2. Create helper functions for success/error responses
  3. Gradually migrate endpoints to use standard format
  4. Update frontend to handle new format
- **Owner**: Developer
- **Priority**: P3 - Future improvement

---

## Reliability Risks

### REL-001: No Error Boundaries

- **Type**: Reliability Risk
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: All React components
- **Description**: Application has no React error boundaries. Any component error crashes entire app with white screen.
- **Impact**:
  - Poor user experience on errors
  - No graceful degradation
  - No error reporting context
- **Next Steps**:
  1. Create `ErrorBoundary` component
  2. Wrap major route sections with error boundaries
  3. Add error logging to error boundary (Sentry, LogRocket)
  4. Show user-friendly error messages with reload button
- **Owner**: Developer
- **Priority**: P1 - Implement before production

---

### REL-002: No Retry Logic

- **Type**: Reliability Risk
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: All API calls in contexts and components
- **Description**: Failed API requests are not retried. Network blips or transient errors leave app in bad state.
- **Impact**:
  - User must manually refresh page on transient failures
  - Poor user experience
  - Data may be lost on failed save operations
- **Next Steps**:
  1. Implement retry wrapper for fetch calls (e.g., exponential backoff)
  2. Add timeout handling
  3. Show retry UI for failed operations
  4. Consider using library like `react-query` or `swr` for better data fetching
- **Owner**: Developer
- **Priority**: P2 - Improves user experience

---

### REL-003: No Loading Timeouts

- **Type**: Reliability Risk
- **Severity**: LOW
- **Status**: Open
- **Files**: All contexts with loading states
- **Description**: API calls have no timeout mechanism. If server doesn't respond, app stays in loading state indefinitely.
- **Impact**:
  - App appears frozen to user
  - No way to recover without page refresh
- **Next Steps**:
  1. Add timeout to all fetch calls (e.g., 30 seconds)
  2. Show error message on timeout
  3. Provide retry button
- **Owner**: Developer
- **Priority**: P2 - User experience improvement

---

## Data Integrity Risks

### DATA-001: Week Calculation Inconsistencies

- **Type**: Data Integrity Risk
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: `/src/helpers/date.ts`, multiple components
- **Description**: Multiple implementations of "Monday of the week" calculation. Potential for inconsistencies across codebase.
- **Locations**:
  - `helpers/date.ts`: `getMonday()`, `formatWeekRange()`
  - Components: Inline date calculations
- **Impact**:
  - Week boundaries might not align between frontend and backend
  - Period creation might use different week start than display
  - Time zone handling inconsistencies
- **Next Steps**:
  1. Audit all date calculations for consistency
  2. Centralize all week logic in `helpers/date.ts`
  3. Add unit tests for date utilities
  4. Document timezone handling strategy
  5. Ensure backend and frontend use same week calculation
- **Owner**: Developer
- **Priority**: P2 - Test thoroughly before production

---

### DATA-002: Floating Point Arithmetic for Hours

- **Type**: Data Integrity Risk
- **Severity**: LOW
- **Status**: Open
- **Files**: Database schema, all entry handling
- **Description**: Hours are stored as `numeric` type (PostgreSQL) and handled as floats in JavaScript. Potential for rounding errors.
- **Examples**: `7.99999999` instead of `8.0`
- **Impact**:
  - Rounding errors in totals
  - Display inconsistencies
  - Comparison issues (e.g., `hours === 8` might fail)
- **Current Mitigation**: PostgreSQL `numeric` type is precise, but JavaScript floats are not
- **Next Steps**:
  1. Add rounding utility for hour calculations
  2. Always round to 2 decimal places for display
  3. Use epsilon comparison for floating point equality checks
  4. Consider storing hours as integers (minutes or hundredths of hours)
- **Owner**: Developer
- **Priority**: P3 - Monitor for issues

---

### DATA-003: Timezone Handling

- **Type**: Data Integrity Risk
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: All date handling code
- **Description**: Mix of UTC and local time operations. No clear timezone handling strategy.
- **Impact**:
  - Period boundaries might shift based on user timezone
  - Week start might be different between users in different timezones
  - Reports might show incorrect dates
- **Next Steps**:
  1. Document timezone strategy (recommend: store UTC, display local)
  2. Audit all date operations for timezone consistency
  3. Add timezone conversion utilities
  4. Test with users in different timezones
  5. Consider adding timezone selection to employee settings
- **Owner**: Developer
- **Priority**: P2 - Important for international usage

---

## Performance Issues

### PERF-001: Large Bundle Size

- **Type**: Performance Issue
- **Severity**: MEDIUM
- **Status**: Open
- **Description**: No code splitting beyond route-level. All components, contexts, and utilities loaded upfront.
- **Impact**:
  - Slow initial page load
  - Wasted bandwidth for unused code
- **Metrics**: Bundle size not measured, needs tooling
- **Next Steps**:
  1. Analyze bundle size with `vite-bundle-visualizer`
  2. Implement dynamic imports for heavy components (e.g., admin pages)
  3. Lazy load date-fns and other large libraries
  4. Consider splitting vendor bundle further
- **Owner**: Developer
- **Priority**: P2 - Optimize when needed

---

### PERF-002: No Memoization Strategy

- **Type**: Performance Issue
- **Severity**: LOW
- **Status**: Open
- **Files**: Most components and contexts
- **Description**: Expensive calculations re-run on every render. No use of `useMemo`, `useCallback`, or `React.memo`.
- **Examples**:
  - Date calculations in `WeekGrid`
  - Total hours calculation
  - Week range formatting
- **Impact**:
  - Unnecessary re-computations
  - Sluggish UI on slower devices
- **Next Steps**:
  1. Profile with React DevTools Profiler
  2. Add `useMemo` for expensive calculations (date operations, filtering)
  3. Add `useCallback` for event handlers passed to child components
  4. Add `React.memo` for pure presentational components
- **Owner**: Developer
- **Priority**: P3 - Optimize if performance degrades

---

### PERF-003: N+1 Query Pattern in Reports

- **Type**: Performance Issue
- **Severity**: MEDIUM
- **Status**: Open
- **File**: `/api/reports.ts`
- **Description**: Reports endpoint may have N+1 query patterns when joining data. Needs investigation.
- **Impact**:
  - Slow report generation
  - Database connection exhaustion with many periods
- **Next Steps**:
  1. Audit SQL queries generated by Drizzle
  2. Use `.with()` for eager loading
  3. Consider materialized view for complex reports
  4. Add query performance logging
- **Owner**: Developer
- **Priority**: P2 - Monitor and optimize as data grows

---

### PERF-004: No Caching Strategy

- **Type**: Performance Issue
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: All API endpoints and frontend data fetching
- **Description**: Every page load hits database. No caching layer (Redis, Vercel KV, or browser cache).
- **Impact**:
  - Unnecessary database load
  - Slow page loads
  - Higher infrastructure costs
- **Next Steps**:
  1. Implement HTTP cache headers for GET endpoints
  2. Add Vercel Edge caching for static data (settings)
  3. Consider Redis/Upstash for frequently accessed data
  4. Add stale-while-revalidate caching on frontend
  5. Use `react-query` or `swr` for automatic client-side caching
- **Owner**: Developer
- **Priority**: P2 - Implement as usage grows

---

## Testing Gaps

### TEST-001: Zero Test Coverage

- **Type**: Testing Gap
- **Severity**: HIGH
- **Status**: Open
- **Description**: Project has 0% test coverage. No testing framework configured. CI runs test command but no tests execute.
- **Impact**:
  - High risk of regressions
  - Bugs discovered in production
  - Difficult to refactor with confidence
  - No executable documentation of behavior
- **Next Steps**:
  1. Configure Vitest for unit/integration tests
  2. Configure React Testing Library for component tests
  3. Configure MSW for API mocking
  4. Write tests for critical paths:
     - Authentication flow
     - Period closing/reopening
     - Hour entry and saving
     - Week calculations
     - Admin CRUD operations
  5. Set up coverage reporting
  6. Target 80%+ coverage for critical code
- **Owner**: Developer
- **Priority**: P1 - Essential for production readiness

---

### TEST-002: No E2E Tests

- **Type**: Testing Gap
- **Severity**: MEDIUM
- **Status**: Open
- **Description**: No end-to-end tests for user flows. Manual testing only.
- **Impact**:
  - Integration bugs not caught until production
  - Time-consuming manual regression testing
  - No confidence in deployment
- **Next Steps**:
  1. Set up Playwright for E2E testing
  2. Write tests for critical flows:
     - Login → Dashboard → Enter hours → Save → Close period
     - Admin → Create employee → Manage settings
     - AI-assisted hour filling
  3. Run E2E tests in CI pipeline
  4. Add visual regression testing
- **Owner**: Developer
- **Priority**: P2 - Important for stability

---

## Code Quality Issues

### QUAL-001: TypeScript `any` Usage

- **Type**: Code Quality Issue
- **Severity**: MEDIUM
- **Status**: Open
- **Files**: 13 files (15 frontend, 18 backend occurrences)
- **Description**: 33 uses of `any` type bypass TypeScript type checking. ESLint rule `@typescript-eslint/no-explicit-any` is disabled.
- **Impact**:
  - Lost type safety benefits
  - Runtime errors not caught at compile time
  - Harder to refactor with confidence
- **Locations**:
  - API request/response handlers
  - Drizzle query results
  - Error handling catch blocks
- **Next Steps**:
  1. Enable `@typescript-eslint/no-explicit-any` in ESLint config
  2. Replace `any` with proper types:
     - `unknown` for catch blocks
     - Proper request/response types for API handlers
     - Drizzle inferred types for query results
  3. Add type guards where needed
  4. Use `@ts-expect-error` with comment for unavoidable cases
- **Owner**: Developer
- **Priority**: P2 - Improves code quality

---

### QUAL-002: Console.log in Production Code

- **Type**: Code Quality Issue
- **Severity**: LOW
- **Status**: Open
- **Files**: 6 files (admin pages, components)
- **Description**: Debug `console.log` statements left in production code.
- **Impact**:
  - Cluttered browser console
  - Potential information leakage
  - Unprofessional
- **Next Steps**:
  1. Remove all `console.log` statements
  2. Add ESLint rule to warn on console usage (`no-console`)
  3. Implement proper logging library (Winston, Pino)
  4. Add conditional logging for development only
- **Owner**: Developer
- **Priority**: P3 - Cleanup before production

---

### QUAL-003: Commented-Out Code

- **Type**: Code Quality Issue
- **Severity**: LOW
- **Status**: Open
- **Files**: `/src/components/WeekGrid.tsx` (line 105), others
- **Description**: Commented-out code left in files. Git history should be source of truth, not comments.
- **Example**:
  ```typescript
  // const projectLabel = projects.find((p) => p.value === entry.projectId)?.label || 'Default';
  ```
- **Impact**:
  - Clutters code
  - Confusing for developers (should we use this?)
  - Hard to know if it's intentional or forgotten
- **Next Steps**:
  1. Remove all commented-out code
  2. Use git history if code needs to be restored
  3. Add TODO comments if feature is planned
- **Owner**: Developer
- **Priority**: P3 - Cleanup for maintainability

---

## Incomplete Features

### FEAT-001: Project Association

- **Type**: Incomplete Feature
- **Severity**: LOW
- **Status**: Open
- **Files**: `/src/components/WeekGrid.tsx` (lines 92-96), `/db/schema.ts`
- **Description**: Project dropdown exists in UI but is disabled with "— Project (soon) —" placeholder. Database schema supports projects, but feature is not implemented.
- **Code**:
  ```typescript
  <option value="" disabled>
    — Project (soon) —
  </option>
  ```
- **Impact**:
  - Users cannot associate entries with projects
  - Promised feature not delivered
- **Database Support**: `projects` table exists, `day_entries.project_id` foreign key exists
- **Next Steps**:
  1. Decide if feature should be completed or removed
  2. If keeping:
     - Implement project CRUD in admin
     - Enable project selection in WeekGrid
     - Update reports to group by project
  3. If removing:
     - Remove disabled dropdown
     - Consider removing project_id column (migration)
- **Owner**: Developer
- **Priority**: P3 - Decide direction

---

### FEAT-002: Settings Retrieval from Employee

- **Type**: Incomplete Feature
- **Severity**: LOW
- **Status**: Open
- **File**: `/api/_settings/get.ts`
- **Line**: 42
- **Description**: TODO comment: "TODO: retrieve the setting from the employee settingId if possible"
- **Current Behavior**: Returns all settings
- **Intended Behavior**: Return employee-specific setting if `settingId` is set on employee record
- **Impact**:
  - Frontend must filter settings manually
  - Potential data leakage (returning all settings when only one needed)
- **Next Steps**:
  1. Implement logic to check employee's `settingId`
  2. Return specific setting if employee has one assigned
  3. Fallback to default setting if no assignment
  4. Add tests for this behavior
- **Owner**: Developer
- **Priority**: P3 - Nice to have

---

### FEAT-003: Projects Table Review

- **Type**: Pending Review
- **Severity**: LOW
- **Status**: Open
- **File**: `/db/schema.ts`
- **Line**: 136
- **Description**: Comment "👀 to review later -- connected with Ale's project". Unclear if this is production-ready or experimental.
- **Impact**: Uncertainty about feature status
- **Next Steps**:
  1. Clarify with stakeholders if this is production feature
  2. Document intended usage of projects table
  3. Remove comment once clarified
  4. If experimental, move to feature branch or separate schema
- **Owner**: Developer & Stakeholders
- **Priority**: P4 - Clarification needed

---

## Dependency Risks

### DEP-001: React 19 Adoption

- **Type**: Dependency Risk
- **Severity**: LOW
- **Status**: Monitoring
- **Package**: `react@19.1.1`, `react-dom@19.1.1`
- **Description**: Using React 19, which is very recent. Potential for breaking changes and ecosystem incompatibilities.
- **Impact**:
  - Some libraries may not be compatible yet
  - Edge cases and bugs may exist
  - Community resources limited compared to React 18
- **Mitigation**: Pin versions, test thoroughly
- **Next Steps**:
  1. Monitor React 19 release notes
  2. Test all features thoroughly
  3. Have rollback plan to React 18 if issues arise
  4. Check library compatibility (react-router, react-day-picker)
- **Owner**: Developer
- **Priority**: P3 - Monitor for issues

---

### DEP-002: Multiple Bundler/Build Tools

- **Type**: Dependency Complexity
- **Severity**: LOW
- **Status**: Open
- **Packages**: NX + Vite
- **Description**: Using both NX (monorepo tool) and Vite (build tool). Adds complexity but may be overkill for single-app repo.
- **Impact**:
  - Learning curve for contributors
  - Potential configuration conflicts
  - More dependencies to maintain
- **Trade-off**: NX provides affected builds and caching benefits
- **Next Steps**:
  1. Document why NX is used (affected builds in CI)
  2. Ensure NX cache is properly configured
  3. Consider removing NX if not utilizing its features
  4. Alternatively, fully commit to NX and use generators
- **Owner**: Developer
- **Priority**: P4 - Evaluate ROI

---

## Documentation Gaps

### DOC-001: Minimal README

- **Type**: Documentation Gap
- **Severity**: MEDIUM
- **Status**: Open
- **File**: `/README.md`
- **Current State**: 3 lines, vague description
- **Missing**:
  - Project setup instructions
  - Environment variable setup
  - Database setup and migrations
  - How to run locally
  - How to deploy
  - Architecture overview
  - Contribution guidelines
  - Testing instructions
- **Impact**:
  - Hard for contributors to onboard
  - No reference for setup process
- **Next Steps**:
  1. Expand README with:
     - Installation steps
     - Environment setup
     - Database migrations
     - Running dev server
     - Running tests
     - Deployment process
     - Architecture link (to this doc)
  2. Add CONTRIBUTING.md
  3. Add CODE_OF_CONDUCT.md if open source
- **Owner**: Developer
- **Priority**: P2 - Important for collaboration

---

### DOC-002: No API Documentation

- **Type**: Documentation Gap
- **Severity**: MEDIUM
- **Status**: Open
- **Description**: API endpoints are not documented. No OpenAPI/Swagger spec.
- **Impact**:
  - Frontend developers must read backend code
  - Hard to integrate with external tools
  - No contract testing
- **Next Steps**:
  1. Document all endpoints in markdown or OpenAPI format
  2. Include request/response schemas
  3. Add authentication requirements
  4. Document error codes
  5. Consider auto-generating docs from TypeScript types
- **Owner**: Developer
- **Priority**: P2 - Helpful for development

---

### DOC-003: No Architecture Diagrams

- **Type**: Documentation Gap
- **Severity**: LOW
- **Status**: Partially addressed (this document)
- **Description**: No visual diagrams of system architecture, data flow, or entity relationships.
- **Impact**:
  - Harder to understand system at a glance
  - Onboarding takes longer
- **Next Steps**:
  1. Create ERD (Entity Relationship Diagram) for database
  2. Create system architecture diagram
  3. Create data flow diagrams for critical paths
  4. Use tools like Mermaid, PlantUML, or Excalidraw
  5. Include diagrams in documentation
- **Owner**: Developer
- **Priority**: P3 - Nice to have

---

## Monitoring & Observability Gaps

### MON-001: No Error Tracking

- **Type**: Observability Gap
- **Severity**: MEDIUM
- **Status**: Open
- **Description**: No error tracking service integrated (Sentry, Rollbar, Bugsnag).
- **Impact**:
  - Errors only discovered when users report them
  - No context about error conditions
  - Hard to prioritize bug fixes
- **Next Steps**:
  1. Integrate Sentry or similar service
  2. Add error boundaries that report to Sentry
  3. Add breadcrumbs for user actions
  4. Configure source maps for stack traces
  5. Set up alerts for critical errors
- **Owner**: Developer
- **Priority**: P1 - Essential for production

---

### MON-002: No Application Performance Monitoring

- **Type**: Observability Gap
- **Severity**: LOW
- **Status**: Open
- **Description**: No APM tool to monitor API response times, database query performance, or frontend metrics.
- **Impact**:
  - Performance degradation not noticed until severe
  - Hard to identify bottlenecks
  - No baseline for optimization
- **Next Steps**:
  1. Integrate Vercel Analytics (included with Vercel)
  2. Consider Datadog, New Relic, or Grafana for backend
  3. Add custom performance marks for critical operations
  4. Set up dashboards for key metrics
  5. Configure alerts for slow endpoints (>1s response time)
- **Owner**: Developer
- **Priority**: P2 - Important for production

---

### MON-003: No Audit Logging

- **Type**: Security/Compliance Gap
- **Severity**: MEDIUM
- **Status**: Open
- **Description**: No audit trail for sensitive operations (admin actions, period closures, data modifications).
- **Impact**:
  - Cannot track who did what
  - Hard to debug data issues
  - Compliance risk for regulated industries
- **Next Steps**:
  1. Add `audit_log` table to database
  2. Log all admin actions (employee CRUD, setting changes)
  3. Log period closures and reopens
  4. Include user, timestamp, action, old/new values
  5. Create admin UI to view audit logs
- **Owner**: Developer
- **Priority**: P2 - Important for production environments

---

## Summary Statistics

- **Total Issues**: 36
- **Critical Severity**: 4
- **High Severity**: 2
- **Medium Severity**: 16
- **Low Severity**: 14

### By Category

- **Security**: 3 critical
- **Bugs**: 2
- **Architecture**: 3
- **Reliability**: 3
- **Data Integrity**: 3
- **Performance**: 4
- **Testing**: 2
- **Code Quality**: 3
- **Incomplete Features**: 3
- **Dependencies**: 2
- **Documentation**: 3
- **Monitoring**: 3

### Priority Breakdown

- **P0 (Immediate)**: 3 items
- **P1 (Before Production)**: 4 items
- **P2 (Important)**: 14 items
- **P3 (Nice to Have)**: 11 items
- **P4 (Future)**: 2 items

---

**Last Updated**: 2025-11-12
**Document Version**: 1.0
**Review Frequency**: Weekly during active development
