// api/get-hours.ts
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
    const day = d.getUTCDay();
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
    const dayNum = (date.getUTCDay() + 6) % 7;
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    const year = date.getUTCFullYear();
    return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

        const user = await requireUser(req);

        // find employee
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
        if (!emp) return res.status(403).json({ error: "No employee profile" });

        const { from, to } = req.query as Record<string, string | undefined>;
        if (!isDateISO(from) || !isDateISO(to)) {
            return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
        }

        // Expect a single week range; compute weekKey from 'from' (or its Monday)
        const weekStartISO = getMondayISO(from);
        const weekEndISO = addDaysISO(weekStartISO, 6);
        const weekKey = isoWeekKeyFromMonday(weekStartISO);

        // Read (or create) the period row
        let [p] = await db
            .select({
                id: periods.id,
                weekKey: periods.weekKey,
                weekStartDate: periods.weekStartDate,
                closed: periods.closed,
                totalHours: periods.totalHours,
            })
            .from(periods)
            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
            .limit(1);

        if (!p) {
            // create period if missing (open by default)
            await db.insert(periods).values({
                employeeId: emp.id,
                weekKey,
                weekStartDate: weekStartISO,
                closed: false,
            } as any);
            // re-fetch
            [p] = await db
                .select({
                    id: periods.id,
                    weekKey: periods.weekKey,
                    weekStartDate: periods.weekStartDate,
                    closed: periods.closed,
                    totalHours: periods.totalHours,
                })
                .from(periods)
                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                .limit(1);
        }

        // Fetch daily entries
        const rows = await db
            .select({
                workDate: hours.workDate,
                totalHours: hours.totalHours,
                type: hours.type,
            })
            .from(hours)
            .where(and(eq(hours.employeeId, emp.id), between(hours.workDate, weekStartISO, weekEndISO)));

        const entries: Record<string, { totalHours: number; type: string }> = {};
        for (const r of rows) {
            entries[r.workDate as string] = {
                totalHours: Number(r.totalHours ?? 0),
                type: String(r.type),
            };
        }

        return res.status(200).json({
            period: {
                weekKey: p!.weekKey,
                weekStartDate: p!.weekStartDate,
                closed: Boolean(p!.closed),
                totalHours: Number(p!.totalHours ?? 0),
            },
            entries,
            range: { from: weekStartISO, to: weekEndISO },
        });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
