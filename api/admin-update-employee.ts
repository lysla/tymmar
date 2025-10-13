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
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
        await requireAdmin(req);

        const { id, name, surname, email, password } = req.body ?? {};
        if (!id || !name?.trim() || !surname?.trim() || !email?.trim()) {
            return res.status(400).json({ error: "Missing fields" });
        }

        // find employee
        const rows = await db
            .select()
            .from(employees)
            .where(eq(employees.id, Number(id)))
            .limit(1);
        const row = rows[0];
        if (!row) return res.status(404).json({ error: "Not found" });

        // update auth user (email / password) if there is a linked user
        if (row.userId) {
            const updates: { email?: string; password?: string } = {};
            updates.email = email.trim();
            if (password?.trim()) updates.password = password.trim();
            const { error } = await supaAdmin.auth.admin.updateUserById(row.userId, updates);
            if (error) return res.status(400).json({ error: error.message });
        }

        // update employee table
        await db
            .update(employees)
            .set({ name: String(name).trim(), surname: String(surname).trim() })
            .where(eq(employees.id, Number(id)));

        return res.status(200).json({ ok: true });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
