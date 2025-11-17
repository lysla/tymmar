# Refactor and Improvement Plan

This document contains an ordered, actionable plan to improve the Tymmar project according to Aiden's Constitution and principles. Each task includes rationale, steps, expected impact, risk assessment, and acceptance criteria.

---

## Task Overview

| ID | Title | Priority | Effort | Risk | Status |
|----|-------|----------|--------|------|--------|
| T-001 | Fix AIInput undefined variable bug | P0 | 15min | Low | ✅ Done |
| T-002 | Remove insecure manual admin endpoint | P0 | 30min | Low | ✅ Done |
| T-003 | Secure environment variables | P0 | 2h | Medium | ⏭️ Skipped |
| T-004 | Fix import path inconsistency | P2 | 10min | Low | ✅ Done |
| T-005 | Add code comments to all functions | P1 | 4h | Low | ⏭️ Skipped |
| T-006 | Replace console.log with proper logging | P3 | 1h | Low | ✅ Done |
| T-007 | Remove commented-out code | P3 | 30min | Low | ✅ Done |
| T-008 | Replace TypeScript `any` types | P2 | 4h | Medium | ⏭️ Skipped |
| T-009 | Implement React error boundaries | P1 | 3h | Low | ⏭️ Skipped |
| T-010 | Set up testing infrastructure | P1 | 8h | Medium | ⏭️ Skipped |
| T-011 | Write initial test suite | P1 | 6h | Low | ⏭️ Skipped |
| T-012 | Implement API rate limiting | P1 | 4h | Medium | ⏭️ Skipped |
| T-013 | Integrate Sentry error tracking | P1 | 3h | Low | ⏭️ Skipped |
| T-014 | Add comprehensive README | P2 | 2h | Low | ✅ Done |
| T-015 | Document API endpoints | P2 | 2h | Low | ⏭️ Skipped |
| T-016 | Refactor PeriodDataContext | P2 | 12h | High | ⏭️ Skipped |
| T-017 | Implement retry logic for API calls | P2 | 5h | Medium | ⏭️ Skipped |
| T-018 | Add database indexes | P2 | 2h | Low | ⏭️ Skipped |
| T-019 | Standardize API response format | P3 | 4h | Medium | ⏭️ Skipped |
| T-020 | Run linting and fix all errors | P1 | 2h | Low | ✅ Done |

**Total Estimated Effort**: 65 hours 25 minutes

---

## Priority 0: Critical Fixes (Must Complete Immediately)

### T-001: Fix AIInput Undefined Variable Bug

**Rationale**: Component crashes when rendered due to undefined `closed` variable, blocking AI features entirely.

**Steps**:
1. Open `/src/components/AIInput.tsx`
2. Add `const closed = !!period?.closed_at;` at the start of the component (after hooks)
3. Or replace all instances of `closed` with inline `!!period?.closed_at`
4. Test AI input with open period
5. Test AI input with closed period
6. Verify disabled state works correctly

**Expected Impact**:
- Restores AI functionality
- Eliminates runtime crash
- Improves user experience

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] No `ReferenceError` when AIInput renders
- [ ] AI input is disabled when period is closed
- [ ] AI input works when period is open
- [ ] Linting passes with no errors

**Related Files**:
- `/src/components/AIInput.tsx`

---

### T-002: Remove Insecure Manual Admin Endpoint

**Rationale**: Endpoint has hardcoded credentials, no authentication, and poses critical security vulnerability.

**Steps**:
1. Delete `/api/manual-set-admin.ts`
2. Document admin setup alternative in README:
   ```sql
   -- Run in Supabase SQL editor to make user admin
   UPDATE employees
   SET admin = true
   WHERE email = 'your-email@example.com';
   ```
3. Remove any references to this endpoint in documentation
4. Test that endpoint returns 404

**Expected Impact**:
- Eliminates critical security vulnerability
- Removes hardcoded personal information
- Forces proper admin management

**Risk Level**: Low (alternative documented)

**Acceptance Criteria**:
- [ ] `/api/manual-set-admin.ts` file deleted
- [ ] Endpoint returns 404
- [ ] Alternative admin setup documented in README
- [ ] No references remain in codebase

**Related Files**:
- `/api/manual-set-admin.ts` (delete)
- `/README.md` (update)

---

### T-003: Secure Environment Variables

**Rationale**: `.env` file with real credentials is committed to git repository, exposing all secrets.

