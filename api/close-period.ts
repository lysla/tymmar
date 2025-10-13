// api/close-period.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, between, eq } from "drizzle-orm";
import { db } from "./db";
import { employees, hours, periods } from "../db/schema";
import { requireUser } from "./_auth";

function isDateISO(s?: string): s is string {
    return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function getMondayISO(dateISO: string): string {
    const d = new Date(dateISO + "T00:00:00Z");
    const day = d.getUTCDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, n: number): string {
    const d = new Date(dateISO + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

function isoWeekKeyFromMonday(mondayISO: string): string {
    const d = new Date(mondayISO + "T00:00:00Z");
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    const year = date.getUTCFullYear();
    return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const user = await requireUser(req);

        // find employee
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
        if (!emp) return res.status(403).json({ error: "No employee profile" });

        const body = req.body ?? {};
        let weekKey: string | undefined;
        let weekStartISO: string | undefined;

        if (typeof body.weekKey === "string" && /^(\d{4})-W(\d{2})$/.test(body.weekKey)) {
            weekKey = body.weekKey;
            // If only weekKey is provided, infer Monday via a small trick:
            // We’ll look for an existing period to read weekStartDate; if none, we require weekStart.
        } else if (isDateISO(body.weekStart)) {
            weekStartISO = getMondayISO(body.weekStart);
            weekKey = isoWeekKeyFromMonday(weekStartISO);
        } else {
            return res.status(400).json({ error: "Provide { weekKey: 'YYYY-Www' } or { weekStart: 'YYYY-MM-DD' }" });
        }

        await db.transaction(async (tx) => {
            // Find or create the period
            let [p] = await tx
                .select({
                    id: periods.id,
                    weekStartDate: periods.weekStartDate,
                })
                .from(periods)
                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)))
                .limit(1);

            // If we have only weekKey and no period yet, we need weekStart to create it
            if (!p && !weekStartISO) {
                return res.status(400).json({ error: "Missing weekStart for a new period" });
            }

            if (!p) {
                // create it
                await tx.insert(periods).values({
                    employeeId: emp.id,
                    weekKey: weekKey!,
                    weekStartDate: weekStartISO!,
                    closed: false,
                } as any);
                // re-fetch
                [p] = await tx
                    .select({ id: periods.id, weekStartDate: periods.weekStartDate })
                    .from(periods)
                    .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)))
                    .limit(1);
            }

            const weekStart = p!.weekStartDate as string;
            const weekEnd = addDaysISO(weekStart, 6);

            // recompute total from hours
            const rows = await tx
                .select({ totalHours: hours.totalHours })
                .from(hours)
                .where(and(eq(hours.employeeId, emp.id), between(hours.workDate, weekStart, weekEnd)));

            const total = rows.reduce((acc, r) => acc + Number(r.totalHours ?? 0), 0);

            // mark closed
            const now = new Date();
            await tx
                .update(periods)
                .set({ totalHours: total.toFixed(2), closed: true, closedAt: now, updatedAt: now })
                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey!)));
        });

        return res.status(200).json({ ok: true, weekKey });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
