# Architecture

## System Overview

Tymmar is built as a modern, serverless web application with a React frontend and Node.js serverless functions backend, deployed on Vercel with a PostgreSQL database hosted on Supabase.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Browser                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │          React 19 SPA (TypeScript + Vite)              │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │  Components  │  │   Contexts   │  │    Hooks     │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │ HTTPS / JWT Bearer
                  ↓
┌─────────────────────────────────────────────────────────────┐
│              Vercel Serverless Functions                     │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  /api/employees  /api/day_entries  /api/periods  etc.  │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │ │
│  │  │   Routing    │  │     Auth     │  │   Business   │ │ │
│  │  │   (HTTP)     │  │  Middleware  │  │     Logic    │ │ │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────┬───────────────────────────────────────────┘
                  │ Drizzle ORM / postgres driver
                  ↓
┌─────────────────────────────────────────────────────────────┐
│           Supabase PostgreSQL + Auth Service                 │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │   PostgreSQL   │  │   Auth (JWT)   │  │     RLS      │  │
│  │    Database    │  │                │  │   Policies   │  │
│  └────────────────┘  └────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────┘
                  ↑
                  │ OpenAI API (AI features)
                  │
         ┌────────────────────┐
         │   OpenAI Service   │
         │   (GPT-4o-mini)    │
         └────────────────────┘