**Steps**:
1. **Rotate all credentials** (30 min):
   - Generate new OpenAI API key at platform.openai.com
   - Reset Supabase project keys in Supabase dashboard
   - Generate new JWT secret: `openssl rand -base64 32`
   - Reset database password in Supabase
   - Update all credentials in Vercel project settings

2. **Remove from git history** (30 min):
   ```bash
   # Ensure .env is in .gitignore
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore

   # Remove from git history using BFG (faster) or filter-branch
   # Option 1: BFG Repo-Cleaner (recommended)
   brew install bfg  # or download from rtyley.github.io/bfg-repo-cleaner
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive

   # Option 2: git filter-branch (slower but built-in)
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Create environment template** (15 min):
   ```bash
   # Create .env.example
   cat > .env.example << 'EOF'
   # Supabase Configuration
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

   # Database
   DATABASE_URL=postgresql://user:password@host:5432/database

   # OpenAI
   OPENAI_API_KEY=sk-...

   # JWT (generate with: openssl rand -base64 32)
   JWT_SECRET=your-jwt-secret-here

   # Sentry (optional, for error tracking)
   VITE_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_DSN=https://...@sentry.io/...
   EOF
   ```

4. **Update documentation** (45 min):
   - Add environment setup section to README
   - Document how to obtain each credential
   - Explain local vs production setup

5. **Force push (if safe)** or inform collaborators:
   ```bash
   git push --force-with-lease
   ```

**Expected Impact**:
- Eliminates exposed credentials
- Prevents unauthorized access
- Follows security best practices
- Protects OpenAI credits and database

**Risk Level**: Medium (requires coordination if repo has collaborators)

**Acceptance Criteria**:
- [ ] `.env` not in git history (`git log --all --full-history -- .env` returns nothing)
- [ ] `.env` in `.gitignore`
- [ ] `.env.example` created with placeholder values
- [ ] All credentials rotated (OpenAI, Supabase, database, JWT)
- [ ] Vercel environment variables updated
- [ ] Application works with new credentials locally
- [ ] Application works in Vercel production
- [ ] README documents environment setup

**Related Files**:
- `/.env` (remove from history)
- `/.gitignore` (update)
- `/.env.example` (create)
- `/README.md` (update)

---

## Priority 1: Pre-Production Requirements

### T-004: Fix Import Path Inconsistency

**Rationale**: Maintains consistency and prevents future module resolution issues.

**Steps**:
1. Open `/src/main.tsx`
2. Change line 6 from `import AppRouter from './AppRouter';` to `import AppRouter from './router/AppRouter';`
3. Verify application runs: `npm run dev`
4. Check for similar inconsistencies: `grep -r "from '\./" src/ | grep -v node_modules`

**Expected Impact**:
- Consistent import paths
- Prevents future confusion
- Aligns with actual file structure

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] Import path uses correct `./router/AppRouter`
- [ ] Application runs without errors
- [ ] No other import inconsistencies found
- [ ] Linting passes

**Related Files**:
- `/src/main.tsx`

---

### T-005: Add Code Comments to All Functions

**Rationale**: Aiden Constitution requires all non-trivial functions to have meaningful comments explaining intent.

**Steps**:
1. Audit all files for missing function comments
2. Add JSDoc-style comments to all functions, hooks, and components:
   ```typescript
   /**
    * Brief description of purpose and intent.
    * Explains why this exists and what it does.
    */
   ```
3. Focus on:
   - All exported functions
   - Complex logic
   - Business rules
   - Non-obvious algorithms
4. Keep comments concise and focused on "why", not "what"
5. Follow existing commenting patterns in the project

**Priority Areas**:
- All API endpoint handlers
- All context providers
- All custom hooks
- All utility functions
- Complex components (WeekGrid, AdminDashboard)

**Expected Impact**:
- Better code understanding
- Easier onboarding
- Self-documenting code
- Follows Aiden Constitution

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] All exported functions have comments
- [ ] All API handlers have comments
- [ ] All contexts and hooks have comments
- [ ] Complex logic has explanatory comments
- [ ] Comments explain intent, not syntax
- [ ] Consistent commenting style throughout

**Related Files**:
- All `.ts` and `.tsx` files in `/src/` and `/api/`

---

### T-006: Replace console.log with Proper Logging

**Rationale**: Console statements in production are unprofessional and may leak information.

**Steps**:
1. Create logging utility:
   ```typescript
   // src/helpers/logger.ts
   export const logger = {
     debug: (...args: any[]) => {
       if (import.meta.env.DEV) {
         console.log('[DEBUG]', new Date().toISOString(), ...args);
       }
     },
     info: (...args: any[]) => {
       console.info('[INFO]', new Date().toISOString(), ...args);
     },
     warn: (...args: any[]) => {
       console.warn('[WARN]', new Date().toISOString(), ...args);
     },
     error: (...args: any[]) => {
       console.error('[ERROR]', new Date().toISOString(), ...args);
       // TODO: Send to Sentry in production
     },
   };
   ```

2. Find all console.log statements: `grep -r "console\.log" src/ api/`
3. Replace with appropriate logger method
4. Add ESLint rule to prevent future console usage:
   ```javascript
   // eslint.config.js
   rules: {
     'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
   }
   ```

**Expected Impact**:
- Cleaner production code
- Conditional development logging
- Foundation for proper logging service
- Professional codebase

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] Logger utility created
- [ ] All `console.log` replaced with `logger.debug`
- [ ] ESLint rule configured
- [ ] No console warnings in production build
- [ ] Debug logs only appear in development

**Related Files**:
- `/src/helpers/logger.ts` (create)
- All files with console.log statements
- `/eslint.config.js`

---

### T-007: Remove Commented-Out Code

**Rationale**: Git history is the source of truth; commented code clutters files and creates confusion.

**Steps**:
1. Search for commented-out code: `grep -r "^[\s]*\/\/" src/ api/ | grep -v "TODO\|Note\|@"`
2. Review each instance:
   - If needed, document intent with TODO
   - If obsolete, delete
   - If planned feature, move to GitHub Issues
3. Remove all commented-out code blocks
4. For `/src/components/WeekGrid.tsx` line 105: Decide if project label feature should be TODO or deleted

**Expected Impact**:
- Cleaner codebase
- Less confusion for developers
- Clearer intent
- Better maintainability

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] No commented-out code in src/ or api/
- [ ] TODOs properly documented
- [ ] Git history preserves deleted code if needed
- [ ] Code review confirms removals are safe

**Related Files**:
- `/src/components/WeekGrid.tsx`
- Any files with commented code

---

### T-008: Replace TypeScript `any` Types

**Rationale**: Type safety is core to TypeScript's value; `any` defeats this purpose.

**Steps**:
1. Enable ESLint rule:
   ```javascript
   // eslint.config.js
   rules: {
     '@typescript-eslint/no-explicit-any': 'error',
   }
   ```

2. Run lint to find all occurrences: `npm run lint`

3. Replace systematically:
   - **API handlers**: Use `VercelRequest, VercelResponse` from `@vercel/node`
   - **Error handling**: Use `unknown` and type guards
   - **Drizzle queries**: Use inferred types or explicit types from schema
   - **External APIs**: Define proper interfaces

4. Example fixes:
   ```typescript
   // Before
   export default async function handler(req: any, res: any) { }

   // After
   import { VercelRequest, VercelResponse } from '@vercel/node';
   export default async function handler(req: VercelRequest, res: VercelResponse) { }

   // Before
   catch (error: any) { console.error(error.message); }

   // After
   catch (error) {
     if (error instanceof Error) {
       console.error(error.message);
     } else {
       console.error('Unknown error:', error);
     }
   }
   ```

5. Run tests after each file to ensure no breakage

**Expected Impact**:
- Full type safety restored
- Better IDE autocomplete
- Compile-time error detection
- Safer refactoring

**Risk Level**: Medium (may uncover hidden issues)

**Acceptance Criteria**:
- [ ] ESLint rule enabled
- [ ] Zero `@typescript-eslint/no-explicit-any` errors
- [ ] All API handlers use proper types
- [ ] All error handling uses `unknown` or type guards
- [ ] Tests pass
- [ ] Application runs without type errors

**Related Files**:
- 13 files with `any` usage (see risks-and-bugs.md QUAL-001)
- `/eslint.config.js`

---

### T-009: Implement React Error Boundaries

**Rationale**: Prevent single component errors from crashing entire application.

**Steps**:
1. Create ErrorBoundary component at `/src/components/ErrorBoundary.tsx`
   - Implement `getDerivedStateFromError` and `componentDidCatch`
   - Create user-friendly fallback UI with refresh button
   - Add prop for custom fallback
   - Add prop for onError callback

2. Create error fallback components:
   - `/src/components/ErrorFallback.tsx` (default)
   - `/src/components/DashboardErrorFallback.tsx` (specific)

3. Wrap application in ErrorBoundary:
   - Wrap entire app in `main.tsx`
   - Wrap each major route for granular error handling
   - Wrap admin section separately

4. Add error logging:
   - Log to console in development
   - TODO: Send to Sentry in production (after T-013)

5. Test:
   - Create test component that throws error
   - Verify boundary catches it
   - Verify fallback UI displays
   - Verify refresh button works

**Expected Impact**:
- Graceful error handling
- Better user experience
- Preserved app state in unaffected sections
- Error context for debugging

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] ErrorBoundary component created
- [ ] Fallback UI components created
- [ ] App wrapped at root level
- [ ] Routes wrapped individually
- [ ] Test error caught and handled
- [ ] Fallback UI displays correctly
- [ ] Refresh button works
- [ ] Non-affected sections continue working

**Related Files**:
- `/src/components/ErrorBoundary.tsx` (create)
- `/src/components/ErrorFallback.tsx` (create)
- `/src/main.tsx` (update)
- `/src/router/AppRouter.tsx` (update)

---

### T-010: Set Up Testing Infrastructure

**Rationale**: Testing is essential for production readiness and safe refactoring.

**Steps**:
1. Install testing dependencies:
   ```bash
   npm install -D vitest @vitest/ui @testing-library/react \
     @testing-library/jest-dom @testing-library/user-event jsdom msw
   ```

2. Create Vitest configuration at `/vitest.config.ts`
   - Configure jsdom environment
   - Set up coverage reporting
   - Configure globals and setupFiles

3. Create test setup files:
   - `/src/test/setup.ts` (import jest-dom, configure cleanup)
   - `/src/test/utils.tsx` (custom render with providers)
   - `/src/test/mocks/handlers.ts` (MSW handlers)
   - `/src/test/mocks/server.ts` (MSW server setup)

4. Update package.json scripts:
   ```json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

