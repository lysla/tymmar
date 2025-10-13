// api/hours.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, between, eq } from "drizzle-orm";
import { db } from "./_db";
import { employees, hours, periods } from "../db/schema";
import { requireUser } from "./_auth";

type DayType = "work" | "sick" | "time_off";
type UpsertEntry = { date: string; totalHours: number; type?: DayType };

/* ---------------- helpers ---------------- */
function isDateISO(s?: string): s is string {
    return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}
function isValidType(t?: string): t is DayType {
    return !t || t === "work" || t === "sick" || t === "time_off";
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

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const user = await requireUser(req);

        // find employee
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
        if (!emp) return res.status(403).json({ error: "No employee profile" });

        /* ---------- GET: read the week ---------- */
        if (req.method === "GET") {
            const { from, to } = req.query as Record<string, string | undefined>;
            if (!isDateISO(from) || !isDateISO(to)) {
                return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
            }

            const weekStartISO = getMondayISO(from);
            const weekEndISO = addDaysISO(weekStartISO, 6);
            const weekKey = isoWeekKeyFromMonday(weekStartISO);

            // ensure period exists (open by default)
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
                await db.insert(periods).values({
                    employeeId: emp.id,
                    weekKey,
                    weekStartDate: weekStartISO,
                    closed: false,
                } as any);
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

            // fetch daily entries
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
        }

        /* ---------- PUT: upsert hours (blocked if closed) ---------- */
        if (req.method === "PUT") {
            const body = req.body ?? {};
            let entries: UpsertEntry[] = [];

            if (Array.isArray(body.entries)) {
                entries = body.entries;
            } else if (isDateISO(body.date)) {
                entries = [{ date: body.date, totalHours: body.totalHours, type: body.type }];
            } else {
                return res.status(400).json({ error: "Provide {entries:[]}|{date,totalHours}" });
            }

            // validate
            for (const e of entries) {
                if (!isDateISO(e.date)) return res.status(400).json({ error: `Invalid date: ${e.date}` });
                const th = Number(e.totalHours);
                if (!Number.isFinite(th) || th < 0 || th > 24) {
                    return res.status(400).json({ error: `Invalid totalHours for ${e.date}` });
                }
                if (!isValidType(e.type)) return res.status(400).json({ error: `Invalid type for ${e.date}` });
            }

            // group by week
            const groups = new Map<string, { weekKey: string; weekStart: string; items: UpsertEntry[] }>();
            for (const e of entries) {
                const mondayISO = getMondayISO(e.date);
                if (!groups.has(mondayISO)) {
                    groups.set(mondayISO, {
                        weekKey: isoWeekKeyFromMonday(mondayISO),
                        weekStart: mondayISO,
                        items: [],
                    });
                }
                groups.get(mondayISO)!.items.push(e);
            }

            await db.transaction(async (tx) => {
                for (const [, group] of groups) {
                    const { weekKey, weekStart, items } = group;
                    const weekEnd = addDaysISO(weekStart, 6);

                    // ensure period exists
                    let [period] = await tx
                        .select({ id: periods.id, closed: periods.closed })
                        .from(periods)
                        .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                        .limit(1);

                    if (!period) {
                        await tx.insert(periods).values({
                            employeeId: emp.id,
                            weekKey,
                            weekStartDate: weekStart,
                            closed: false,
                        } as any);
                        [period] = await tx
                            .select({ id: periods.id, closed: periods.closed })
                            .from(periods)
                            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                            .limit(1);
                    }

                    if (period?.closed) {
                        throw Object.assign(new Error(`Week ${weekKey} is closed`), { status: 409 });
                    }

                    // upsert each day
                    for (const e of items) {
                        const th = Number(e.totalHours);
                        await tx
                            .insert(hours)
                            .values({
                                employeeId: emp.id,
                                workDate: e.date,
                                totalHours: th.toFixed(2),
                                type: (e.type ?? "work") as any,
                                updatedAt: new Date(),
                            } as any)
                            .onConflictDoUpdate({
                                target: [hours.employeeId, hours.workDate],
                                set: {
                                    totalHours: th.toFixed(2),
                                    type: (e.type ?? "work") as any,
                                    updatedAt: new Date(),
                                },
                            });
                    }

                    // recompute weekly total
                    const weekRows = await tx
                        .select({ totalHours: hours.totalHours })
                        .from(hours)
                        .where(and(eq(hours.employeeId, emp.id), between(hours.workDate, weekStart, weekEnd)));

                    const weekSum = weekRows.reduce((acc, r) => acc + Number(r.totalHours ?? 0), 0);
                    await tx
                        .update(periods)
                        .set({ totalHours: weekSum.toFixed(2), updatedAt: new Date() })
                        .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)));
                }
            });

            return res.status(200).json({ ok: true, count: entries.length });
        }

        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
