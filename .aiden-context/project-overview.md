# Tymmar Project Overview

## Purpose
Tymmar is an internal time-reporting and workforce insights tool for Elva11. Employees record weekly work, sick, and time-off hours, while administrators manage employee accounts, hour expectations, and compliance reports. The product aims to replace manual spreadsheets with a guided workflow that enforces company rules (expected hours, closed weeks) and provides AI-assisted suggestions.

## Target Users
- **Employees** – capture their expected vs. actual hours, leverage AI suggestions, monitor week-by-week status, and close weeks once accurate.
- **Administrators** – onboard employees, configure default hour templates, audit submitted weeks, close gaps through reports, and export CSV summaries for compliance.

## Core Features
- Supabase-backed authentication with employee/admin flows and route guards.
- Employee dashboard with calendar navigation, stacked weekly progress, day-entry grid, AI auto-fill, and period closing controls.
- Context providers for auth, employee profile, and period data to share state across the Vite/React app.
- Admin area (via `/admin`) for CRUD on employees and hour settings, plus analytics reports (missing periods, hours by date) with CSV export.
- Serverless API layer (Vercel) using Supabase auth + Drizzle ORM to talk to Postgres schemas (employees, settings, day_entries, periods, etc.).
- AI endpoint (`/api/ai`) powered by `@ai-sdk/openai` to normalize “fill my week” commands into structured suggestions.

## Technology Stack
- **Frontend:** Vite + React 19 with React Router, Tanstack DayPicker, Tailwind CSS (v4 via `@tailwindcss/vite`), date-fns utilities, context-based state sharing.
- **Backend:** Vercel serverless functions (`api/`), Supabase authentication (user + admin clients), Drizzle ORM over Postgres, shared helpers under `api/_shared`.
- **Tooling:** TypeScript strict mode, ESLint 9 (flat config), Nx for caching/lint orchestration, Drizzle Kit for migrations, Vercel rewrites for SPA routing.

## Current Status Snapshot
- Frontend cannot compile or render because of import mismatches, context usage bugs, and invalid TypeScript references in admin forms/settings.
- Critical API routes (`/api/employees`, `/api/settings`, `/api/day_entries`, `/api/periods`) return `405 Method Not Allowed` even on valid requests because handlers fall through after responding.
- Saving weeks and closing periods is impossible: the frontend sends the wrong payload key, never loads monthly period metadata, and the `/api/periods` route lacks GET support plus a usable PATCH contract.
- Admin panels use snake_case fields that do not exist in the TS types/DB schema, so creating or editing settings always fails.
- Documentation was previously absent; this `.aiden-context` suite now captures intent, risks, refactors, and the remediation plan.

## High-Level Roadmap
1. Stabilize routing, providers, and component wiring so the SPA boots reliably.
2. Align admin forms, helpers, and API payloads with the database schema and Supabase auth requirements.
3. Repair the period lifecycle (fetch → edit → save → close) end-to-end, including backend handlers and frontend consumers.
4. Expand automated quality gates (lint/tests) and add safety nets for AI-driven flows (validation, guardrails).
