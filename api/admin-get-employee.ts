export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { employees } from "../db/schema";
import { requireAdmin } from "./_auth";
import { eq } from "drizzle-orm";

const supaAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
        await requireAdmin(req);

        const id = Number(req.query.id);
        if (!id) return res.status(400).json({ error: "Missing id" });

        const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: "Not found" });

        let email = "";
        if (row.userId) {
            const u = await supaAdmin.auth.admin.getUserById(row.userId);
            email = u.data.user?.email ?? "";
        }

        return res.status(200).json({ id: row.id, name: row.name, surname: row.surname, email, userId: row.userId });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
