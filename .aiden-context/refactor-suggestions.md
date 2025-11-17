# Refactor Suggestions

This document outlines improvement opportunities for the Tymmar project, organized by priority and category. Each suggestion includes rationale, approach, and expected impact.

---

## Priority 0: Critical Fixes (Must Do Immediately)

### P0-001: Fix AIInput Undefined Variable Bug

**Category**: Bug Fix
**File**: `/src/components/AIInput.tsx`
**Lines**: 25, 30, 32
**Effort**: 15 minutes

**Issue**: References undefined `closed` variable, causing runtime error.

**Current Code**:
```typescript
disabled={!aiEnabled || closed || aiLoading}  // Line 25
if (closed || !aiEnabled) return;              // Line 30
if (period?.closed_at !== null && !closed) {   // Line 32
```

**Proposed Solution**:
```typescript
// Add at component start:
const closed = !!period?.closed_at;

// Or inline:
disabled={!aiEnabled || !!period?.closed_at || aiLoading}
if (!!period?.closed_at || !aiEnabled) return;
if (period?.closed_at !== null) {
```

**Benefits**:
- Fixes crash preventing AI features from working
- Restores critical functionality
- Improves user experience

**Risks**: None

**Testing**:
- Test AI input with open period
- Test AI input with closed period
- Verify disabled state behavior

---

### P0-002: Remove or Secure Manual Admin Endpoint

**Category**: Security Fix
**File**: `/api/manual-set-admin.ts`
**Effort**: 30 minutes

**Issue**: Insecure endpoint with hardcoded credentials, no authentication.

**Proposed Solutions**:

**Option A: Delete Endpoint** (Recommended)
```bash
rm api/manual-set-admin.ts
```

Then create proper admin via database:
```sql
-- Run in Supabase SQL editor
UPDATE employees
SET admin = true
WHERE email = 'your-email@example.com';
```

**Option B: Secure with Secret Token**
```typescript
// api/manual-set-admin.ts
export default async function handler(req, res) {
  const { secret } = req.body;

  if (secret !== process.env.ADMIN_SETUP_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // ... rest of logic, remove hardcoded email
}
```

**Benefits**:
- Eliminates critical security vulnerability
- Removes hardcoded personal information
- Prevents unauthorized admin access

**Risks**: Admin setup becomes manual (mitigated by SQL alternative)

**Testing**:
- Verify endpoint is gone or secured
- Test admin creation via chosen method
- Verify unauthorized access is blocked

---

### P0-003: Secure Environment Variables

**Category**: Security Fix
**Files**: `/.env`, `.gitignore`, git history
**Effort**: 2 hours

**Issue**: Sensitive credentials committed to repository.

**Action Plan**:

1. **Rotate All Credentials** (30 min)
   - Generate new OpenAI API key
   - Reset Supabase project keys
   - Generate new JWT secret
   - Create new database password
   - Update Vercel environment variables

2. **Remove from Repository** (30 min)
   ```bash
   # Add to .gitignore if not present
   echo ".env" >> .gitignore
   echo ".env.local" >> .gitignore

   # Remove from git history
   git filter-branch --force --index-filter \
     "git rm --cached --ignore-unmatch .env" \
     --prune-empty --tag-name-filter cat -- --all

   # Or use BFG Repo-Cleaner (faster)
   bfg --delete-files .env
   git reflog expire --expire=now --all
   git gc --prune=now --aggressive
   ```

3. **Create Template** (15 min)
   ```bash
   # .env.example
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   OPENAI_API_KEY=sk-...
   DATABASE_URL=postgresql://user:password@host:5432/database
   JWT_SECRET=your-jwt-secret-here
   ```

4. **Document Setup** (45 min)
   - Add environment setup section to README
   - Document how to obtain each credential
   - Explain local vs production env vars

**Benefits**:
- Eliminates exposed credentials
- Prevents unauthorized access
- Follows security best practices

**Risks**: Existing deployments need credential update

**Testing**:
- Verify app works with new credentials locally
- Verify Vercel deployment works
- Test authentication flow

---

## Priority 1: Pre-Production Requirements

### P1-001: Implement React Error Boundaries

**Category**: Reliability
**Files**: New files to create
**Effort**: 3 hours

**Rationale**: Prevent component errors from crashing entire app.

**Implementation**:

