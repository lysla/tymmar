// api/reports.ts
// -------------- HAVE YET TO REVIEW THIS FILE!!!
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_shared/db";
import { requireAdmin } from "./_shared/auth";
import { employees, dayEntries, dayExpectations, periods } from "../db/schema";
import { and, eq, gte, lte, lt, sql, inArray } from "drizzle-orm";

/* ---------------- CSV helper ---------------- */
function toCSV<T extends Record<string, any>>(rows: T[], headers?: string[]) {
    // UTF-8 BOM for Excel friendliness
    const BOM = "\uFEFF";
    if (!rows.length) return BOM + (headers?.join(",") ?? "");
    const cols = headers ?? Object.keys(rows[0] as any);

    const escape = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };

    const head = cols.join(",");
    const body = rows.map((r) => cols.map((c) => escape(r[c])).join(",")).join("\n");
    return BOM + head + "\n" + body;
}

/* ---------------- helpers ---------------- */
function isISO(s?: string): s is string {
    return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

function mondayISO(d: Date) {
    const day = d.getUTCDay(); // 0..6
    const diff = (day === 0 ? -6 : 1) - day;
    const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    x.setUTCDate(x.getUTCDate() + diff);
    return x.toISOString().slice(0, 10);
}

function parseBool(v?: string) {
    return (v ?? "").toLowerCase() === "true";
}

function inEmployeeSet(col: typeof dayEntries.employeeId | typeof dayExpectations.employeeId, ids: number[]) {
    if (ids.length === 0) return sql`FALSE`;
    return inArray(col, ids);
}

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
        await requireAdmin(req);

        const { report, format } = req.query as Record<string, string | undefined>;
        if (!report) return res.status(400).json({ error: "Missing ?report=" });
        const wantsCSV = (format ?? "").toLowerCase() === "csv" || req.headers.accept === "text/csv";

        if (report === "by-dates") {
            const { from, to, employeeId } = req.query as Record<string, string | undefined>;
            if (!isISO(from) || !isISO(to)) {
                return res.status(400).json({ error: "from/to must be YYYY-MM-DD" });
            }

            // 1) employees in scope
            let empWhere = sql`TRUE`;
            if (employeeId && employeeId !== "all") {
                const idNum = Number(employeeId);
                if (!Number.isInteger(idNum) || idNum <= 0) {
                    return res.status(400).json({ error: "Invalid employeeId" });
                }
                empWhere = eq(employees.id, idNum);
            }

            const emps = await db.select({ id: employees.id, name: employees.name, surname: employees.surname }).from(employees).where(empWhere);

            if (emps.length === 0) {
                if (wantsCSV) {
                    const csv = toCSV([], ["date", "employeeId", "employeeName", "expectedHours", "workHours", "sickHours", "timeOffHours", "totalHours", "extraWorkHours", "hasSick", "hasTimeOff"]);
                    res.setHeader("Content-Type", "text/csv; charset=utf-8");
                    res.setHeader("Content-Disposition", `attachment; filename="report-by-dates.csv"`);
                    return res.status(200).send(csv);
                }
                return res.status(200).json({ rows: [] });
            }

            // 2) expectation snapshots
            const expRows = await db
                .select({
                    employeeId: dayExpectations.employeeId,
                    date: dayExpectations.workDate,
                    expectedHours: dayExpectations.expectedHours,
                })
                .from(dayExpectations)
                .where(
                    and(
                        gte(dayExpectations.workDate, from!),
                        lte(dayExpectations.workDate, to!),
                        inEmployeeSet(
                            dayExpectations.employeeId,
                            emps.map((e) => e.id)
                        )
                    )
                );

            // 3) aggregated entries per (employee, date)
            const agg = await db
                .select({
                    employeeId: dayEntries.employeeId,
                    date: dayEntries.workDate,
                    workHours: sql<number>`
                        COALESCE(SUM(CASE WHEN ${dayEntries.type} = 'work' THEN ${dayEntries.hours} ELSE 0 END), 0)
                    `,
                    sickHours: sql<number>`
                        COALESCE(SUM(CASE WHEN ${dayEntries.type} = 'sick' THEN ${dayEntries.hours} ELSE 0 END), 0)
                    `,
                    timeOffHours: sql<number>`
                        COALESCE(SUM(CASE WHEN ${dayEntries.type} = 'time_off' THEN ${dayEntries.hours} ELSE 0 END), 0)
                    `,
                })
                .from(dayEntries)
                .where(
                    and(
                        gte(dayEntries.workDate, from!),
                        lte(dayEntries.workDate, to!),
                        inEmployeeSet(
                            dayEntries.employeeId,
                            emps.map((e) => e.id)
                        )
                    )
                )
                .groupBy(dayEntries.employeeId, dayEntries.workDate);

            // 4) index lookups
            const expMap = new Map<string, number>();
            for (const r of expRows) {
                expMap.set(`${r.employeeId}|${String(r.date)}`, Number(r.expectedHours ?? 0));
            }
            const aggMap = new Map<string, { work: number; sick: number; toff: number }>();
            for (const r of agg) {
                aggMap.set(`${r.employeeId}|${String(r.date)}`, {
                    work: Number(r.workHours ?? 0),
                    sick: Number(r.sickHours ?? 0),
                    toff: Number(r.timeOffHours ?? 0),
                });
            }

            // 5) date list
            const dates: string[] = [];
            {
                const start = new Date(from + "T00:00:00Z");
                const end = new Date(to + "T00:00:00Z");
                for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
                    dates.push(d.toISOString().slice(0, 10));
                }
            }

            // 6) stitch rows
            const result = emps.flatMap((e) =>
                dates.map((date) => {
                    const aggKey = `${e.id}|${date}`;
                    const a = aggMap.get(aggKey) ?? { work: 0, sick: 0, toff: 0 };
                    const expected = expMap.get(aggKey) ?? 0;
                    const total = a.work + a.sick + a.toff;
                    const extraWork = Math.max(0, a.work - expected);
                    return {
                        employeeId: e.id,
                        date,
                        employeeName: `${e.surname} ${e.name}`,
                        expectedHours: expected,
                        workHours: a.work,
                        sickHours: a.sick,
                        timeOffHours: a.toff,
                        totalHours: total,
                        extraWorkHours: extraWork,
                        hasSick: a.sick > 0,
                        hasTimeOff: a.toff > 0,
                    };
                })
            );

            result.sort((a, b) => {
                if (a.date !== b.date) return a.date < b.date ? -1 : 1;
                if (a.employeeName !== b.employeeName) return a.employeeName < b.employeeName ? -1 : 1;
                return 0;
            });

            if (wantsCSV) {
                const csv = toCSV(result, ["date", "employeeId", "employeeName", "expectedHours", "workHours", "sickHours", "timeOffHours", "totalHours", "extraWorkHours", "hasSick", "hasTimeOff"]);
                res.setHeader("Content-Type", "text/csv; charset=utf-8");
                res.setHeader("Content-Disposition", `attachment; filename="report-by-dates.csv"`);
                return res.status(200).send(csv);
            }

            return res.status(200).json({ rows: result });
        }

        if (report === "missing-periods") {
            const { before, onlyActive } = req.query as Record<string, string | undefined>;
            const refMonday = isISO(before) ? before! : mondayISO(new Date());
            const filterActive = parseBool(onlyActive);

            const base = await db
                .select({
                    employeeId: periods.employeeId,
                    weekKey: periods.weekKey,
                    weekStartDate: periods.weekStartDate,
                    closed: periods.closed,
                    totalHours: periods.totalHours,
                    empName: employees.name,
                    empSurname: employees.surname,
                    empStart: employees.startDate,
                    empEnd: employees.endDate,
                })
                .from(periods)
                .innerJoin(employees, eq(employees.id, periods.employeeId))
                .where(and(eq(periods.closed, false), lt(periods.weekStartDate, refMonday)))
                .orderBy(periods.weekStartDate, employees.surname, employees.name);

            const rows = (
                filterActive
                    ? base.filter((r) => {
                          const ws = new Date(r.weekStartDate);
                          const we = new Date(ws);
                          we.setUTCDate(ws.getUTCDate() + 6);
                          const start = r.empStart ? new Date(r.empStart) : null;
                          const end = r.empEnd ? new Date(r.empEnd) : null;
                          const afterStart = !start || we >= start;
                          const beforeEnd = !end || ws <= end;
                          return afterStart && beforeEnd;
                      })
                    : base
            ).map((r) => ({
                employeeId: r.employeeId,
                employeeName: `${r.empSurname} ${r.empName}`,
                weekKey: r.weekKey,
                weekStartDate: String(r.weekStartDate),
                totalHours: Number(r.totalHours ?? 0),
            }));

            if (wantsCSV) {
                const csv = toCSV(rows, ["employeeId", "employeeName", "weekKey", "weekStartDate", "totalHours"]);
                res.setHeader("Content-Type", "text/csv; charset=utf-8");
                res.setHeader("Content-Disposition", `attachment; filename="report-missing-periods.csv"`);
                return res.status(200).send(csv);
            }

            return res.status(200).json({ refMonday, count: rows.length, rows });
        }

        return res.status(400).json({ error: "Unsupported report type" });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
