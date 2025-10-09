// api/create-user-and-employee.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { employees } from "../db/schema";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
        // TODO: verify caller is admin
        const { email, password, name, surname } = req.body ?? {};
        if (!email || !name || !surname) return res.status(400).json({ error: "Missing fields" });

        // 1) Create/auth user
        const { data, error } = await admin.auth.admin.createUser({ email, password });
        if (error || !data.user) return res.status(400).json({ error: error?.message || "Cannot create user" });

        const userId = data.user.id; // UUID

        // 2) Create employee linked to auth user
        const [inserted] = await db
            .insert(employees)
            .values({ name: String(name).trim(), surname: String(surname).trim(), userId })
            .returning();

        return res.status(201).json({ userId, employee: inserted });
    } catch (e: unknown) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : "Server error";
        return res.status(500).json({ error: errorMessage });
    }
}
