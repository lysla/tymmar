// api/_entries/get.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDateISO, isoWeekKeyFromMonday, toISO } from "../../src/helpers";
import { db } from "../_shared/db";
import { dayEntries, dayExpectations, periods } from "../../db/schema";
import { and, between, eq } from "drizzle-orm";
import { DayEntry, DayType, Period } from "../../src/types";

export const getEntries = async function (req: VercelRequest, res: VercelResponse, empId: number) {
    /** 👀 ensuring that bounds are being passed and are valid */
    const { from, to } = req.query as Record<string, string>;
    if (!isDateISO(from) || !isDateISO(to)) {
        return res.status(400).json({ error: "from/to are required and must be YYYY-MM-DD" });
    }

    /** 👀 normalize range to ISO */
    const startISO = toISO(from);
    const endISO = toISO(to);

    /** 👀 derive weekKey - this makes sense only if we consider start and end always containing a single full week */
    const weekKey = isoWeekKeyFromMonday(startISO);

    /** 👀 fetch period record for the week */
    let [p] = await db
        .select()
        .from(periods)
        .where(and(eq(periods.employeeId, empId), eq(periods.weekKey, weekKey)))
        .limit(1);

    /** 👀 create period if missing */
    if (!p) {
        [p] = await db
            .insert(periods)
            .values({
                employeeId: empId,
                weekKey,
                weekStartDate: startISO,
                closed: false,
            })
            .returning();
    }

    /** 👀 fetch day entries for the given range */
    const rows = await db
        .select()
        .from(dayEntries)
        .where(and(eq(dayEntries.employeeId, empId), between(dayEntries.workDate, startISO, endISO)));

    /** 👀 fetch if there is any day expectations already registered for the given range */
    const expRows = await db
        .select()
        .from(dayExpectations)
        .where(and(eq(dayExpectations.employeeId, empId), between(dayExpectations.workDate, startISO, endISO)));

    /** 👀 normalized records for the response */
    const expectationsByDate: Record<string, number> = {};
    const entriesByDate: Record<string, DayEntry[]> = {};
    const totals: Record<string, { totalHours: number; type: DayType | "mixed" }> = {};

    /** 👀 normalized hours expectations per date [[date=>hours]]  */
    for (const r of expRows) {
        expectationsByDate[String(r.workDate)] = Number(r.expectedHours ?? 0);
    }

    /** 👀 normalized entries per date [[date=>[entry]]] */
    for (const r of rows) {
        const date = String(r.workDate);

        /** 👀 if hadn't been done yet, initialize the array so data can be pushed in */
        if (!entriesByDate[date]) {
            entriesByDate[date] = [];
        }
        entriesByDate[date].push(r);

        /** 👀 if hadn't been done yet, initialize the totals for the day */
        if (!totals[date]) {
            totals[date] = { totalHours: 0, type: r.type };
        }

        /** 👀 normalized totals */
        totals[date].totalHours += Number(r.hours);
        if (totals[date].type !== r.type) {
            totals[date].type = "mixed";
        }
    }

    const totalDaysWithEntries = entriesByDate.length;

    return res.status(200).json({
        period: p as Period,
        entriesByDate,
        totals,
        expectationsByDate,
        totalDaysWithEntries,
        range: { from: startISO, to: endISO },
    });
};
