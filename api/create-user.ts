export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { employees } from "../db/schema";
import { requireAdmin } from "./_auth";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        await requireAdmin(req);

        const { email, password, name, surname } = req.body ?? {};
        if (!email || !name || !surname) return res.status(400).json({ error: "Missing fields" });

        const { data, error } = await admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
        });
        if (error || !data.user) return res.status(400).json({ error: error?.message || "Cannot create user" });

        const [inserted] = await db
            .insert(employees)
            .values({
                name: String(name).trim(),
                surname: String(surname).trim(),
                userId: data.user.id,
            })
            .returning();

        return res.status(201).json({ userId: data.user.id, employee: inserted });
    } catch (e: unknown) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Server error";
        return res.status(500).json({ error: errorMessage });
    }
}
