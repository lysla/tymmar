// api/admin-delete-employees.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { inArray } from "drizzle-orm";
import { db } from "./db";
import { employees } from "../db/schema";
import { requireAdmin } from "./_auth";
import { createClient } from "@supabase/supabase-js";

const supaAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
        await requireAdmin(req);

        const ids = (req.body?.ids ?? []) as number[];
        if (!Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: "ids[] is required" });
        }

        // fetch rows to find linked auth userIds
        const rows = await db.select().from(employees).where(inArray(employees.id, ids));
        const userIds = rows.map((r) => r.userId).filter((x): x is string => Boolean(x));

        // delete linked auth users (best-effort; continue on individual errors)
        for (const uid of userIds) {
            await supaAdmin.auth.admin.deleteUser(uid).catch(() => {});
        }

        // delete employees (hours will cascade)
        await db.delete(employees).where(inArray(employees.id, ids));

        return res.status(200).json({ deletedCount: rows.length, userIdsDeleted: userIds.length });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
