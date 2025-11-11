# Project Overview

## What is Tymmar?

Tymmar is a **time-tracking and timesheet management system** designed as a personal professional-growth project. It enables employees to log their daily work hours on a weekly basis, while administrators manage employee profiles, work-hour settings, and generate reports.

The system uses **weekly periods** as the primary organizational unit. Employees fill out time entries for each day of the week, and once complete, periods can be "closed" to prevent further edits—creating an audit trail for timesheets.

### Core Purpose

- **For Employees:** Log daily hours worked, sick time, and time off across a weekly calendar view
- **For Administrators:** Manage employee profiles, configure expected work hours per weekday, generate reports, and oversee period closures
- **For Organizations:** Track time allocation, monitor expected vs. actual hours, and export data for payroll or project accounting

---

## Key Features

### 1. Weekly Time Entry System
- Employees view and edit time entries in a **7-day grid** (Monday–Sunday)
- Each day can contain multiple entries with different types:
  - **Work:** Standard working hours
  - **Sick:** Sick leave hours
  - **Time Off:** Vacation or personal time
- Visual progress bars show completion percentage against expected hours per day
- Calendar navigation allows jumping to any week within employment date bounds

### 2. AI-Powered Entry Suggestions
- Integrated **OpenAI GPT-4o-mini** assistant helps fill out timesheets via natural language
- Example commands:
  - "Fill a normal week"
  - "I was sick on Monday and Tuesday"
  - "I worked 10 hours on Friday"
- AI respects expected hours per day and employee employment dates
- Suggestions can be reviewed and edited before saving

### 3. Period Management
- Each week is represented as a **Period** record with:
  - Total hours logged
  - Expected hours for that week
  - Closed/open status
- **Closing a period** locks it from further edits (typically done after approval)
- **Reopening** is allowed but tracked via `closedAt` timestamp
- Monthly calendar view shows all periods with visual indicators for closed/open status

### 4. Flexible Work Hour Configuration
- Administrators define **Settings** profiles with expected hours per weekday
- Default setting applies to all employees, or custom settings can be assigned per employee
- Supports non-standard schedules (e.g., 4-day work weeks, weekend shifts)
- Expected hours are **snapshotted** to `day_expectations` table when entries are saved, preserving historical expectations even if settings change later

### 5. Employee Lifecycle Management
- Employees have `startDate` and `endDate` fields to define employment periods
- Time entries outside employment bounds are disabled in the UI
- Supports tracking contractors, temporary staff, or phased employment
- Employee records link to Supabase Auth users via `userId`

### 6. Admin Dashboard & Reports
- **Employee Management:** Create, edit, delete employee profiles
- **Settings Management:** Configure multiple work-hour profiles
- **Reports:**
  - **By Dates:** Daily breakdown of hours by type (work/sick/time_off) across a date range, exportable as CSV
  - **Missing Periods:** Lists unclosed weeks before a reference date to identify incomplete timesheets
- All reports support filtering by employee and CSV export for Excel compatibility

### 7. Authentication & Authorization
- **Supabase Auth** handles user sign-in with email/password
- Two user roles:
  - **Employee:** Can view/edit their own time entries
  - **Admin:** Full access to all employees, settings, and reports (identified via `app_metadata.is_admin`)
- JWT tokens secure all API requests
- Row-level security (RLS) enabled on all database tables

### 8. Project Tracking (In Progress)
- Schema includes `projects` and `employee_projects` tables for associating work hours with projects
- Time entries can reference a `projectId` (field exists but UI is disabled with "— Project (soon) —" placeholder)
- Marked for future implementation (schema comment: "to review later")

---

## Primary User Flows

### Employee Flow
1. **Sign In** → Dashboard loads with current week
2. **View Week:** See 7-day grid with expected hours per day
3. **Add/Edit Entries:** Click "+ Entry" on any day, enter hours and type
4. **AI Assist (Optional):** Type natural language command, apply AI suggestions
5. **Save Period:** Click "Save" to persist changes (button disabled when no unsaved edits)
6. **Navigate Weeks:** Use calendar picker to jump to past/future weeks
7. **Review Closed Periods:** View historical data (read-only for closed weeks)

### Admin Flow
1. **Sign In** → Admin dashboard with employee list
2. **Manage Employees:** Add new employees, edit profiles, set employment dates and assigned settings
3. **Manage Settings:** Create custom work-hour profiles (e.g., part-time schedules)
4. **Generate Reports:** Select report type, date range, and employee filter; download CSV
5. **Monitor Periods:** Use "Missing Periods" report to identify unclosed timesheets

---

## Technology Stack

### Frontend
- **React 19** with **React Router 7** for routing
- **Vite** as build tool and dev server
- **TailwindCSS** for styling
- **date-fns** for date manipulation
- **react-day-picker** for calendar UI
- Hosted on **Vercel**

### Backend
- **Vercel Serverless Functions** (Node.js runtime)
- **Drizzle ORM** for database access
- **PostgreSQL** via **Supabase**
- **Supabase Auth** for authentication
- **Vercel AI SDK** with **OpenAI** for AI features

### Database
- PostgreSQL hosted on Supabase
- Row-level security (RLS) enabled
- Tables: `employees`, `settings`, `day_entries`, `day_expectations`, `periods`, `projects`, `employee_projects`
- Database view: `v_employees` (joins employee data with Supabase Auth emails)

---

## Current Limitations & Known Gaps

1. **Project Tracking:** Schema exists but UI is disabled—not yet functional
2. **Notes Field:** `day_entries.note` column exists but input is commented out in UI
3. **Employee-Specific Settings:** TODO comment indicates `/api/settings` endpoint doesn't yet fetch employee-specific settings (line 42 in api/_settings/get.ts)
4. **No Tests:** No automated test suite present
5. **Reports File Unreviewed:** api/reports.ts has comment "HAVE YET TO REVIEW THIS FILE!!!" (line 2)

---

## Summary

Tymmar is a **functional, production-ready timesheet system** with a clean UI, robust weekly period management, and AI-powered convenience features. It excels at tracking employee time across different entry types, enforcing expected hour targets, and providing administrative oversight via reports.

The codebase demonstrates **modern web development practices** (React 19, serverless architecture, type safety with TypeScript, AI integration) while maintaining clarity and maintainability. Current gaps (project tracking, notes, tests) represent planned future work rather than blockers to core functionality.

Assumption: The project is intended for small-to-medium organizations (under 100 employees) given the current reporting capabilities and UI design.