1. **Create ErrorBoundary Component** (1 hour)
   ```typescript
   // src/components/ErrorBoundary.tsx
   import { Component, ErrorInfo, ReactNode } from 'react';

   interface Props {
     children: ReactNode;
     fallback?: ReactNode;
     onError?: (error: Error, errorInfo: ErrorInfo) => void;
   }

   interface State {
     hasError: boolean;
     error?: Error;
   }

   export class ErrorBoundary extends Component<Props, State> {
     constructor(props: Props) {
       super(props);
       this.state = { hasError: false };
     }

     static getDerivedStateFromError(error: Error): State {
       return { hasError: true, error };
     }

     componentDidCatch(error: Error, errorInfo: ErrorInfo) {
       console.error('Error caught by boundary:', error, errorInfo);
       this.props.onError?.(error, errorInfo);

       // TODO: Send to error tracking service (Sentry)
     }

     render() {
       if (this.state.hasError) {
         return this.props.fallback || (
           <div className="flex flex-col items-center justify-center min-h-screen">
             <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
             <p className="text-gray-600 mb-4">
               We're sorry for the inconvenience. Please try refreshing the page.
             </p>
             <button
               onClick={() => window.location.reload()}
               className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
             >
               Refresh Page
             </button>
           </div>
         );
       }

       return this.props.children;
     }
   }
   ```

2. **Wrap Routes** (30 min)
   ```typescript
   // src/App.tsx or AppRouter.tsx
   import { ErrorBoundary } from './components/ErrorBoundary';

   <ErrorBoundary>
     <AppRouter />
   </ErrorBoundary>

   // Or per-route for more granular control:
   <Route path="/dashboard" element={
     <ErrorBoundary fallback={<DashboardErrorFallback />}>
       <Dashboard />
     </ErrorBoundary>
   } />
   ```

3. **Add Error Tracking Integration** (1.5 hours)
   - Sign up for Sentry (free tier)
   - Install `@sentry/react`
   - Configure in App.tsx
   - Test error reporting

**Benefits**:
- Graceful error handling
- Better user experience
- Error context for debugging
- Foundation for error monitoring

**Risks**: None

**Testing**:
- Throw test error in component
- Verify boundary catches it
- Verify fallback UI displays
- Test refresh button

---

### P1-002: Set Up Testing Infrastructure

**Category**: Testing
**Files**: New config files, test files
**Effort**: 8 hours

**Rationale**: Enable confidence in changes, prevent regressions.

**Implementation Plan**:

1. **Install Testing Dependencies** (30 min)
   ```bash
   npm install -D vitest @vitest/ui @testing-library/react \
     @testing-library/jest-dom @testing-library/user-event \
     jsdom msw
   ```

2. **Configure Vitest** (1 hour)
   ```typescript
   // vitest.config.ts
   import { defineConfig } from 'vitest/config';
   import react from '@vitejs/plugin-react';

   export default defineConfig({
     plugins: [react()],
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/test/setup.ts',
       coverage: {
         provider: 'v8',
         reporter: ['text', 'json', 'html'],
         exclude: [
           'node_modules/',
           'src/test/',
           '**/*.d.ts',
           '**/*.config.*',
           '**/dist/**',
         ],
       },
     },
   });
   ```

3. **Create Test Utilities** (1 hour)
   ```typescript
   // src/test/setup.ts
   import '@testing-library/jest-dom';
   import { cleanup } from '@testing-library/react';
   import { afterEach } from 'vitest';

   afterEach(() => {
     cleanup();
   });

   // src/test/utils.tsx
   import { ReactElement } from 'react';
   import { render, RenderOptions } from '@testing-library/react';
   import { BrowserRouter } from 'react-router';

   const AllProviders = ({ children }: { children: React.ReactNode }) => {
     return <BrowserRouter>{children}</BrowserRouter>;
   };

   const customRender = (
     ui: ReactElement,
     options?: Omit<RenderOptions, 'wrapper'>
   ) => render(ui, { wrapper: AllProviders, ...options });

   export * from '@testing-library/react';
   export { customRender as render };
   ```