5. Configure TypeScript for tests:
   - Update tsconfig to include test files
   - Add vitest types

6. Verify setup:
   - Create simple smoke test
   - Run `npm test`
   - Verify test runs and passes

**Expected Impact**:
- Foundation for all testing
- Enables TDD workflow
- Supports refactoring with confidence
- Integrates with CI/CD

**Risk Level**: Medium (configuration complexity)

**Acceptance Criteria**:
- [ ] All testing packages installed
- [ ] Vitest configured correctly
- [ ] Test utilities created
- [ ] MSW configured for API mocking
- [ ] TypeScript recognizes test files
- [ ] `npm test` runs successfully
- [ ] Coverage reporting works
- [ ] Test UI accessible via `npm run test:ui`

**Related Files**:
- `/vitest.config.ts` (create)
- `/src/test/setup.ts` (create)
- `/src/test/utils.tsx` (create)
- `/src/test/mocks/handlers.ts` (create)
- `/src/test/mocks/server.ts` (create)
- `/package.json` (update)
- `/tsconfig.json` (update)

---

### T-011: Write Initial Test Suite

**Rationale**: Establish baseline test coverage for critical functionality.

**Steps**:
1. **Test date utilities** (1 hour):
   - `/src/helpers/date.test.ts`
   - Test `getMonday()` for various days of week
   - Test `formatWeekRange()`
   - Test edge cases (year boundaries, DST)

