# Refactor Suggestions

## High Priority
1. **Unify serverless handler scaffolding**
   - Extract a small helper (e.g., `withMethod`) that routes based on `req.method`, automatically returns 405 for unsupported verbs, and wraps shared error logging. This prevents the repeated “fall through then 405” pattern currently present in `/api/employees`, `/api/settings`, `/api/day_entries`, and `/api/periods`.
2. **End-to-end week lifecycle tests**
   - Add an integration test (Vitest or Playwright + mocked API) that covers fetching a week, editing entries, saving, and closing. This would have caught the payload key mismatch, the missing `settingsId`, and the broken `/api/periods` contract.

## Medium Priority
1. **Context composition at the router level**
   - Instead of mounting `EmployeeProvider` inside `Dashboard`, wrap all authenticated employee routes with the provider inside `AppRouter`. This avoids accidental misuse and prepares the ground for future employee-facing pages that also need the context.
2. **Shared authenticated fetch helper**
   - Several admin pages duplicate session/token lookup logic. A typed helper (e.g., `fetchWithAuth(path, { method, body })`) in `src/helpers` would centralize Authorization headers, JSON parsing, and error normalization.
3. **Month overview accuracy**
   - `WeekNavigator` currently colors weeks using the current `periodDaysWithEntries` instead of the fetched monthly metadata. Refine the reducer so each week uses its own totals/closed flag; consider returning aggregated counts from the `/api/periods` GET handler to avoid recomputation on the client.

## Low Priority
1. **Document database workflows**
   - Add a short `docs/database.md` describing how to run Drizzle migrations locally and how RLS is expected to behave (e.g., Supabase service-role vs. anon client usage).
2. **Consolidate emoji intent comments**
   - The `👀` comments help for now, but sprinkling them everywhere makes code noisy. Consider moving repeated explanations (like “👀 ensures user is admin”) into helper names or docblocks and reserve inline comments for nuance.
3. **AI prompt transparency**
   - Surface the AI prompt and returned rationale in the UI (behind a help/info toggle) so employees understand why certain hours were suggested, aligning with the project’s “clarity over cleverness” principle.