4. **Write Initial Tests** (5 hours)

   **Unit Tests - Date Utilities**:
   ```typescript
   // src/helpers/date.test.ts
   import { describe, it, expect } from 'vitest';
   import { getMonday, formatWeekRange } from './date';

   describe('date utilities', () => {
     describe('getMonday', () => {
       it('returns Monday for date in middle of week', () => {
         const wednesday = new Date('2025-11-14'); // Wednesday
         const monday = getMonday(wednesday);
         expect(monday.getDay()).toBe(1); // Monday
         expect(monday.getDate()).toBe(12);
       });

       it('returns same date if already Monday', () => {
         const monday = new Date('2025-11-12');
         expect(getMonday(monday)).toEqual(monday);
       });

       it('handles Sunday correctly', () => {
         const sunday = new Date('2025-11-18');
         const monday = getMonday(sunday);
         expect(monday.getDate()).toBe(12); // Previous Monday
       });
     });

     describe('formatWeekRange', () => {
       it('formats week range correctly', () => {
         const monday = new Date('2025-11-12');
         const range = formatWeekRange(monday);
         expect(range).toBe('Nov 12 - Nov 18, 2025');
       });
     });
   });
   ```

   **Component Tests - ClosePeriodButton**:
   ```typescript
   // src/components/ClosePeriodButton.test.tsx
   import { describe, it, expect, vi } from 'vitest';
   import { render, screen, fireEvent } from '../test/utils';
   import ClosePeriodButton from './ClosePeriodButton';
   import * as usePeriodData from '../hooks/usePeriodData';

   describe('ClosePeriodButton', () => {
     it('shows "Close Period" when period is open', () => {
       vi.spyOn(usePeriodData, 'usePeriodData').mockReturnValue({
         period: { id: 1, closed_at: null },
         closePeriod: vi.fn(),
         reopenPeriod: vi.fn(),
       });

       render(<ClosePeriodButton />);
       expect(screen.getByText('Close Period')).toBeInTheDocument();
     });

     it('shows "Reopen Period" when period is closed', () => {
       vi.spyOn(usePeriodData, 'usePeriodData').mockReturnValue({
         period: { id: 1, closed_at: new Date() },
         closePeriod: vi.fn(),
         reopenPeriod: vi.fn(),
       });

       render(<ClosePeriodButton />);
       expect(screen.getByText('Reopen Period')).toBeInTheDocument();
     });

     it('calls closePeriod when clicked', async () => {
       const closePeriod = vi.fn();
       vi.spyOn(usePeriodData, 'usePeriodData').mockReturnValue({
         period: { id: 1, closed_at: null },
         closePeriod,
         reopenPeriod: vi.fn(),
       });

       render(<ClosePeriodButton />);
       const button = screen.getByText('Close Period');
       fireEvent.click(button);

       expect(closePeriod).toHaveBeenCalledTimes(1);
     });
   });
   ```

5. **Update Scripts** (30 min)
   ```json
   // package.json
   {
     "scripts": {
       "test": "vitest",
       "test:ui": "vitest --ui",
       "test:coverage": "vitest --coverage"
     }
   }
   ```

**Benefits**:
- Catch bugs before production
- Safe refactoring
- Documentation of behavior
- Foundation for TDD

**Risks**: Initial time investment

**Testing**: Run `npm test` and verify tests pass

---

### P1-003: Implement API Rate Limiting

**Category**: Security
**Files**: New middleware, all API endpoints
**Effort**: 4 hours

**Rationale**: Prevent API abuse and protect OpenAI credits.

**Implementation**:

1. **Install Rate Limiting Package** (15 min)
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```

2. **Create Rate Limit Middleware** (1 hour)
   ```typescript
   // api/_shared/rateLimit.ts
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';
   import { VercelRequest, VercelResponse } from '@vercel/node';

   const redis = new Redis({
     url: process.env.UPSTASH_REDIS_REST_URL!,
     token: process.env.UPSTASH_REDIS_REST_TOKEN!,
   });

   const rateLimits = {
     standard: new Ratelimit({
       redis,
       limiter: Ratelimit.slidingWindow(100, '1 m'), // 100 requests per minute
     }),
     ai: new Ratelimit({
       redis,
       limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 AI requests per minute
     }),
     admin: new Ratelimit({
       redis,
       limiter: Ratelimit.slidingWindow(200, '1 m'), // 200 requests per minute
     }),
   };

   export async function withRateLimit(
     req: VercelRequest,
     res: VercelResponse,
     type: keyof typeof rateLimits = 'standard'
   ) {
     const identifier = req.headers['x-forwarded-for'] || 'anonymous';
     const { success, limit, remaining, reset } = await rateLimits[type].limit(
       identifier as string
     );

     res.setHeader('X-RateLimit-Limit', limit.toString());
     res.setHeader('X-RateLimit-Remaining', remaining.toString());
     res.setHeader('X-RateLimit-Reset', reset.toString());

     if (!success) {
       return res.status(429).json({
         error: 'Too many requests',
         retryAfter: Math.ceil((reset - Date.now()) / 1000),
       });
     }

     return null; // Continue processing
   }
   ```

3. **Apply to Endpoints** (2 hours)
   ```typescript
   // api/ai.ts
   import { withRateLimit } from './_shared/rateLimit';

   export default async function handler(req, res) {
     const rateLimitError = await withRateLimit(req, res, 'ai');
     if (rateLimitError) return;

     // ... rest of handler
   }

   // api/employees.ts
   import { withRateLimit } from './_shared/rateLimit';

   export default async function handler(req, res) {
     const rateLimitError = await withRateLimit(req, res, 'standard');
     if (rateLimitError) return;

     // ... rest of handler
   }
   ```

4. **Add Frontend Handling** (45 min)
   ```typescript
   // src/helpers/api.ts
   export async function fetchWithRetry(url: string, options?: RequestInit) {
     const response = await fetch(url, options);

     if (response.status === 429) {
       const retryAfter = response.headers.get('X-RateLimit-Reset');
       throw new Error(`Rate limited. Retry after ${retryAfter} seconds.`);
     }

     return response;
   }
   ```

**Benefits**:
- Prevents API abuse
- Protects OpenAI credits
- Reduces infrastructure costs
- Improves system stability

**Risks**: Legitimate users may hit limits (mitigated by reasonable limits)

**Testing**:
- Make rapid requests to endpoint
- Verify 429 response after limit
- Check rate limit headers
- Test reset after window expires

---

### P1-004: Integrate Error Tracking (Sentry)

**Category**: Monitoring
**Files**: App.tsx, API endpoints
**Effort**: 3 hours

**Rationale**: Track production errors automatically.

**Implementation**:

1. **Sign Up and Configure** (30 min)
   - Create Sentry account (free tier)
   - Create project for Tymmar
   - Get DSN key

2. **Install and Configure Frontend** (1 hour)
   ```bash
   npm install @sentry/react
   ```

   ```typescript
   // src/main.tsx
   import * as Sentry from '@sentry/react';

   Sentry.init({
     dsn: import.meta.env.VITE_SENTRY_DSN,
     environment: import.meta.env.MODE,
     integrations: [
       Sentry.browserTracingIntegration(),
       Sentry.replayIntegration(),
     ],
     tracesSampleRate: 0.1,
     replaysSessionSampleRate: 0.1,
     replaysOnErrorSampleRate: 1.0,
   });

   // Wrap ErrorBoundary with Sentry
   import { ErrorBoundary } from './components/ErrorBoundary';

   <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
     <App />
   </Sentry.ErrorBoundary>
   ```

3. **Configure Backend** (1 hour)
   ```bash
   npm install @sentry/node
   ```

   ```typescript
   // api/_shared/sentry.ts
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.VERCEL_ENV || 'development',
     tracesSampleRate: 0.1,
   });

   export function captureError(error: Error, context?: any) {
     Sentry.captureException(error, { extra: context });
   }

   // api/employees.ts (example)
   import { captureError } from './_shared/sentry';

   try {
     // ... handler logic
   } catch (error) {
     captureError(error, { endpoint: 'employees', method: req.method });
     return res.status(500).json({ error: 'Internal server error' });
   }
   ```

4. **Test Integration** (30 min)
   - Trigger test error
   - Verify appears in Sentry dashboard
   - Check source maps work
   - Review error context

**Benefits**:
- Automatic error tracking
- Stack traces with source maps
- Session replay for debugging
- Error alerting

**Risks**: None (free tier sufficient for MVP)

**Testing**:
- Throw test error
- Verify in Sentry dashboard
- Test filtering and alerting

---

## Priority 2: Important Improvements

### P2-001: Refactor PeriodDataContext

**Category**: Architecture
**File**: `/src/context/PeriodDataContext.tsx`
**Effort**: 12 hours

**Rationale**: 420-line "god component" handles too many concerns, causes performance issues.

**Current Structure** (Single Context):
- Period data (period, entries)
- Calendar state (selectedDate, weekStart)
- AI state (aiEnabled, aiLoading)
- CRUD operations (save, close, reopen)
- Data fetching

**Proposed Structure** (Split into 4 Contexts):

```typescript
// src/context/PeriodContext.tsx
interface PeriodContextType {
  period: Period | null;
  loading: boolean;
  error: Error | null;
  createPeriod: (startDate: Date) => Promise<void>;
  closePeriod: () => Promise<void>;
  reopenPeriod: () => Promise<void>;
  refetch: () => Promise<void>;
}

