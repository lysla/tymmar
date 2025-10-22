// api/_employees/delete.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { employees } from "../../db/schema";
import { inArray } from "drizzle-orm";
import { supadmin } from "../_shared/supabase";

export const deleteEmployees = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can delete employees */
    const adminUser = await requireAdmin(req);

    const ids = (req.body?.ids ?? []) as number[];
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids[] (positive integers) is required" });
    }

    /** 👀 retrieve the employees to delete */
    const rows = await db.select().from(employees).where(inArray(employees.id, ids));
    /** 👀 retrieve the users to delete */
    const userIds = rows.map((r) => r.userId).filter(Boolean) as string[];

    /** 👀 prevent deleting your own employee row */
    const self = rows.find((r) => r.userId && r.userId === adminUser.id);
    if (self) {
        return res.status(400).json({ error: "You cannot delete your own employee record" });
    }

    /** 👀 delete employees first, and then their users */
    await db.delete(employees).where(inArray(employees.id, ids));
    await Promise.allSettled(userIds.map((uid) => supadmin.auth.admin.deleteUser(uid)));

    return res.status(200).json({});
};