2. **Test ClosePeriodButton component** (1 hour):
   - `/src/components/ClosePeriodButton.test.tsx`
   - Test "Close Period" shows when open
   - Test "Reopen Period" shows when closed
   - Test button disabled during loading
   - Test onClick handlers called

3. **Test authentication flow** (2 hours):
   - `/src/context/AuthContext.test.tsx`
   - Test login success
   - Test login failure
   - Test logout
   - Test session persistence
   - Test token refresh

4. **Test API endpoints** (2 hours):
   - `/api/_employees/get.test.ts`
   - `/api/_periods/post.test.ts`
   - Test authentication required
   - Test admin authorization
   - Test successful responses
   - Test error handling
   - Use MSW for mocking

5. Set coverage thresholds in vitest.config.ts:
   ```typescript
   coverage: {
     statements: 50,
     branches: 40,
     functions: 50,
     lines: 50,
   }
   ```

6. Run coverage report: `npm run test:coverage`

**Expected Impact**:
- 40-50% code coverage
- Critical paths tested
- Foundation for more tests
- Confidence in core functionality

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] Date utility tests pass (100% coverage)
- [ ] ClosePeriodButton tests pass
- [ ] AuthContext tests pass
- [ ] API endpoint tests pass
- [ ] Overall coverage ≥ 40%
- [ ] All tests pass in CI
- [ ] No flaky tests