// src/context/EntriesContext.tsx
interface EntriesContextType {
  entries: DayEntry[];
  loading: boolean;
  error: Error | null;
  saveEntries: (entries: DayEntry[]) => Promise<void>;
  deleteEntry: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

// src/context/CalendarContext.tsx
interface CalendarContextType {
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  weekStart: Date;
  weekEnd: Date;
  goToNextWeek: () => void;
  goToPrevWeek: () => void;
  goToToday: () => void;
}

// src/context/AIContext.tsx
interface AIContextType {
  aiEnabled: boolean;
  aiLoading: boolean;
  toggleAI: () => void;
  fillHoursWithAI: () => Promise<DayEntry[]>;
}
```

**Implementation Plan**:

1. **Create CalendarContext** (2 hours)
   - Extract date state and navigation
   - Simplest, no dependencies
   - Test in isolation

2. **Create AIContext** (2 hours)
   - Extract AI state and API calls
   - Depends on CalendarContext for date range
   - Test AI functionality

3. **Create PeriodContext** (3 hours)
   - Extract period CRUD
   - Depends on CalendarContext for current week
   - Test period operations

4. **Create EntriesContext** (3 hours)
   - Extract entries CRUD
   - Depends on PeriodContext for period ID
   - Test entry operations

5. **Update Consumers** (2 hours)
   - Update components to use specific contexts
   - Remove PeriodDataContext imports
   - Test all components

**Benefits**:
- Better performance (fewer unnecessary re-renders)
- Easier to test
- Better separation of concerns
- More maintainable
- Can use contexts independently

**Risks**:
- Breaking change (mitigated by thorough testing)
- Initial complexity increase

**Testing**:
- Unit test each context
- Integration test context interactions
- Regression test all features

---

### P2-002: Add Comprehensive Documentation

**Category**: Documentation
**Files**: README.md, new docs
**Effort**: 6 hours

**Rationale**: Enable contributors and future maintenance.

**Documentation Plan**:

1. **Expand README.md** (2 hours)
   ```markdown
   # Tymmar - Time Tracking Application

   Modern time tracking system built with React 19, TypeScript, and Vercel.

   ## Features
   - Employee time entry with weekly grid
   - AI-assisted hour filling
   - Admin dashboard for management
   - Period closing and reporting

   ## Tech Stack
   - Frontend: React 19, TypeScript, Tailwind CSS
   - Backend: Vercel Serverless Functions
   - Database: PostgreSQL (Supabase)
   - AI: OpenAI GPT-4o-mini

   ## Getting Started

   ### Prerequisites
   - Node.js 18+
   - PostgreSQL (or Supabase account)
   - OpenAI API key

