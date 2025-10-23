// api/_periods/patch.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_shared/auth";
import { db } from "../_shared/db";
import { dayEntries, employees, periods } from "../../db/schema";
import { Employee, Period, PeriodAction } from "../../src/types";
import { and, between, eq } from "drizzle-orm";
import { addDaysISO, toISO } from "../../src/helpers";

export const patchPeriods = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 a user must be authenticated */
    const user = await requireUser(req);

    /** 👀 retrieve the current employee */
    const [emp]: Partial<Employee>[] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
    if (!emp) {
        return res.status(403).json({ error: "No employee profile" });
    }

    /** 👀 retrieve the passed entry [period=>data,action=>value] */
    const periodData: Partial<Period> = req.body.period;
    const action: PeriodAction = req.body.action;

    if (action !== "close" && action !== "reopen") {
        return res.status(400).json({ error: "Invalid action. Use 'close' or 'reopen'." });
    }

    await db.transaction(async (tx) => {
        /** 👀 i need the range to retrive the entries */
        const startISO = toISO(periodData.weekStartDate!);
        /** 👀 this only works if the period is always a week */
        const endISO = addDaysISO(startISO, 6);
        /** 👀 retrieve the new total to set into the period */
        const rows = await tx
            .select()
            .from(dayEntries)
            .where(and(eq(dayEntries.employeeId, emp.id!), between(dayEntries.workDate, startISO, endISO)));
        const total = rows.reduce((acc, r) => acc + Number(r.hours ?? 0), 0);

        /** 👀 fetch the period if it exists already */
        let [p] = await tx
            .select()
            .from(periods)
            .where(and(eq(periods.employeeId, emp.id!), eq(periods.weekKey, periodData.weekKey!)))
            .limit(1);

        if (p) {
            /** 👀 if period exists i update it with the given action, setting new totals too */
            const now = new Date();
            const closed = action === "close";
            await tx
                .update(periods)
                .set({
                    totalHours: total.toFixed(2),
                    closed,
                    closedAt: closed ? now : null,
                    updatedAt: now,
                })
                .where(and(eq(periods.employeeId, emp.id!), eq(periods.weekKey, periodData.weekKey!)));
        } else if (action === "reopen") {
            /** 👀 if period doesn't exists on a reopen request, create it open */
            [p] = await tx
                .insert(periods)
                .values({
                    employeeId: emp.id!,
                    weekKey: periodData.weekKey as string,
                    weekStartDate: periodData.weekStartDate as string,
                    closed: false,
                    totalHours: total.toFixed(2),
                })
                .returning();
        }
    });

    return res.status(200).json({});
};
