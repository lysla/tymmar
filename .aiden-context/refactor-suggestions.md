# Refactor Suggestions

## Refactoring Philosophy

This document proposes improvements to **maintainability, scalability, and developer experience** without altering core functionality. Suggestions are prioritized by impact vs. effort and classified as:

- **Minor:** Low effort, immediate clarity gains (formatting, naming, extraction)
- **Major:** Higher effort, structural improvements (architectural changes, new patterns)

---

## Minor Refactorings (Quick Wins)

### 1. Extract Common Loading Spinner Component
**Locations:** `src/router/RouteGuards.tsx:12-14`, `src/pages/Dashboard.tsx:17-19`, `src/router/AppRouter.tsx:15-17`

**Current:**
```tsx
<div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
    <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
</div>
```

**Proposed:**
```tsx
// src/components/LoadingSpinner.tsx
export function LoadingSpinner() {
    return (
        <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
            <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
        </div>
    );
}

// Usage
<LoadingSpinner />
```

**Benefits:** DRY principle, consistent loading UX, easier to add loading state variations (e.g., with text)

---

### 2. Standardize API Response Format
**Locations:** All `/api/*` handlers

**Current:** Inconsistent shapes:
- `{ setting: {...} }` (singular)
- `{ settings: [...] }` (plural)
- `{ error: "..." }` (error)
- `{ success: boolean, data: {...} }` (some routes)

**Proposed:**
```typescript
// Shared type
type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: { message: string; code: string } };

// Usage in handlers
return res.status(200).json({ success: true, data: { employee } });
return res.status(400).json({ success: false, error: { message: "Invalid input", code: "VALIDATION_ERROR" } });
```

**Benefits:** Predictable response parsing in frontend, easier to add response middleware, typed error codes

---

### 3. Extract Date Constants
**Locations:** `src/context/PeriodDataContext.tsx:287`, `api/_entries/put.ts:35-50`

**Current:** Hardcoded weekday arrays and switch statements

**Proposed:**
```typescript
// src/constants/date.ts
export const WEEKDAY_NAMES = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;
export type WeekdayName = typeof WEEKDAY_NAMES[number];

export const WEEKDAY_SETTING_MAP: Record<WeekdayName, keyof Pick<Setting, "monHours" | "tueHours" | ...>> = {
    monday: "monHours",
    tuesday: "tueHours",
    // ...
};

// In put.ts
const weekday = weekdayNameUTC(dateISO);
const settingKey = WEEKDAY_SETTING_MAP[weekday];
return Number(sett[settingKey]);
```

**Benefits:** Single source of truth, eliminates repetitive switch statements, type-safe weekday handling

---

### 4. Replace Inline Error Messages with Constants
**Locations:** All API handlers

**Current:**
```typescript
return res.status(400).json({ error: "Invalid date format" });
```

**Proposed:**
```typescript
// src/constants/errors.ts
export const ERROR_MESSAGES = {
    INVALID_DATE_FORMAT: "Invalid date format",
    PERIOD_CLOSED: "Period is closed and cannot be edited",
    UNAUTHORIZED: "Unauthorized",
    // ...
} as const;

// Usage
return res.status(400).json({ error: ERROR_MESSAGES.INVALID_DATE_FORMAT });
```

**Benefits:** Consistent messaging, easier to localize in future, grep-able error codes

---

### 5. Extract Entry Validation Logic
**Locations:** `api/_entries/put.ts:62-78`, `src/context/PeriodDataContext.tsx:298-301`

**Current:** Validation logic duplicated and inline

**Proposed:**
```typescript
// api/_shared/validation.ts
export function validateDayEntry(entry: Partial<DayEntry>): { valid: boolean; error?: string } {
    if (!DAY_TYPES.includes(entry.type as DayType)) {
        return { valid: false, error: `Invalid type: ${entry.type}` };
    }
    const hours = Number(entry.hours);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
        return { valid: false, error: `Invalid hours: ${entry.hours}` };
    }
    return { valid: true };
}

// Usage
const validation = validateDayEntry(row);
if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
}
```

**Benefits:** Reusable validation, testable in isolation, consistent rules across frontend and backend

---

### 6. Remove Commented-Out Code
**Locations:** `src/components/WeekGrid.tsx:104-105` (notes input), `src/components/WeekGrid.tsx:92-97` (project dropdown)

**Current:**
```tsx
{/** 👀 optional notes later */}
{/* <input className="input input--alt mt-2" placeholder="Note (optional)" /> */}
```

**Proposed:** Delete commented code or move to GitHub issues/roadmap