```

---

## Project Structure

### Directory Layout

```
/Users/lysla/Work/Repos/tymmar/
├── src/                          # Frontend React application
│   ├── components/               # Reusable UI components
│   │   ├── admin/               # Admin-specific components
│   │   ├── AIInput.tsx          # AI-powered hour filling input
│   │   ├── ClosePeriodButton.tsx
│   │   ├── NavBar.tsx
│   │   ├── WeekGrid.tsx         # Main time entry grid
│   │   └── index.ts
│   ├── context/                 # React Context providers
│   │   ├── AuthContext.tsx      # Authentication state
│   │   ├── EmployeeContext.tsx  # Current employee data
│   │   └── PeriodDataContext.tsx # Period and entry data (420 lines)
│   ├── hooks/                   # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useEmployee.ts
│   │   └── usePeriodData.ts
│   ├── pages/                   # Page components (route targets)
│   │   ├── admin/               # Admin pages
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── AdminEmployees.tsx
│   │   │   └── AdminSettings.tsx
│   │   ├── Dashboard.tsx        # Main employee dashboard
│   │   ├── Login.tsx
│   │   └── index.ts
│   ├── router/                  # Routing configuration
│   │   └── AppRouter.tsx
│   ├── types/                   # TypeScript type definitions
│   │   └── index.ts
│   ├── helpers/                 # Utility functions
│   │   ├── date.ts              # Date manipulation utilities
│   │   └── supabase.ts          # Supabase client
│   ├── layouts/                 # Layout components
│   │   ├── AdminLayout.tsx      # Admin-specific layout
│   │   └── Layout.tsx           # Base layout
│   ├── App.tsx                  # Root component
│   ├── main.tsx                 # Entry point
│   └── index.css                # Global styles
│
├── api/                         # Serverless API endpoints
│   ├── _shared/                 # Shared utilities
│   │   ├── auth.ts              # Authentication middleware
│   │   ├── db.ts                # Database connection
│   │   └── supabase.ts          # Supabase admin client
│   ├── _employees/              # Employee operations
│   │   ├── get.ts               # GET /api/employees
│   │   ├── post.ts              # POST /api/employees
│   │   ├── put.ts               # PUT /api/employees
│   │   └── delete.ts            # DELETE /api/employees
│   ├── _entries/                # Day entry operations
│   │   ├── get.ts
│   │   ├── post.ts
│   │   ├── put.ts
│   │   └── delete.ts
│   ├── _periods/                # Period operations
│   │   ├── get.ts
│   │   ├── post.ts
│   │   └── put.ts
│   ├── _settings/               # Settings operations
│   │   ├── get.ts
│   │   ├── post.ts
│   │   ├── put.ts
│   │   └── delete.ts
│   ├── _ai/                     # AI integration
│   │   └── fill_hours.ts        # AI-powered hour filling
│   ├── employees.ts             # Employee endpoint router
│   ├── day_entries.ts           # Day entry endpoint router
│   ├── periods.ts               # Period endpoint router
│   ├── settings.ts              # Settings endpoint router
│   ├── reports.ts               # Reporting endpoint
│   ├── ai.ts                    # AI endpoint router
│   └── manual-set-admin.ts      # Manual admin setup (⚠️ security risk)
│
├── db/                          # Database schema and migrations
│   └── schema.ts                # Drizzle ORM schema definitions
│
├── public/                      # Static assets
│   └── vite.svg
│
├── .aiden-context/              # Aiden documentation workspace
│
└── [Config files]               # package.json, tsconfig.json, etc.
```

---

## Frontend Architecture

### Technology Stack

- **Framework**: React 19.1.1 with TypeScript 5.9.3
- **Build Tool**: Vite 7.1.7
- **Routing**: React Router 7.9.4
- **Styling**: Tailwind CSS 4.1.14
- **State Management**: React Context API
- **Date Handling**: date-fns 4.1.0
- **UI Components**: Custom components + react-day-picker 9.11.1

### Component Hierarchy

```
App
├── AppRouter
│   ├── Layout (Public routes)
│   │   ├── NavBar
│   │   └── Login
│   │
│   └── ProtectedRoutes (Authenticated)
│       ├── Layout
│       │   ├── NavBar
│       │   └── Dashboard
│       │       ├── WeekGrid (main time entry interface)
│       │       │   ├── AIInput
│       │       │   └── DayEntryInputs
│       │       └── ClosePeriodButton
│       │
│       └── AdminLayout (Admin-only)
│           ├── NavBar
│           └── Admin Pages
│               ├── AdminDashboard (reporting)
│               ├── AdminEmployees (CRUD)
│               └── AdminSettings (CRUD)
```

### State Management Pattern

**Context-based Architecture**:

1. **AuthContext** (`src/context/AuthContext.tsx`)
   - Manages authentication state
   - Provides: `user`, `session`, `loading`, `logout()`
   - Used by: All protected routes

2. **EmployeeContext** (`src/context/EmployeeContext.tsx`)
   - Manages current employee data
   - Provides: `employee`, `loading`, `error`, `refetch()`
   - Depends on: AuthContext
   - Used by: Dashboard, WeekGrid, admin pages

3. **PeriodDataContext** (`src/context/PeriodDataContext.tsx`) ⚠️ Large (420 lines)
   - Manages period, entries, calendar, and AI state
   - Provides:
     - Period data: `period`, `entries`, `setPeriod()`
     - Calendar: `selectedDate`, `setSelectedDate()`, `weekStart`
     - AI: `aiEnabled`, `toggleAI()`, `aiLoading`
     - Operations: `saveEntries()`, `closePeriod()`, `reopenPeriod()`
   - Depends on: EmployeeContext
   - Used by: Dashboard, WeekGrid, AIInput, ClosePeriodButton
   - **Issue**: God object anti-pattern, handles too many concerns

### Data Flow

```
User Action (Component)
    ↓
Context Method Call
    ↓
API Request (fetch with JWT)
    ↓
Serverless Function
    ↓
Database Query (Drizzle ORM)
    ↓
Response
    ↓
Context State Update
    ↓
