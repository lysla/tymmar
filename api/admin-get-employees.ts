// api/admin-get-employees.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { db } from "./db";
import { employees } from "../db/schema";
import { requireAdmin } from "./_auth";
import { eq } from "drizzle-orm";

// Admin client (Service Role) to read emails from auth.users
const supaAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

        // 🔐 ensure caller is admin
        await requireAdmin(req);

        // 1) Read employees from your public table
        const rows = await db.select().from(employees);

        // 2) Map userIds -> emails via Admin API (paged)
        const userIds = rows.map((r) => r.userId).filter(Boolean) as string[];
        const emailById = new Map<string, string>();

        // listUsers is paginated; fetch in chunks until no more
        let page = 1;
        const perPage = 200;
        while (true) {
            const { data, error } = await supaAdmin.auth.admin.listUsers({ page, perPage: perPage });
            if (error) throw error;

            for (const u of data?.users ?? []) {
                if (u.id) emailById.set(u.id, u.email ?? "");
            }
            if (!data?.users?.length || data.users.length < perPage) break;
            page += 1;
        }

        // 3) Stitch email onto employee rows
        const result = rows.map((r) => ({
            id: r.id,
            name: r.name,
            surname: r.surname,
            userId: r.userId,
            email: r.userId ? emailById.get(r.userId) ?? "" : "",
        }));

        return res.status(200).json({ employees: result });
    } catch (e: any) {
        const code = e?.status ?? 500;
        return res.status(code).json({ error: e?.message ?? "Server error" });
    }
}
