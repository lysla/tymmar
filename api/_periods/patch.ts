// api/_periods/patch.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_shared/auth";
import { db } from "../_shared/db";
import { employees, periods } from "../../db/schema";
import { Employee, Period, PeriodAction } from "../../src/types";
import { and, eq } from "drizzle-orm";

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
        /** 👀 fetch the period if it exists already */
        const [p] = await tx
            .select()
            .from(periods)
            .where(and(eq(periods.employeeId, emp.id!), eq(periods.weekKey, periodData.weekKey!)))
            .limit(1);

        if (!p) {
            return res.status(404).json({ error: "Period to patch not found." });
        }

        /** 👀 if period exists i update it with the given action */
        const now = new Date();
        const closed = action === "close";
        await tx
            .update(periods)
            .set({
                closed,
                closedAt: closed ? now : null,
                updatedAt: now,
            })
            .where(and(eq(periods.employeeId, emp.id!), eq(periods.weekKey, periodData.weekKey!)));
    });

    return res.status(200).json({});
};