Component Re-render
```

### Routing Strategy

- **Public Routes**: Login page
- **Protected Routes**: Wrapped in authentication check (redirects to login if not authenticated)
- **Admin Routes**: Additional admin role check (shows 403 if not admin)
- **Layout Wrapping**: AdminLayout for admin pages, base Layout for employee pages

---

## Backend Architecture

### API Design Pattern

**Serverless Function per Resource**:

Each resource has a main router file (`api/[resource].ts`) that:
1. Accepts incoming HTTP request
2. Routes by HTTP method (GET, POST, PUT, DELETE)
3. Delegates to method-specific handler in `api/_[resource]/[method].ts`

**Example: Employee API**

```typescript
// api/employees.ts
export default async function handler(req, res) {
  switch (req.method) {
    case 'GET': return getEmployees(req, res);
    case 'POST': return createEmployee(req, res);
    case 'PUT': return updateEmployee(req, res);
    case 'DELETE': return deleteEmployee(req, res);
  }
}
```

### Authentication Flow

```
1. User logs in via Supabase Auth
2. Frontend receives JWT access token
3. Frontend stores token in memory (AuthContext)
4. Every API request includes: Authorization: Bearer <token>
5. API extracts token via requireAuth() or requireAdmin()
6. Supabase SDK validates token and returns user
7. Request proceeds with authenticated user context
```

**Middleware Functions**:
- `requireAuth(req)`: Validates JWT, returns user or throws 401
- `requireAdmin(req)`: Validates JWT, checks admin role, returns user or throws 403

### Database Architecture

**ORM**: Drizzle ORM 0.44.6
**Database**: PostgreSQL (Supabase-hosted)
**Connection**: postgres driver (non-pooling for serverless)

**Schema Overview** (7 tables + 1 view):

```sql
-- Core tables
employees (id, name, email, admin, expected_hours, setting_id)
settings (id, label, expected_hours)
periods (id, employee_id, start_date, end_date, closed_at)
day_entries (id, period_id, entry_date, hours, day_type, project_id)
projects (id, label) -- Not yet used in UI

-- Auth tables (Supabase managed)
users (id, email, ...)

-- Reporting view
period_summaries_view (aggregated data for reports)
```

**Relationships**:
- `employees` → `settings` (many-to-one, nullable)
- `periods` → `employees` (many-to-one, cascade delete)
- `day_entries` → `periods` (many-to-one, cascade delete)
- `day_entries` → `projects` (many-to-one, nullable, not enforced)

**Row-Level Security (RLS)**:
- All tables have RLS enabled
- Policies enforce employee data isolation
- Admin users have elevated access

### API Endpoints

| Endpoint | Methods | Purpose | Auth Required |
|----------|---------|---------|---------------|
| `/api/employees` | GET, POST, PUT, DELETE | Employee CRUD | Admin only (except GET for self) |
| `/api/day_entries` | GET, POST, PUT, DELETE | Day entry CRUD | Employee (own data) |
| `/api/periods` | GET, POST, PUT | Period management | Employee (own data) |
| `/api/settings` | GET, POST, PUT, DELETE | Settings CRUD | Admin only |
| `/api/reports` | GET | Generate reports | Admin only |
| `/api/ai` | POST | AI hour filling | Employee |
| `/api/manual-set-admin` | POST | Manual admin setup | ⚠️ Insecure |

### AI Integration

**Service**: OpenAI GPT-4o-mini via Vercel AI SDK
**Endpoint**: `/api/ai` → `api/_ai/fill_hours.ts`

**Flow**:
1. Frontend sends period context (dates, entries, employee info)
2. Backend constructs prompt with context
3. OpenAI generates hour suggestions
4. Backend parses and validates response
5. Frontend displays suggestions for user approval

**Prompt Structure**:
- System: Define assistant role and output format
- User: Provide period details and ask for hour filling
- Response: Structured JSON with hours per day

---

## Data Flow Diagrams

### Employee Time Entry Flow

```
User opens Dashboard
    ↓
EmployeeContext fetches current employee
    ↓
PeriodDataContext fetches/creates current week period
    ↓
PeriodDataContext fetches day entries for period
    ↓
WeekGrid renders 7 day inputs with current values
    ↓
User modifies hours for a day
    ↓
PeriodDataContext.saveEntries() called
    ↓
POST /api/day_entries with updated entries
    ↓
Database saves/updates entries
    ↓
Response returns saved entries
    ↓
PeriodDataContext updates local state
    ↓
WeekGrid re-renders with saved values
```

### Period Closing Flow

```
User clicks "Close Period"
    ↓