**Benefits:** Cleaner codebase, reduces cognitive load, prevents confusion about feature status

**Alternative:** If keeping for reference, add TODO comment with issue link:
```tsx
{/** TODO #42: Add notes field - see https://github.com/org/repo/issues/42 */}
```

---

### 7. Extract WeekGrid Day Logic into Subcomponent
**Locations:** `src/components/WeekGrid.tsx:12-117`

**Current:** 100+ line map function rendering each day

**Proposed:**
```tsx
// src/components/WeekGrid/DayColumn.tsx
export function DayColumn({ day, entries, expected, onAddEntry, onUpdateEntry, onRemoveEntry, disabled }: Props) {
    // ... existing day rendering logic
}

// In WeekGrid.tsx
{days.map((d, i) => (
    <DayColumn key={toISO(d)} day={d} entries={draftEntriesByDate[toISO(d)] ?? []} expected={expectedByDay[i]} ... />
))}
```

**Benefits:** Improved readability, testable day component, easier to add day-level features (e.g., duplicate day button)

---

## Major Refactorings (Structural Improvements)

### 8. Introduce React Query for Data Fetching
**Locations:** All manual `fetch()` calls in contexts and components

**Current Problem:** Manual loading states, error handling, cache invalidation logic in `PeriodDataContext`, `EmployeeContext`

**Proposed:**
```typescript
// Example with React Query
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function usePeriodData(fromDateISO: string, toDateISO: string) {
    const { getAccessToken } = useAuth();

    return useQuery({
        queryKey: ['period', fromDateISO, toDateISO],
        queryFn: async () => {
            const token = await getAccessToken();
            const res = await fetch(`/api/day_entries?from=${fromDateISO}&to=${toDateISO}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!res.ok) throw new Error('Failed to load period');
            return res.json();
        },
    });
}

function useSavePeriod() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload) => { /* PUT /api/day_entries */ },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['period'] });
            queryClient.invalidateQueries({ queryKey: ['monthPeriods'] });
        },
    });
}
```

**Benefits:**
- Automatic background refetching, caching, deduplication
- Eliminates manual `loading`, `error`, `refetch` state management
- Reduces `PeriodDataContext` from ~420 lines to <200 lines
- Built-in optimistic updates, retry logic

**Effort:** High (requires React Query setup, refactor all contexts)

---

### 9. Extract Business Logic from Contexts into Services
**Locations:** `src/context/PeriodDataContext.tsx` (lines 224-377), `src/context/EmployeeContext.tsx`

**Current Problem:** Contexts contain business logic (calculations, API calls, normalization), making them hard to test and reuse

**Proposed:**
```typescript
// src/services/periodService.ts
export const periodService = {
    async fetchPeriod(fromDateISO: string, toDateISO: string, token: string) {
        // API call logic
    },

    async savePeriod(payload: EntriesByDate, token: string) {
        // API call logic
    },

    calculateWeekTotal(entriesByDate: EntriesByDate, daysISO: string[]): number {
        return daysISO.reduce((sum, iso) => {
            const rows = entriesByDate[iso] ?? [];
            return sum + rows.reduce((s, r) => s + Number(r.hours || 0), 0);
        }, 0);
    },

    // ... other pure functions
};

