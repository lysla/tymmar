// api/week_summaries.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, between, eq, inArray } from "drizzle-orm";
import { db } from "./_shared/db";
import { employees, periods, dayEntries } from "../db/schema";
import { requireUser } from "./_shared/auth";
import { startOfWeek, endOfWeek } from "date-fns";
import { parseISO } from "date-fns";
import { getMondayISO, isDateISO, toISO } from "./_shared/_date";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const user = await requireUser(req);
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);

        if (!emp) return res.status(403).json({ error: "No employee profile" });
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

        const { from, to } = req.query as Record<string, string | undefined>;
        if (!isDateISO(from) || !isDateISO(to)) {
            return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
        }

        // Expand to full displayed weeks to match calendar grid nicely
        const fromD = parseISO(from);
        const toD = parseISO(to);
        const spanStart = startOfWeek(fromD, { weekStartsOn: 1 });
        const spanEnd = endOfWeek(toD, { weekStartsOn: 1 });

        // 1) Fetch all day entries in span, group by their Monday, then by date
        const rows = await db
            .select({
                workDate: dayEntries.workDate,
                hours: dayEntries.hours,
            })
            .from(dayEntries)
            .where(and(eq(dayEntries.employeeId, emp.id), between(dayEntries.workDate, toISO(spanStart), toISO(spanEnd))));

        // Aggregate per-week coverage: how many distinct dates in the week have > 0h
        const coverageByMonday = new Map<string, { dates: Set<string> }>();

        for (const r of rows) {
            const dateISO = String(r.workDate);
            const d = parseISO(dateISO);
            const mon = getMondayISO(d);
            const hours = Number(r.hours ?? 0);
            if (!coverageByMonday.has(mon)) coverageByMonday.set(mon, { dates: new Set() });
            if (hours > 0) coverageByMonday.get(mon)!.dates.add(dateISO);
        }

        // 2) Fetch periods for all Mondays we might care about (in span)
        // Build all candidate Mondays across the span
        const mondays: string[] = [];
        {
            let cursor = startOfWeek(spanStart, { weekStartsOn: 1 });
            const limit = 60; // safety
            let i = 0;
            while (cursor <= spanEnd && i < limit) {
                mondays.push(toISO(cursor));
                cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
                i++;
            }
        }

        const periodRows = mondays.length
            ? await db
                  .select({
                      weekStartDate: periods.weekStartDate,
                      closed: periods.closed,
                  })
                  .from(periods)
                  .where(and(eq(periods.employeeId, emp.id), inArray(periods.weekStartDate, mondays)))
            : [];

        const closedByMonday = new Map<string, boolean>();
        for (const p of periodRows) {
            closedByMonday.set(String(p.weekStartDate), Boolean(p.closed));
        }

        // Compose response
        // For each Monday in the span, return coverage + closed
        const summaries = mondays.map((mon) => {
            const cov = coverageByMonday.get(mon);
            const daysWithEntries = cov ? cov.dates.size : 0; // 0..7
            const closed = Boolean(closedByMonday.get(mon));
            return { monday: mon, daysWithEntries, closed };
        });

        return res.status(200).json({ summaries, range: { from: toISO(spanStart), to: toISO(spanEnd) } });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
