// api/day_entries.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { db } from "./_shared/db";
import { employees } from "../db/schema";
import { requireUser } from "./_shared/auth";
import { getEntries, putEntries } from "./_entries";
import { Employee } from "../src/types";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        /** 👀 a user must be authenticated */
        const user = await requireUser(req);

        /** 👀 retrieve the current employee */
        const [emp]: Partial<Employee>[] = await db
            .select({ id: employees.id, settingsId: employees.settingsId })
            .from(employees)
            .where(eq(employees.userId, user.id))
            .limit(1);
        if (!emp) {
            return res.status(403).json({ error: "No employee profile" });
        }

        switch (req.method) {
            case "GET":
                return await getEntries(req, res, emp.id!);
            case "PUT":
                return await putEntries(req, res, emp.id!, emp.settingsId ?? null);
            default:
                return res.status(405).send("Method Not Allowed");
        }
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
