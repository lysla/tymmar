export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq } from "drizzle-orm";
import { requireUser } from "./_auth";
import { db } from "./db";
import { employees } from "../db/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

        const user = await requireUser(req);
        const rows = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);

        return res.status(200).json({
            isEmployee: rows.length > 0,
            employee: rows[0] ?? null,
        });
    } catch (err: any) {
        const code = err?.status ?? 500;
        return res.status(code).json({ error: err?.message || "Server error" });
    }
}