// In context
const weekTotal = useMemo(() => periodService.calculateWeekTotal(draftEntriesByDate, daysISO), [draftEntriesByDate, daysISO]);
```

**Benefits:**
- Testable business logic (unit tests for pure functions)
- Reusable in admin views or reports
- Contexts become thin state containers

**Effort:** High (requires architectural shift, comprehensive testing)

---

### 10. Implement Backend API Router with Middleware
**Locations:** All `/api/*.ts` handlers

**Current Problem:** Duplicate auth checks, error handling, method routing in every handler

**Proposed:**
```typescript
// api/_shared/router.ts
import { VercelRequest, VercelResponse } from "@vercel/node";

export function createRouter() {
    const routes = new Map<string, Map<string, Handler>>();

    function route(method: string, path: string, ...middlewares: Middleware[]) {
        // Register handler with middlewares
    }

    async function handle(req: VercelRequest, res: VercelResponse) {
        try {
            const handler = routes.get(req.method)?.get(req.url);
            if (!handler) return res.status(405).send("Method Not Allowed");
            await handler(req, res);
        } catch (e: any) {
            return res.status(e.status ?? 500).json({ error: e.message ?? "Server error" });
        }
    }

    return { route, handle };
}

// Usage in api/employees.ts
const router = createRouter();
router.route("GET", "/api/employees", requireAdmin, getEmployees);
router.route("POST", "/api/employees", requireAdmin, postEmployees);
export default router.handle;
```

**Benefits:**
- Centralized error handling
- Composable middleware (auth, logging, validation)
- Reduces boilerplate by 50%

**Effort:** High (requires building router abstraction, refactor all handlers)

---

### 11. Add Input Validation Layer with Zod
**Locations:** All API handlers with `req.body` or `req.query` parsing

**Current Problem:** Manual validation with repetitive type checks

**Proposed:**
```typescript
// api/_shared/schemas.ts
import { z } from "zod";

export const SaveEntriesSchema = z.object({
    payload: z.record(
        z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // ISO date
        z.array(z.object({
            type: z.enum(["work", "sick", "time_off"]),
            hours: z.number().min(0).max(24),
            projectId: z.number().nullable(),
            note: z.string().nullable(),
        }))
    ),
});

// In api/_entries/put.ts
const parsed = SaveEntriesSchema.safeParse(req.body);
if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", issues: parsed.error.issues });
}
const { payload } = parsed.data; // Type-safe!
```

**Benefits:**
- Type-safe request parsing
- Automatic error messages with field paths
- Self-documenting API contracts

**Effort:** Medium (Zod already used in `api/ai.ts`, extend to other routes)

---

### 12. Introduce Error Boundaries
**Locations:** `src/main.tsx`, `src/context/PeriodDataContext.tsx` (wrap provider)

**Current Problem:** Uncaught rendering errors crash entire app

**Proposed:**
```typescript
// src/components/ErrorBoundary.tsx
import { Component, ReactNode } from "react";

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error?: Error }> {
    state = { hasError: false, error: undefined };

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: any) {
        console.error("ErrorBoundary caught:", error, info);
        // Log to Sentry, etc.
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-page">
                    <h1>Something went wrong</h1>
                    <p>{this.state.error?.message}</p>
                    <button onClick={() => window.location.reload()}>Reload</button>
                </div>
            );
        }
        return this.props.children;
    }
}

// In main.tsx
<ErrorBoundary>
    <BrowserRouter>
        <AuthProvider>
            <AppRouter />
        </AuthProvider>
    </BrowserRouter>
</ErrorBoundary>
```

**Benefits:**
- Graceful failure instead of blank screen
- Ability to log errors to monitoring service
- Component-level recovery (wrap just `PeriodDataProvider`)

**Effort:** Low (straightforward class component)

---

### 13. Consolidate Date Utilities into Shared Package
**Locations:** `src/helpers/date.ts`, `api/_entries/put.ts`, `api/_entries/get.ts`

**Current Problem:** Date logic duplicated across frontend and backend, risk of calculation mismatches

**Proposed:**
```
/packages
  /shared
    /src
      /date.ts      # toISO, getMonday, weekdayName, etc.
      /types.ts     # DayEntry, Employee, etc.
      /constants.ts # DAY_TYPES, WEEKDAY_NAMES
    package.json    # "@tymmar/shared": "workspace:*"

// In package.json (both root and api/package.json if separate)
"dependencies": {
    "@tymmar/shared": "workspace:*"
}

// Usage
import { toISO, getMonday } from "@tymmar/shared/date";
```

**Benefits:**
- Single source of truth for types and utils
- Guaranteed consistency between frontend and backend
- Easier to test shared logic once

**Effort:** Medium (requires monorepo setup with pnpm workspaces or nx)

---

### 14. Implement Audit Logging Middleware
**Locations:** All admin-only API routes

**Current Problem:** No audit trail for admin actions

**Proposed:**
```typescript
// api/_shared/auditLog.ts
import { db } from "./db";
import { auditLogs } from "../../db/schema"; // New table

export async function logAdminAction(
    userId: string,
    action: string,
    entityType: string,
    entityId: number | null,
    details: any
) {
    await db.insert(auditLogs).values({
        actorUserId: userId,
        action,
        entityType,
        entityId,
        details: JSON.stringify(details),
        timestamp: new Date(),
    });
}

// Usage in api/_employees/delete.ts
export const deleteEmployees = async function (req: VercelRequest, res: VercelResponse) {
    const admin = await requireAdmin(req);
    const { id } = req.query;

    await db.delete(employees).where(eq(employees.id, Number(id)));
    await logAdminAction(admin.id, "DELETE_EMPLOYEE", "employee", Number(id), { id });

    return res.status(204).send();
};
```

**Benefits:**
- Compliance with audit requirements
- Debugging data integrity issues
- Accountability for sensitive operations

**Effort:** Medium (requires new table, schema migration, add to all admin routes)

---

### 15. Add Toast Notification System
**Locations:** All error/success feedback currently shown via `console.log` or inline messages

**Current Problem:** Inconsistent user feedback (sometimes `alert()`, sometimes `setError(...)`, sometimes nothing)

**Proposed:**
```typescript
// src/components/Toast.tsx
import { createContext, useContext, useState } from "react";

const ToastContext = createContext<{ show: (message: string, type: "success" | "error") => void } | null>(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState<Array<{ id: number; message: string; type: string }>>([]);

    function show(message: string, type: "success" | "error") {
        const id = Date.now();
        setToasts((t) => [...t, { id, message, type }]);
        setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
    }

    return (
        <ToastContext.Provider value={{ show }}>
            {children}
            <div className="toast-container">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast toast--${t.type}`}>{t.message}</div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext)!;

// Usage
const { show } = useToast();
try {
    await savePeriod();
    show("Week saved successfully", "success");
} catch (e) {
    show("Failed to save week", "error");
}
```

**Benefits:**
- Consistent, non-intrusive feedback
- Better UX than inline error messages
- Stackable notifications for multiple actions

**Effort:** Medium (build toast component, integrate into contexts)

---

### 16. Replace Manual State in PeriodDataContext with useReducer
**Locations:** `src/context/PeriodDataContext.tsx` (26 useState calls!)

**Current Problem:** 26+ `useState` calls make context hard to reason about, risk of stale closures

**Proposed:**
```typescript
type PeriodDataState = {
    loading: boolean;
    error: string | null;
    fromDate: Date;
    period: Period | null;
    entriesByDate: EntriesByDate;
    draftEntriesByDate: EntriesByDate;
    // ... all state
};

type Action =
    | { type: "SET_LOADING"; payload: boolean }
    | { type: "SET_PERIOD"; payload: Period }
    | { type: "UPDATE_ENTRY"; date: Date; index: number; patch: Partial<DayEntry> }
    // ... all actions

function periodDataReducer(state: PeriodDataState, action: Action): PeriodDataState {
    switch (action.type) {
        case "SET_LOADING":
            return { ...state, loading: action.payload };
        case "UPDATE_ENTRY": {
            const iso = toISO(action.date);
            const rows = [...(state.draftEntriesByDate[iso] ?? [])];
            rows[action.index] = { ...rows[action.index], ...action.patch };
            return { ...state, draftEntriesByDate: { ...state.draftEntriesByDate, [iso]: rows } };
        }
        // ...
    }
}

// In provider
const [state, dispatch] = useReducer(periodDataReducer, initialState);
```

**Benefits:**
- Predictable state updates
- Easier to test (pure reducer function)
- Time-travel debugging with Redux DevTools

**Effort:** High (requires rewriting state management logic)

---

## Summary

### Quick Wins (Immediate Impact, Low Effort)
1. Extract `LoadingSpinner` component
2. Standardize API response format
3. Extract date constants
4. Replace inline error messages with constants
5. Extract entry validation logic
6. Remove commented-out code

### High-Value Refactors (Medium Effort)
7. Extract `DayColumn` subcomponent from `WeekGrid`
11. Add Zod input validation to all API routes
12. Implement React error boundaries
14. Add audit logging for admin actions
15. Add toast notification system

### Architectural Improvements (High Effort, Long-Term)
8. Introduce React Query for data fetching
9. Extract business logic into service layer
10. Implement backend router with middleware
13. Consolidate date utilities into shared package
16. Replace useState with useReducer in `PeriodDataContext`

---

**Recommended Refactoring Roadmap:**

**Phase 1 (Sprint 1):** Items 1-6 (quick wins)
**Phase 2 (Sprint 2):** Items 12, 15 (error boundaries, toasts)
**Phase 3 (Sprint 3):** Items 7, 11 (extract components, add Zod validation)
**Phase 4 (Quarter 2):** Items 8, 9, 14 (React Query, service layer, audit logging)
**Phase 5 (Quarter 3):** Items 10, 13, 16 (backend router, shared package, useReducer)

---

**Guiding Principles:**
- **Prefer small, incremental refactors** over big rewrites
- **Add tests before refactoring** risky areas (e.g., entry calculations)
- **Keep the app working** at every commit (no broken intermediate states)
- **Deprecate, don't delete:** When changing APIs, support old format temporarily

Assumption: Team has bandwidth for ~1 refactoring item per week alongside feature work. Adjust roadmap based on team size and priorities.