**Related Files**:
- `/src/helpers/date.test.ts` (create)
- `/src/components/ClosePeriodButton.test.tsx` (create)
- `/src/context/AuthContext.test.tsx` (create)
- `/api/_employees/get.test.ts` (create)
- `/api/_periods/post.test.ts` (create)

---

### T-012: Implement API Rate Limiting

**Rationale**: Prevent API abuse, protect OpenAI credits, and ensure system stability.

**Steps**:
1. Sign up for Upstash (free tier):
   - Create Redis database at upstash.com
   - Get REST URL and token

2. Install dependencies:
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

3. Add to .env:
   ```
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...
   ```

4. Create rate limit middleware at `/api/_shared/rateLimit.ts`:
   - Standard limit: 100 req/min
   - AI limit: 10 req/min
   - Admin limit: 200 req/min

5. Apply to all endpoints:
   - `/api/ai.ts` → use 'ai' limiter
   - `/api/employees.ts` → use 'admin' limiter for admin, 'standard' for others
   - All other endpoints → use 'standard' limiter

6. Add rate limit headers:
   - `X-RateLimit-Limit`
   - `X-RateLimit-Remaining`
   - `X-RateLimit-Reset`

7. Frontend handling:
   - Detect 429 responses
   - Show user-friendly message
   - Display retry time
   - Disable actions until reset

8. Test:
   - Make rapid requests
   - Verify 429 after limit
   - Verify headers present
   - Verify reset after window

**Expected Impact**:
- Protected from API abuse
- OpenAI credits secured
- Better system stability
- Professional API behavior

**Risk Level**: Medium (Redis dependency)

**Acceptance Criteria**:
- [ ] Upstash Redis configured
- [ ] Rate limit middleware created
- [ ] All endpoints protected
- [ ] Correct limits for each endpoint type
- [ ] Rate limit headers returned
- [ ] 429 responses after limit exceeded
- [ ] Frontend handles rate limits gracefully
- [ ] Limits reset after time window
- [ ] Documentation updated with rate limits

**Related Files**:
- `/api/_shared/rateLimit.ts` (create)
- All API endpoint files (update)
- `.env.example` (update)
- `/README.md` or `/API.md` (document)

---

### T-013: Integrate Sentry Error Tracking

**Rationale**: Automatically track and report errors in production for faster debugging.

**Steps**:
1. Sign up for Sentry (free tier):
   - Create account at sentry.io
   - Create project for Tymmar
   - Get DSN

2. Install Sentry packages:
   ```bash
   npm install @sentry/react @sentry/node
   ```

3. Configure frontend in `/src/main.tsx`:
   - Initialize Sentry before React render
   - Configure DSN, environment, traces
   - Set up session replay
   - Wrap app with Sentry ErrorBoundary

4. Configure backend in `/api/_shared/sentry.ts`:
   - Initialize Sentry for Node.js
   - Export `captureError` helper
   - Add to try/catch blocks in handlers

5. Add source maps upload:
   - Configure Vite to generate source maps
   - Install `@sentry/vite-plugin`
   - Configure automatic upload on build

6. Add environment variables:
   ```
   VITE_SENTRY_DSN=https://...@sentry.io/...
   SENTRY_DSN=https://...@sentry.io/...
   SENTRY_AUTH_TOKEN=...
   SENTRY_ORG=...
   SENTRY_PROJECT=...
   ```

7. Test:
   - Trigger test error in frontend
   - Trigger test error in backend
   - Verify appears in Sentry dashboard
   - Verify source maps work
   - Verify user context captured

8. Configure alerts:
   - Set up email/Slack alerts for new issues
   - Configure alert rules for critical errors

**Expected Impact**:
- Automatic error tracking
- Faster bug discovery
- Better debugging context
- User session replays
- Performance monitoring

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] Sentry account and project created
- [ ] Frontend integration complete
- [ ] Backend integration complete
- [ ] Source maps uploaded and working
- [ ] Test errors appear in dashboard
- [ ] Stack traces are readable
- [ ] User context included in errors
- [ ] Session replay working
- [ ] Alerts configured
- [ ] Documentation updated

**Related Files**:
- `/src/main.tsx` (update)
- `/api/_shared/sentry.ts` (create)
- All API handlers (update error handling)
- `/vite.config.ts` (update)
- `/.env.example` (update)

---

### T-020: Run Linting and Fix All Errors

**Rationale**: Ensure code quality and consistency; aim for zero linting errors/warnings.