   ### Installation
   \`\`\`bash
   # Clone repository
   git clone https://github.com/yourusername/tymmar.git
   cd tymmar

   # Install dependencies
   npm install

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your credentials

   # Run database migrations
   npm run db:push

   # Start development server
   npm run dev
   \`\`\`

   ### Environment Variables
   See `.env.example` for required variables.

   ## Development

   ### Running Locally
   \`\`\`bash
   npm run dev  # Start dev server on http://localhost:5173
   \`\`\`

   ### Running Tests
   \`\`\`bash
   npm test              # Run tests in watch mode
   npm run test:coverage # Generate coverage report
   \`\`\`

   ### Database Migrations
   \`\`\`bash
   npm run db:generate  # Generate migration from schema changes
   npm run db:push      # Apply migrations to database
   npm run db:studio    # Open Drizzle Studio (GUI)
   \`\`\`

   ### Linting
   \`\`\`bash
   npm run lint         # Run ESLint
   \`\`\`

   ### Building
   \`\`\`bash
   npm run build        # Build for production
   npm run preview      # Preview production build
   \`\`\`

   ## Deployment

   ### Vercel (Recommended)
   1. Push to GitHub
   2. Import project in Vercel dashboard
   3. Configure environment variables
   4. Deploy

   Vercel will auto-deploy on push to main branch.

   ### Manual Deployment
   \`\`\`bash
   npm run build
   # Deploy dist/ to your hosting service
   \`\`\`

   ## Architecture

   See [.aiden-context/architecture.md](.aiden-context/architecture.md) for detailed architecture documentation.

   ## Contributing

   See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

   ## License

   [Your License Here]
   ```

2. **Create CONTRIBUTING.md** (1 hour)
   ```markdown
   # Contributing to Tymmar

   ## Code Style
   - Follow existing patterns
   - Use TypeScript strictly
   - Write tests for new features
   - Document complex logic

   ## Commit Messages
   Follow conventional commits:
   - feat: New feature
   - fix: Bug fix
   - docs: Documentation
   - refactor: Code restructuring
   - test: Add/update tests
   - chore: Maintenance

   ## Pull Request Process
   1. Create feature branch
   2. Make changes with tests
   3. Run lint and tests
   4. Submit PR with description
   5. Wait for review
   ```

3. **Create API.md** (2 hours)
   Document all API endpoints:
   ```markdown
   # API Documentation

   ## Authentication
   All endpoints require Bearer token in Authorization header.

   ## Endpoints

   ### GET /api/employees
   Returns list of employees.

   **Auth**: Admin only

   **Response**:
   \`\`\`json
   {
     "employees": [
       {
         "id": 1,
         "name": "John Doe",
         "email": "john@example.com",
         "admin": false,
         "expected_hours": 40
       }
     ]
   }
   \`\`\`

   [... document all endpoints ...]
   ```

4. **Link to .aiden-context/** (1 hour)
   - Add links in README to architecture docs
   - Explain purpose of .aiden-context/
   - Keep synchronized with code

**Benefits**:
- Easier onboarding
- Self-service setup
- Clearer contribution process
- Better collaboration

**Risks**: Documentation maintenance burden

**Testing**: Ask fresh developer to follow setup instructions

---

### P2-003: Replace `any` Types with Proper Types

**Category**: Code Quality
**Files**: 13 files with 33 occurrences
**Effort**: 4 hours

**Rationale**: Improve type safety and catch bugs at compile time.

**Strategy**:

1. **Enable ESLint Rule** (15 min)
   ```javascript
   // eslint.config.js
   export default [
     {
       rules: {
         '@typescript-eslint/no-explicit-any': 'error',
       },
     },
   ];
   ```

2. **Fix API Handlers** (2 hours)

   **Before**:
   ```typescript
   export default async function handler(req: any, res: any) {
     // ...
   }
   ```

   **After**:
   ```typescript
   import { VercelRequest, VercelResponse } from '@vercel/node';

   export default async function handler(
     req: VercelRequest,
     res: VercelResponse
   ) {
     // ...
   }
   ```

3. **Fix Error Handling** (1 hour)

   **Before**:
   ```typescript
   try {
     // ...
   } catch (error: any) {
     console.error(error.message);
   }
   ```

   **After**:
   ```typescript
   try {
     // ...
   } catch (error) {
     if (error instanceof Error) {
       console.error(error.message);
     } else {
       console.error('Unknown error:', error);
     }
   }
   ```

4. **Fix Drizzle Query Results** (1 hour)

   **Before**:
   ```typescript
   const result: any = await db.select()...;
   ```

   **After**:
   ```typescript
   const result = await db.select()...; // Inferred type from Drizzle
   // Or explicit type:
   const result: Employee[] = await db.select().from(employees);
   ```

**Benefits**:
- Catches type errors at compile time
- Better IDE autocomplete
- Safer refactoring
- Self-documenting code

**Risks**: May uncover hidden type issues (good thing!)

**Testing**:
- Run `npm run lint` and fix all errors
- Run tests to verify behavior unchanged

---

### P2-004: Implement Retry Logic for API Calls

**Category**: Reliability
**Files**: All API call locations
**Effort**: 5 hours

**Rationale**: Handle transient network failures gracefully.

**Implementation**:

1. **Create Retry Utility** (1 hour)
   ```typescript
   // src/helpers/retry.ts
   export interface RetryOptions {
     maxAttempts?: number;
     delayMs?: number;
     backoff?: 'linear' | 'exponential';
     onRetry?: (attempt: number, error: Error) => void;
   }

   export async function withRetry<T>(
     fn: () => Promise<T>,
     options: RetryOptions = {}
   ): Promise<T> {
     const {
       maxAttempts = 3,
       delayMs = 1000,
       backoff = 'exponential',
       onRetry,
     } = options;

     let lastError: Error;

     for (let attempt = 1; attempt <= maxAttempts; attempt++) {
       try {
         return await fn();
       } catch (error) {
         lastError = error instanceof Error ? error : new Error(String(error));

         if (attempt === maxAttempts) {
           throw lastError;
         }

         const delay =
           backoff === 'exponential'
             ? delayMs * Math.pow(2, attempt - 1)
             : delayMs * attempt;

         onRetry?.(attempt, lastError);

         await new Promise((resolve) => setTimeout(resolve, delay));
       }
     }

     throw lastError!;
   }
   ```

2. **Create Fetch Wrapper** (1 hour)
   ```typescript
   // src/helpers/api.ts
   import { withRetry } from './retry';

   export async function apiFetch<T>(
     url: string,
     options?: RequestInit
   ): Promise<T> {
     return withRetry(
       async () => {
         const response = await fetch(url, {
           ...options,
           headers: {
             'Content-Type': 'application/json',
             ...options?.headers,
           },
         });

         if (!response.ok) {
           // Don't retry 4xx errors (client errors)
           if (response.status >= 400 && response.status < 500) {
             const error = await response.json();
             throw new Error(error.message || 'Request failed');
           }
           // Retry 5xx errors (server errors)
           throw new Error(`HTTP ${response.status}`);
         }

         return response.json();
       },
       {
         maxAttempts: 3,
         delayMs: 1000,
         backoff: 'exponential',
         onRetry: (attempt, error) => {
           console.log(`Retry attempt ${attempt} after error:`, error.message);
         },
       }
     );
   }
   ```

3. **Update Contexts** (2 hours)
   ```typescript
   // Example: src/context/PeriodDataContext.tsx
   import { apiFetch } from '../helpers/api';

   const saveEntries = async () => {
     try {
       setLoading(true);
       const saved = await apiFetch<{ entries: DayEntry[] }>(
         '/api/day_entries',
         {
           method: 'POST',
           body: JSON.stringify({ entries }),
         }
       );
       setEntries(saved.entries);
     } catch (error) {
       setError(error);
       // Show user-friendly error
     } finally {
       setLoading(false);
     }
   };
   ```

4. **Add User Feedback** (1 hour)
   - Show toast on retry attempts
   - Show error after max retries
   - Provide manual retry button

**Benefits**:
- Better resilience to network issues
- Improved user experience
- Reduced support burden

**Risks**: Increased latency on failures

**Testing**:
- Simulate network failure (dev tools)
- Verify retries occur
- Verify user feedback shown

---

### P2-005: Add Database Indexes for Performance

**Category**: Performance
**File**: `/db/schema.ts`
**Effort**: 2 hours

**Rationale**: Optimize query performance for common access patterns.

**Analysis** (Current Queries):
- Frequent: Get periods by employee_id
- Frequent: Get entries by period_id
- Frequent: Get entries by period_id and date range
- Moderate: Get employees by email (login)
- Rare: Full table scans

**Recommended Indexes**:

```typescript
// db/schema.ts

// Add indexes to periods table
export const periods = pgTable(
  'periods',
  {
    id: serial('id').primaryKey(),
    employee_id: integer('employee_id').notNull().references(() => employees.id, {
      onDelete: 'cascade',
    }),
    start_date: date('start_date').notNull(),
    end_date: date('end_date').notNull(),
    closed_at: timestamp('closed_at'),
  },
  (table) => ({
    // Index for: SELECT * FROM periods WHERE employee_id = ? ORDER BY start_date DESC
    employeeIdStartDateIdx: index('periods_employee_id_start_date_idx').on(
      table.employee_id,
      table.start_date
    ),
    // Index for: SELECT * FROM periods WHERE employee_id = ? AND closed_at IS NULL
    employeeIdClosedIdx: index('periods_employee_id_closed_idx').on(
      table.employee_id,
      table.closed_at
    ),
  })
);

// Add indexes to day_entries table
export const dayEntries = pgTable(
  'day_entries',
  {
    id: serial('id').primaryKey(),
    period_id: integer('period_id').notNull().references(() => periods.id, {
      onDelete: 'cascade',
    }),
    entry_date: date('entry_date').notNull(),
    hours: numeric('hours', { precision: 5, scale: 2 }),
    day_type: varchar('day_type', { length: 20 }).notNull(),
    project_id: integer('project_id').references(() => projects.id),
  },
  (table) => ({
    // Index for: SELECT * FROM day_entries WHERE period_id = ?
    periodIdIdx: index('day_entries_period_id_idx').on(table.period_id),
    // Composite index for: SELECT * FROM day_entries WHERE period_id = ? AND entry_date BETWEEN ? AND ?
    periodIdDateIdx: index('day_entries_period_id_date_idx').on(
      table.period_id,
      table.entry_date
    ),
    // Index for project filtering (when feature is enabled)
    projectIdIdx: index('day_entries_project_id_idx').on(table.project_id),
  })
);

// Add index to employees table
export const employees = pgTable(
  'employees',
  {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    admin: boolean('admin').default(false),
    expected_hours: numeric('expected_hours', { precision: 5, scale: 2 }),
    setting_id: integer('setting_id').references(() => settings.id),
  },
  (table) => ({
    // Index for: SELECT * FROM employees WHERE email = ? (login lookup)
    emailIdx: index('employees_email_idx').on(table.email),
    // Already has unique constraint, but explicit index helps
  })
);
```

**Migration**:
```bash
npm run db:generate  # Generate migration with new indexes
npm run db:push      # Apply to database
```

**Benefits**:
- Faster period and entry queries
- Better scalability
- Reduced database load

**Risks**:
- Slightly slower writes (negligible)
- Increased storage (minimal)

**Testing**:
- Use EXPLAIN ANALYZE on key queries
- Compare query times before/after
- Monitor database metrics

---

## Priority 3: Nice to Have

### P3-001: Implement Optimistic UI Updates

**Category**: User Experience
**Files**: All contexts with mutations
**Effort**: 6 hours

**Rationale**: Instant feedback makes app feel faster.

**Strategy**:
- Update local state immediately
- Send API request in background
- Rollback on error

**Example Implementation**:

```typescript
// src/context/EntriesContext.tsx
const saveEntries = async (newEntries: DayEntry[]) => {
  const previousEntries = entries; // Backup

  // Optimistic update
  setEntries(newEntries);

  try {
    // Background save
    const saved = await apiFetch<{ entries: DayEntry[] }>(
      '/api/day_entries',
      {
        method: 'POST',
        body: JSON.stringify({ entries: newEntries }),
      }
    );

    // Replace with server response (has IDs)
    setEntries(saved.entries);
  } catch (error) {
    // Rollback on error
    setEntries(previousEntries);
    toast.error('Failed to save entries. Please try again.');
  }
};
```

**Benefits**:
- Instant user feedback
- Feels more responsive
- Better perceived performance

**Risks**: Complexity in error handling

---

### P3-002: Remove Console.log Statements

**Category**: Code Quality
**Files**: 6 files
**Effort**: 1 hour

**Strategy**:
1. Enable ESLint rule `no-console`
2. Replace with proper logging
3. Create conditional dev logging

```typescript
// src/helpers/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.log('[DEBUG]', ...args);
    }
  },
  info: (...args: any[]) => {
    console.info('[INFO]', ...args);
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args);
    // Send to Sentry in production
  },
};

// Replace console.log with logger.debug
```

---

### P3-003: Add Loading Timeouts

**Category**: Reliability
**Files**: All loading states
**Effort**: 2 hours

**Implementation**:

```typescript
// src/helpers/timeout.ts
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 30000
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
    ),
  ]);
}

// Usage
const data = await withTimeout(fetchData(), 30000);
```

---

### P3-004: Implement Caching Strategy

**Category**: Performance
**Effort**: 8 hours

**Options**:
1. HTTP Cache-Control headers
2. Vercel Edge caching
3. React Query / SWR for client caching
4. Redis for backend caching

**Recommended: React Query**
```typescript
// Switch from contexts to react-query
import { useQuery, useMutation } from '@tanstack/react-query';

const { data: periods } = useQuery({
  queryKey: ['periods', employeeId],
  queryFn: () => fetchPeriods(employeeId),
  staleTime: 5 * 60 * 1000, // 5 minutes
});
```

---

### P3-005: Add E2E Tests with Playwright

**Category**: Testing
**Effort**: 10 hours

**Setup**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Example Test**:
```typescript
// e2e/time-entry.spec.ts
import { test, expect } from '@playwright/test';

test('employee can enter hours and close period', async ({ page }) => {
  // Login
  await page.goto('/login');
  await page.fill('[name="email"]', 'employee@example.com');
  await page.fill('[name="password"]', 'password');
  await page.click('[type="submit"]');

  // Enter hours
  await page.waitForSelector('.week-grid');
  await page.fill('[data-day="monday"]', '8');
  await page.fill('[data-day="tuesday"]', '8');
  await page.click('button:has-text("Save")');

  // Close period
  await page.click('button:has-text("Close Period")');
  await expect(page.locator('.period-closed')).toBeVisible();
});
```

---

## Priority 4: Future Enhancements

### P4-001: Migrate to Zustand or Redux Toolkit

**Category**: Architecture
**Effort**: 16 hours

**Rationale**: Better performance and devtools than React Context.

**Benefits**:
- Better performance
- Redux DevTools
- Middleware support
- Simpler API

---

### P4-002: Add Multi-tenancy Support

**Category**: Feature
**Effort**: 40+ hours

**Requirements**:
- Add `organization` table
- Add `organization_id` to all tables
- Update RLS policies
- Add organization switcher UI
- Subdomain or path-based routing

---

### P4-003: Mobile App with React Native

**Category**: Feature
**Effort**: 200+ hours

**Scope**: iOS and Android apps sharing API with web app.

---

## Implementation Priority Summary

| Priority | Items | Total Effort | Timeline |
|----------|-------|--------------|----------|
| P0 | 3 | 3 hours | Immediate |
| P1 | 4 | 18 hours | Week 1-2 |
| P2 | 5 | 29 hours | Week 3-4 |
| P3 | 5 | 27 hours | Month 2 |
| P4 | 3 | 256+ hours | Future |

**Total Effort for P0-P2**: ~50 hours (~2 weeks full-time)

---

**Last Updated**: 2025-11-12
**Document Version**: 1.0
