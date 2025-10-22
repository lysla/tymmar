// api/periods.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, between, eq } from "drizzle-orm";
import { db } from "./_shared/db";
import { employees, periods, dayEntries } from "../db/schema"; // ⬅️ UPDATED: use dayEntries
import { requireUser } from "./_shared/auth";
import { addDaysISO, getMondayISO, isDateISO, isoWeekKeyFromMonday } from "./_shared/_date";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "PATCH") return res.status(405).send("Method Not Allowed");

        const user = await requireUser(req);

        // find employee
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);

        if (!emp) return res.status(403).json({ error: "No employee profile" });

        const body = req.body ?? {};
        const action = String(body.action || "").toLowerCase(); // "close" | "reopen"

        if (action !== "close" && action !== "reopen") {
            return res.status(400).json({ error: "Invalid action. Use 'close' or 'reopen'." });
        }

        let weekKey: string | undefined;
        let weekStartISO: string | undefined;

        if (typeof body.weekKey === "string" && /^(\d{4})-W(\d{2})$/.test(body.weekKey)) {
            weekKey = body.weekKey;
            // If the period doesn't exist and only weekKey is provided, we need weekStart to create it (for reopen).
        } else if (isDateISO(body.weekStart)) {
            weekStartISO = getMondayISO(body.weekStart);
            weekKey = isoWeekKeyFromMonday(weekStartISO);
        } else {
            return res.status(400).json({ error: "Provide { weekKey: 'YYYY-Www' } or { weekStart: 'YYYY-MM-DD' }" });
        }

        await db.transaction(async (tx) => {
            // Fetch or create period (only create if action is reopen and we have weekStart)
            let [p] = await tx
                .select({
                    id: periods.id,
                    weekStartDate: periods.weekStartDate,
                    closed: periods.closed,
                })
                .from(periods)
                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)))
                .limit(1);

            if (!p && action === "reopen") {
                if (!weekStartISO) {
                    // If caller only provided weekKey (no weekStart) and period is missing, we can't create it.
                    throw Object.assign(new Error("Missing weekStart for a new period"), { status: 400 });
                }
                await tx.insert(periods).values({
                    employeeId: emp.id,
                    weekKey: weekKey!,
                    weekStartDate: weekStartISO!,
                    closed: false,
                } as any);
                [p] = await tx
                    .select({
                        id: periods.id,
                        weekStartDate: periods.weekStartDate,
                        closed: periods.closed,
                    })
                    .from(periods)
                    .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)))
                    .limit(1);
            }

            if (!p) {
                // For "close", if period isn't there, we can't close it.
                throw Object.assign(new Error("Period not found"), { status: 404 });
            }

            const weekStart = p.weekStartDate as string;
            const weekEnd = addDaysISO(weekStart, 6);

            // --- recompute weekly total from day entries (sum of entry hours in the week) ---
            // Adjust field names below if your schema differs:
            // - dayEntries.date  -> your date column
            // - dayEntries.hours -> your hours column
            const rows = await tx
                .select({ h: dayEntries.hours }) // ⬅️ if your column is named differently, change here
                .from(dayEntries) // ⬅️ table now dayEntries
                .where(
                    and(
                        eq(dayEntries.employeeId, emp.id),
                        between(dayEntries.workDate, weekStart, weekEnd) // ⬅️ date column range
                    )
                );

            const total = rows.reduce((acc, r) => acc + Number(r.h ?? 0), 0);

            const now = new Date();

            if (action === "close") {
                await tx
                    .update(periods)
                    .set({ totalHours: total.toFixed(2), closed: true, closedAt: now, updatedAt: now })
                    .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)));
            } else {
                // reopen
                await tx
                    .update(periods)
                    .set({ totalHours: total.toFixed(2), closed: false, closedAt: null, updatedAt: now })
                    .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)));
            }
        });

        return res.status(200).json({ ok: true, weekKey });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