PeriodDataContext.closePeriod() called
    ↓
PUT /api/periods with { closed_at: timestamp }
    ↓
Database updates period record
    ↓
Response confirms closure
    ↓
PeriodDataContext updates local state
    ↓
UI disables editing, shows "Reopen" button
```

### Admin Employee Management Flow

```
Admin opens AdminEmployees page
    ↓
GET /api/employees (all employees)
    ↓
AdminEmployees renders employee list
    ↓
Admin creates/edits employee
    ↓
POST or PUT /api/employees
    ↓
requireAdmin() validates admin role
    ↓
Database saves employee
    ↓
Response returns saved employee
    ↓
AdminEmployees refetches list
    ↓
UI updates with new/modified employee
```

---

## External Dependencies

### Production Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@ai-sdk/openai` | 2.0.42 | OpenAI integration for Vercel AI SDK |
| `@supabase/supabase-js` | 2.74.0 | Supabase client (auth + database) |
| `ai` | 5.0.60 | Vercel AI SDK for AI features |
| `date-fns` | 4.1.0 | Date manipulation and formatting |
| `drizzle-orm` | 0.44.6 | Type-safe ORM for PostgreSQL |
| `postgres` | 3.4.7 | PostgreSQL driver |
| `react` | 19.1.1 | UI framework |
| `react-dom` | 19.1.1 | React DOM renderer |
| `react-router` | 7.9.4 | Client-side routing |
| `react-day-picker` | 9.11.1 | Calendar picker component |

### Development Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| `@nx/vite` | 21.6.3 | NX Vite integration |
| `@vitejs/plugin-react` | 4.4.2 | Vite React plugin |
| `drizzle-kit` | 0.31.0 | Drizzle migration toolkit |
| `eslint` | 9.36.0 | Code linting |
| `tailwindcss` | 4.1.14 | Utility-first CSS |
| `typescript` | 5.9.3 | Type system |
| `vite` | 7.1.7 | Build tool and dev server |

---

## Deployment Architecture

### Hosting

**Platform**: Vercel
**Configuration**: `vercel.json`

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Build Process

```
npm run build
    ↓
Vite builds React app
    ↓
Output to /dist
    ↓
Vercel deploys static assets + serverless functions
    ↓
Production URL: [project].vercel.app
```

### Environment Variables

Required environment variables (stored in Vercel):

- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key (frontend)
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (backend admin operations)
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `JWT_SECRET`: JWT signing secret (if custom JWT used)
- `DATABASE_URL`: PostgreSQL connection string

⚠️ **Security Issue**: `.env` file is committed to repository with real credentials (see risks-and-bugs.md)

### CI/CD Pipeline

**GitHub Actions** (`.github/workflows/ci.yml`):

```
On push to main or pull request:
    ↓
1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Run lint (nx affected -t lint)
5. Run tests (nx affected -t test) -- Currently no tests
6. Build (nx affected -t build)
    ↓
If main branch: Auto-deploy to Vercel
```

---

## Performance Considerations

### Current Optimizations

- React Router lazy loading for routes
- Vite code splitting for vendor bundles
- Tailwind CSS purging for minimal CSS
- Serverless functions scale automatically

### Performance Bottlenecks

- **Large Context Re-renders**: PeriodDataContext (420 lines) may cause unnecessary re-renders
- **No Caching**: Every page load hits database
- **No Memoization**: Date calculations and derived data recalculated on every render
- **Unoptimized Queries**: Some N+1 patterns in reports endpoint
- **No CDN Caching**: Static assets not cached aggressively

### Recommended Improvements

1. Split PeriodDataContext into smaller, focused contexts
2. Add `useMemo` and `useCallback` for expensive computations
3. Implement React.memo for pure components
4. Add caching layer (Redis or Vercel KV) for frequent queries
5. Optimize database indexes for common queries
6. Implement query batching for reports

---

## Security Architecture

### Current Security Measures