**Steps**:
1. Run linting: `npm run lint`
2. Review all errors and warnings
3. Fix automatically where possible: `npm run lint -- --fix`
4. Manually fix remaining issues
5. Ensure ESLint rules are properly configured
6. Add pre-commit hook (optional):
   ```bash
   npm install -D husky lint-staged
   npx husky install
   npx husky add .husky/pre-commit "npx lint-staged"
   ```

   ```json
   // package.json
   "lint-staged": {
     "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
   }
   ```

7. Verify in CI that linting passes

**Expected Impact**:
- Consistent code style
- Better code quality
- Automated quality checks
- Professional codebase

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] `npm run lint` returns 0 errors
- [ ] `npm run lint` returns 0 warnings
- [ ] All TypeScript files follow style guide
- [ ] Pre-commit hook configured (optional)
- [ ] CI linting check passes

**Related Files**:
- All `.ts` and `.tsx` files
- `/eslint.config.js`
- `/package.json`

---

## Priority 2: Important Improvements

### T-014: Add Comprehensive README

**Rationale**: Enable easy onboarding and self-service setup for contributors.

**Steps**:
1. Expand `/README.md` with sections:
   - Project overview and features
   - Tech stack
   - Prerequisites
   - Installation steps
   - Environment variables setup
   - Database setup and migrations
   - Running locally
   - Testing
   - Building
   - Deployment
   - Architecture link
   - Contributing link
   - License

2. Include code examples:
   - Installation commands
   - Environment setup
   - Running commands
   - Database migration commands

3. Add badges:
   - Build status
   - Test coverage
   - License

4. Link to other documentation:
   - `.aiden-context/architecture.md`
   - `.aiden-context/risks-and-bugs.md`
   - `CONTRIBUTING.md`

**Expected Impact**:
- Easier onboarding
- Self-service setup
- Reduced support burden
- Professional presentation

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] README includes all sections
- [ ] Code examples are accurate
- [ ] Links to documentation work
- [ ] Fresh developer can set up project using only README
- [ ] Environment setup clearly documented
- [ ] Deployment process documented

**Related Files**:
- `/README.md` (update)

---

### T-015: Document API Endpoints

**Rationale**: Clear API documentation enables integration and reduces confusion.

**Steps**:
1. Create `/docs/API.md` or expand README
2. Document each endpoint:
   - HTTP method and path
   - Authentication requirements
   - Request body schema
   - Response schema
   - Error responses
   - Rate limits
   - Example requests/responses

3. Document endpoints:
   - `GET /api/employees`
   - `POST /api/employees`
   - `PUT /api/employees`
   - `DELETE /api/employees`
   - `GET /api/day_entries`
   - `POST /api/day_entries`
   - `PUT /api/day_entries`
   - `DELETE /api/day_entries`
   - `GET /api/periods`
   - `POST /api/periods`
   - `PUT /api/periods`
   - `GET /api/settings`
   - `POST /api/settings`
   - `PUT /api/settings`
   - `DELETE /api/settings`
   - `GET /api/reports`
   - `POST /api/ai`

4. Include authentication section:
   - How to obtain JWT token
   - How to include in requests
   - Token expiration

5. Include error codes section:
   - 400 Bad Request
   - 401 Unauthorized
   - 403 Forbidden
   - 404 Not Found
   - 429 Too Many Requests
   - 500 Internal Server Error

**Expected Impact**:
- Clear API contract
- Easier frontend development
- Better integration capability
- Professional documentation

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] All endpoints documented
- [ ] Request/response schemas included
- [ ] Authentication explained
- [ ] Error codes documented
- [ ] Rate limits documented
- [ ] Examples provided
- [ ] Linked from README

**Related Files**:
- `/docs/API.md` (create)
- `/README.md` (link)

---

### T-016: Refactor PeriodDataContext

**Rationale**: 420-line context violates Single Responsibility Principle and causes performance issues.

**Steps**:
1. **Create CalendarContext** (2h):
   - `/src/context/CalendarContext.tsx`
   - `/src/hooks/useCalendar.ts`
   - Extract: selectedDate, weekStart, weekEnd, navigation
   - Test in isolation

2. **Create AIContext** (2h):
   - `/src/context/AIContext.tsx`
   - `/src/hooks/useAI.ts`
   - Extract: aiEnabled, aiLoading, toggleAI, fillHoursWithAI
   - Depends on CalendarContext
   - Test AI functionality

