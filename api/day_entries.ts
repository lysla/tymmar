// api/day_entries.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { and, between, eq, inArray } from "drizzle-orm";
import { db } from "./_db";
import { employees, periods, dayEntries } from "../db/schema";
import { requireUser } from "./_auth";
import { addDaysISO, getMondayISO, isDateISO, isoWeekKeyFromMonday, isValidType } from "./_date";
import { DayEntry, DayType } from "../src/types";

type ReplaceDayEntriesBody = {
    mode: "replace-day-entries";
    entriesByDate: Record<string, DayEntry[]>;
};

type ReplaceTotalsBody = {
    mode: "replace-totals";
    entries: { date: string; totalHours: number; type?: DayType }[];
};

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const user = await requireUser(req);

        // find employee
        const [emp] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
        if (!emp) return res.status(403).json({ error: "No employee profile" });

        /* ---------- GET: read week (period + raw rows + totals) ---------- */
        if (req.method === "GET") {
            const { from, to } = req.query as Record<string, string | undefined>;
            if (!isDateISO(from) || !isDateISO(to)) {
                return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
            }

            const weekStartISO = getMondayISO(from);
            const weekEndISO = addDaysISO(weekStartISO, 6);
            const weekKey = isoWeekKeyFromMonday(weekStartISO);

            // ensure/open period
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

            // fetch all day_entries in the week
            const rows = await db
                .select({
                    id: dayEntries.id,
                    workDate: dayEntries.workDate,
                    type: dayEntries.type,
                    hours: dayEntries.hours,
                    projectId: dayEntries.projectId,
                    note: dayEntries.note,
                })
                .from(dayEntries)
                .where(and(eq(dayEntries.employeeId, emp.id), between(dayEntries.workDate, weekStartISO, weekEndISO)));

            const entriesByDate: Record<string, DayEntry[]> = {};
            const totals: Record<string, { totalHours: number; type: DayType | "mixed" }> = {};

            for (const r of rows) {
                const date = String(r.workDate);
                const hours = Number(r.hours ?? 0);
                const type = String(r.type) as DayType;

                if (!entriesByDate[date]) entriesByDate[date] = [];
                entriesByDate[date].push({
                    id: Number(r.id),
                    date,
                    type,
                    hours,
                    projectId: r.projectId ? Number(r.projectId) : null,
                    note: r.note ?? null,
                });

                if (!totals[date]) totals[date] = { totalHours: 0, type };
                totals[date].totalHours += hours;
                if (totals[date].type !== type) totals[date].type = "mixed";
            }

            const weekSum = Object.values(totals).reduce((acc, t) => acc + Number(t.totalHours || 0), 0);

            return res.status(200).json({
                period: {
                    weekKey: p!.weekKey,
                    weekStartDate: p!.weekStartDate,
                    closed: Boolean(p!.closed),
                    totalHours: Number(p!.totalHours ?? weekSum),
                },
                entriesByDate,
                totals,
                range: { from: weekStartISO, to: weekEndISO },
            });
        }

        /* ---------- PUT mode A: replace-day-entries (atomic per day) ---------- */
        if (req.method === "PUT") {
            const body = (req.body ?? {}) as ReplaceDayEntriesBody | ReplaceTotalsBody;

            // A) replace-day-entries
            if (body.mode === "replace-day-entries") {
                const map = body.entriesByDate || {};
                const allDates = Object.keys(map);
                if (allDates.length === 0) {
                    return res.status(400).json({ error: "entriesByDate is empty" });
                }
                for (const date of allDates) {
                    if (!isDateISO(date)) return res.status(400).json({ error: `Invalid date: ${date}` });
                    for (const row of map[date] ?? []) {
                        if (!isValidType(row.type)) return res.status(400).json({ error: `Invalid type for ${date}` });
                        const h = Number(row.hours);
                        if (!Number.isFinite(h) || h < 0 || h > 24) {
                            return res.status(400).json({ error: `Invalid hours for ${date}` });
                        }
                    }
                }

                // group by week
                const groups = new Map<string, { weekKey: string; weekStart: string; dates: string[] }>();
                for (const d of allDates) {
                    const mondayISO = getMondayISO(d);
                    if (!groups.has(mondayISO)) {
                        groups.set(mondayISO, {
                            weekKey: isoWeekKeyFromMonday(mondayISO),
                            weekStart: mondayISO,
                            dates: [],
                        });
                    }
                    groups.get(mondayISO)!.dates.push(d);
                }

                await db.transaction(async (tx) => {
                    for (const [, group] of groups) {
                        const { weekKey, weekStart, dates } = group;
                        const weekEnd = addDaysISO(weekStart, 6);

                        // ensure period exists
                        let [periodRow] = await tx
                            .select({ id: periods.id, closed: periods.closed })
                            .from(periods)
                            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                            .limit(1);

                        if (!periodRow) {
                            await tx.insert(periods).values({
                                employeeId: emp.id,
                                weekKey,
                                weekStartDate: weekStart,
                                closed: false,
                            } as any);
                            [periodRow] = await tx
                                .select({ id: periods.id, closed: periods.closed })
                                .from(periods)
                                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                                .limit(1);
                        }

                        if (periodRow?.closed) {
                            throw Object.assign(new Error(`Week ${weekKey} is closed`), { status: 409 });
                        }

                        // delete existing rows for these dates
                        await tx.delete(dayEntries).where(and(eq(dayEntries.employeeId, emp.id), inArray(dayEntries.workDate, dates as any)));

                        // insert new rows
                        for (const d of dates) {
                            const rowsForDate = map[d] ?? [];
                            for (const r of rowsForDate) {
                                const h = Number(r.hours);
                                if (h === 0) continue; // ignore explicit zero-rows
                                await tx.insert(dayEntries).values({
                                    employeeId: emp.id,
                                    workDate: d,
                                    type: r.type as any,
                                    projectId: r.projectId ?? null,
                                    hours: h.toFixed(2),
                                    note: r.note ?? null,
                                    updatedAt: new Date(),
                                } as any);
                            }
                        }

                        // recompute weekly total
                        const weekRows = await tx
                            .select({ hours: dayEntries.hours })
                            .from(dayEntries)
                            .where(and(eq(dayEntries.employeeId, emp.id), between(dayEntries.workDate, weekStart, weekEnd)));

                        const weekSum = weekRows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
                        await tx
                            .update(periods)
                            .set({ totalHours: weekSum.toFixed(2), updatedAt: new Date() })
                            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)));
                    }
                });

                return res.status(200).json({ ok: true, dates: allDates.length });
            }

            // B) legacy: replace-totals (kept for AI/compat)
            if (body.mode === "replace-totals") {
                const list = body.entries || [];
                if (list.length === 0) return res.status(400).json({ error: "Provide entries[]" });

                for (const e of list) {
                    if (!isDateISO(e.date)) return res.status(400).json({ error: `Invalid date: ${e.date}` });
                    const th = Number(e.totalHours);
                    if (!Number.isFinite(th) || th < 0 || th > 24) {
                        return res.status(400).json({ error: `Invalid totalHours for ${e.date}` });
                    }
                    if (e.type && !isValidType(e.type)) return res.status(400).json({ error: `Invalid type for ${e.date}` });
                }

                // group by week
                const groups = new Map<string, { weekKey: string; weekStart: string; items: typeof list }>();
                for (const e of list) {
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
                        let [periodRow] = await tx
                            .select({ id: periods.id, closed: periods.closed })
                            .from(periods)
                            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                            .limit(1);

                        if (!periodRow) {
                            await tx.insert(periods).values({
                                employeeId: emp.id,
                                weekKey,
                                weekStartDate: weekStart,
                                closed: false,
                            } as any);
                            [periodRow] = await tx
                                .select({ id: periods.id, closed: periods.closed })
                                .from(periods)
                                .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)))
                                .limit(1);
                        }
                        if (periodRow?.closed) {
                            throw Object.assign(new Error(`Week ${weekKey} is closed`), { status: 409 });
                        }

                        // For each date: delete existing, insert a single summed row
                        const dates = items.map((i) => i.date);
                        await tx.delete(dayEntries).where(and(eq(dayEntries.employeeId, emp.id), inArray(dayEntries.workDate, dates as any)));

                        for (const e of items) {
                            const th = Number(e.totalHours);
                            if (th === 0) continue;
                            await tx.insert(dayEntries).values({
                                employeeId: emp.id,
                                workDate: e.date,
                                type: (e.type ?? "work") as any,
                                projectId: null,
                                hours: th.toFixed(2),
                                note: null,
                                updatedAt: new Date(),
                            } as any);
                        }

                        // recompute weekly total
                        const weekRows = await tx
                            .select({ hours: dayEntries.hours })
                            .from(dayEntries)
                            .where(and(eq(dayEntries.employeeId, emp.id), between(dayEntries.workDate, weekStart, weekEnd)));
                        const weekSum = weekRows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);
                        await tx
                            .update(periods)
                            .set({ totalHours: weekSum.toFixed(2), updatedAt: new Date() })
                            .where(and(eq(periods.employeeId, emp.id), eq(periods.weekKey, weekKey)));
                    }
                });

                return res.status(200).json({ ok: true, count: list.length });
            }

            return res.status(400).json({ error: "Unsupported body.mode" });
        }

        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
