// api/_periods/get.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireUser } from "../_shared/auth";
import { db } from "../_shared/db";
import { employees, periods } from "../../db/schema";
import { Employee, Period } from "../../src/types";
import { and, between, eq } from "drizzle-orm";
import { isDateISO, toISO } from "../../src/helpers";

export const getPeriods = async function (req: VercelRequest, res: VercelResponse) {
    const user = await requireUser(req);
    const [emp]: Partial<Employee>[] = await db.select({ id: employees.id }).from(employees).where(eq(employees.userId, user.id)).limit(1);
    if (!emp) {
        return res.status(403).json({ error: "No employee profile" });
    }

    const { from, to } = req.query as Record<string, string>;
    if (!isDateISO(from) || !isDateISO(to)) {
        return res.status(400).json({ error: "from/to are required and must be YYYY-MM-DD" });
    }

    const startISO = toISO(from);
    const endISO = toISO(to);

    const rows = await db
        .select()
        .from(periods)
        .where(and(eq(periods.employeeId, emp.id!), between(periods.weekStartDate, startISO, endISO)))
        .orderBy(periods.weekStartDate);

    return res.status(200).json({ periods: rows as Period[], range: { from: startISO, to: endISO } });
};