3. **Create PeriodContext** (3h):
   - `/src/context/PeriodContext.tsx`
   - `/src/hooks/usePeriod.ts`
   - Extract: period, closePeriod, reopenPeriod, createPeriod
   - Depends on CalendarContext
   - Test period operations

4. **Create EntriesContext** (3h):
   - `/src/context/EntriesContext.tsx`
   - `/src/hooks/useEntries.ts`
   - Extract: entries, saveEntries, deleteEntry
   - Depends on PeriodContext
   - Test entry operations

5. **Update Components** (2h):
   - Update all consumers to use specific contexts
   - Replace `usePeriodData()` with specific hooks
   - Remove PeriodDataContext imports
   - Test each component

6. **Delete Old Context**:
   - Remove `/src/context/PeriodDataContext.tsx`
   - Remove `/src/hooks/usePeriodData.ts`

7. **Comprehensive Testing**:
   - Test each context independently
   - Test context composition
   - Test all features end-to-end
   - Verify performance improvement

**Expected Impact**:
- Better performance (fewer re-renders)
- Better testability
- Better maintainability
- Clearer separation of concerns
- More flexible composition

**Risk Level**: High (major refactor)

**Acceptance Criteria**:
- [ ] CalendarContext created and tested
- [ ] AIContext created and tested
- [ ] PeriodContext created and tested
- [ ] EntriesContext created and tested
- [ ] All components updated
- [ ] Old context removed
- [ ] All features work identically
- [ ] Performance improved (measure re-renders)
- [ ] All tests pass
- [ ] Documentation updated

**Related Files**:
- `/src/context/CalendarContext.tsx` (create)
- `/src/context/AIContext.tsx` (create)
- `/src/context/PeriodContext.tsx` (create)
- `/src/context/EntriesContext.tsx` (create)
- `/src/hooks/useCalendar.ts` (create)
- `/src/hooks/useAI.ts` (create)
- `/src/hooks/usePeriod.ts` (create)
- `/src/hooks/useEntries.ts` (create)
- `/src/context/PeriodDataContext.tsx` (delete)
- `/src/hooks/usePeriodData.ts` (delete)
- All consuming components (update)

---

### T-017: Implement Retry Logic for API Calls

**Rationale**: Handle transient network failures gracefully without user intervention.

**Steps**:
1. Create retry utility at `/src/helpers/retry.ts`:
   - Configurable max attempts
   - Exponential backoff
   - OnRetry callback
   - Type-safe

2. Create API fetch wrapper at `/src/helpers/api.ts`:
   - Uses retry utility
   - Handles HTTP errors
   - Doesn't retry 4xx errors
   - Retries 5xx errors
   - Includes timeout

3. Update all contexts to use `apiFetch`:
   - AuthContext
   - EmployeeContext
   - PeriodContext (or PeriodDataContext)
   - All API calls in components

4. Add user feedback:
   - Toast on retry attempts
   - Toast on final failure
   - Manual retry button on errors

5. Add timeout handling:
   - 30 second default timeout
   - Configurable per request
   - Clear error message

6. Test:
   - Simulate network failure (dev tools)
   - Verify retries occur
   - Verify exponential backoff
   - Verify user feedback
   - Verify timeout handling

**Expected Impact**:
- Better resilience
- Improved user experience
- Reduced frustration
- Fewer support requests

**Risk Level**: Medium (behavior change)

**Acceptance Criteria**:
- [ ] Retry utility created and tested
- [ ] API fetch wrapper created
- [ ] All contexts use new wrapper
- [ ] Retries work on 5xx errors
- [ ] No retries on 4xx errors
- [ ] Exponential backoff implemented
- [ ] User feedback shown
- [ ] Timeout handling works
- [ ] Manual retry available
- [ ] Documentation updated

**Related Files**:
- `/src/helpers/retry.ts` (create)
- `/src/helpers/api.ts` (create)
- All context files (update)
- Any components with API calls (update)

---

### T-018: Add Database Indexes

**Rationale**: Optimize query performance for common access patterns as data grows.

**Steps**:
1. Analyze current queries:
   - Identify most frequent queries
   - Identify slow queries (once deployed)
   - Review WHERE clauses and JOINs

2. Add indexes to `/db/schema.ts`:
   - `periods`: employee_id + start_date composite
   - `periods`: employee_id + closed_at composite
   - `day_entries`: period_id
   - `day_entries`: period_id + entry_date composite
   - `day_entries`: project_id (for future feature)
   - `employees`: email (if not already indexed by unique constraint)

3. Generate migration:
   ```bash
   npm run db:generate
   ```