1. **Authentication**: Supabase Auth with JWT tokens
2. **Authorization**: Role-based access control (admin vs employee)
3. **RLS Policies**: Database-level row security
4. **API Middleware**: `requireAuth()` and `requireAdmin()` guards
5. **Type Safety**: TypeScript end-to-end
6. **HTTPS**: Enforced by Vercel

### Security Gaps

1. **Exposed Secrets**: `.env` committed to repository (HIGH RISK)
2. **Insecure Endpoint**: `manual-set-admin.ts` has hardcoded credentials
3. **No Rate Limiting**: AI and API endpoints vulnerable to abuse
4. **Minimal Input Validation**: Limited server-side validation
5. **No CSRF Protection**: API doesn't implement CSRF tokens
6. **No Request Logging**: No audit trail for sensitive operations

See `risks-and-bugs.md` for detailed security issues and mitigations.

---

## Monitoring and Observability

### Current State

- **Logging**: Console.log statements (insufficient for production)
- **Error Tracking**: None implemented
- **Performance Monitoring**: None implemented
- **Uptime Monitoring**: Vercel default monitoring only

### Recommendations

1. Integrate error tracking (Sentry, Rollbar)
2. Add structured logging (Winston, Pino)
3. Implement APM (Application Performance Monitoring)
4. Set up uptime monitoring (Pingdom, UptimeRobot)
5. Add user analytics (PostHog, Mixpanel)
6. Create admin dashboard for system health

---

## Testing Strategy

### Current State

- **Unit Tests**: None
- **Integration Tests**: None
- **E2E Tests**: None
- **Test Coverage**: 0%

### Planned Testing Architecture

```
├── Unit Tests (Vitest)
│   ├── Utility functions (date.ts)
│   ├── Context logic
│   └── API handlers
│
├── Component Tests (React Testing Library)
│   ├── WeekGrid
│   ├── Admin components
│   └── Forms
│
├── Integration Tests (Vitest + MSW)
│   ├── Auth flow
│   ├── Period management
│   └── API contracts
│
└── E2E Tests (Playwright)
    ├── Employee time entry flow
    ├── Admin management flow
    └── AI-assisted filling flow
```

See `plan.md` for detailed testing implementation plan.

---

## Scalability Considerations

### Current Capacity

- **Serverless Functions**: Auto-scale on Vercel (limited by plan)
- **Database**: Supabase shared instance (limited connections)
- **AI Requests**: Rate-limited by OpenAI API tier

### Scaling Challenges

1. **Database Connections**: Serverless functions may exhaust connection pool
2. **Cold Starts**: Serverless functions have ~1s cold start latency
3. **AI Costs**: OpenAI API costs scale linearly with usage
4. **No Caching**: Every request hits database
5. **Single Region**: No multi-region deployment

### Scaling Recommendations

1. Implement connection pooling (PgBouncer)
2. Add edge caching for static and frequently accessed data
3. Implement background jobs for heavy operations
4. Consider multi-region deployment for global users
5. Add CDN for static assets
6. Implement request queuing for AI features

---

## Architecture Decisions

### Why Serverless?

- **Pros**: Auto-scaling, pay-per-use, simple deployment, no server management
- **Cons**: Cold starts, connection pooling complexity, vendor lock-in
- **Decision**: Chosen for simplicity and cost-effectiveness for MVP

### Why Drizzle ORM?

- **Pros**: Type-safe, lightweight, SQL-first, excellent TypeScript support
- **Cons**: Smaller ecosystem than Prisma, fewer features
- **Decision**: Preferred for type safety and learning modern ORMs

### Why React Context over Redux?

- **Pros**: Built-in, simpler for small apps, less boilerplate
- **Cons**: Re-render optimization harder, no middleware ecosystem
- **Decision**: Sufficient for current complexity, can migrate to Zustand/Redux later

### Why Tailwind CSS?

- **Pros**: Utility-first, fast development, consistent design system
- **Cons**: Verbose className strings, learning curve
- **Decision**: Industry standard, excellent DX with VSCode extensions

---

**Last Updated**: 2025-11-12
**Document Version**: 1.0