4. Review generated migration SQL
5. Apply to database:
   ```bash
   npm run db:push
   ```

6. Test:
   - Run EXPLAIN ANALYZE on key queries
   - Compare before/after performance
   - Verify indexes are used

7. Monitor:
   - Track query performance in production
   - Add more indexes if needed

**Expected Impact**:
- Faster query response times
- Better scalability
- Lower database CPU usage
- Improved user experience

**Risk Level**: Low

**Acceptance Criteria**:
- [ ] Indexes added to schema
- [ ] Migration generated
- [ ] Migration applied to database
- [ ] EXPLAIN plans show index usage
- [ ] Query performance improved
- [ ] No performance regressions
- [ ] Documentation updated

**Related Files**:
- `/db/schema.ts` (update)
- Generated migration files

---

## Priority 3: Nice to Have

### T-019: Standardize API Response Format

**Rationale**: Consistent response structure improves developer experience and enables metadata.

**Steps**:
1. Define standard response interface in `/api/_shared/responses.ts`:
   ```typescript
   export interface ApiResponse<T> {
     success: boolean;
     data?: T;
     error?: {
       message: string;
       code?: string;
       details?: any;
     };
     meta?: {
       timestamp: string;
       requestId?: string;
     };
   }

   export function successResponse<T>(data: T): ApiResponse<T> {
     return {
       success: true,
       data,
       meta: {
         timestamp: new Date().toISOString(),
       },
     };
   }

   export function errorResponse(message: string, code?: string): ApiResponse<never> {
     return {
       success: false,
       error: {
         message,
         code,
       },
       meta: {
         timestamp: new Date().toISOString(),
       },
     };
   }
   ```

2. Update all API endpoints to use standard format:
   - Replace direct JSON responses
   - Use helper functions
   - Update response types

3. Update frontend to handle new format:
   - Check `response.success`
   - Access data via `response.data`
   - Handle errors via `response.error`

4. Add backwards compatibility layer if needed

5. Update API documentation

**Expected Impact**:
- Consistent API responses
- Better error handling
- Room for metadata (pagination, etc.)
- Professional API design

**Risk Level**: Medium (breaking change for frontend)

**Acceptance Criteria**:
- [ ] Standard response interface defined
- [ ] Helper functions created
- [ ] All endpoints use new format
- [ ] Frontend updated to handle new format
- [ ] All features work identically
- [ ] API documentation updated
- [ ] Tests updated

**Related Files**:
- `/api/_shared/responses.ts` (create)
- All API endpoint files (update)
- All contexts and API-calling code (update)

---

## Summary

### By Priority
- **P0 (Immediate)**: 3 tasks, ~3 hours
- **P1 (Pre-Production)**: 8 tasks, ~35 hours
- **P2 (Important)**: 6 tasks, ~27 hours
- **P3 (Nice to Have)**: 1 task, ~4 hours

### By Category
- **Bug Fixes**: 2 tasks
- **Security**: 3 tasks
- **Code Quality**: 4 tasks
- **Testing**: 2 tasks
- **Documentation**: 2 tasks
- **Architecture**: 2 tasks
- **Performance**: 1 task
- **Reliability**: 1 task
- **Infrastructure**: 3 tasks

### Recommended Execution Order

**Week 1** (Critical + High Priority):
1. T-001: Fix AIInput bug (15min)
2. T-002: Remove admin endpoint (30min)
3. T-003: Secure environment variables (2h)
4. T-004: Fix import path (10min)
5. T-009: Implement error boundaries (3h)
6. T-010: Set up testing (8h)
7. T-011: Write initial tests (6h)

**Week 2** (Complete P1):
8. T-005: Add code comments (4h)
9. T-006: Replace console.log (1h)
10. T-007: Remove commented code (30min)
11. T-008: Replace `any` types (4h)
12. T-012: Implement rate limiting (4h)
13. T-013: Integrate Sentry (3h)
14. T-020: Run linting (2h)

**Week 3-4** (P2 Important Improvements):
15. T-014: Add comprehensive README (2h)
16. T-015: Document API (2h)
17. T-017: Implement retry logic (5h)
18. T-018: Add database indexes (2h)
19. T-016: Refactor PeriodDataContext (12h)

**Future** (P3 as time permits):
20. T-019: Standardize API responses (4h)

---

**Total Effort**: ~65 hours (approximately 2 weeks full-time or 4 weeks part-time)

**Last Updated**: 2025-11-12
**Document Version**: 1.0
