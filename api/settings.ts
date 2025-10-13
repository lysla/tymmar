// api/settings.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_db";
import { settings } from "../db/schema";
import { desc } from "drizzle-orm";
import { requireUser } from "./_auth"; // auth required to read

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "GET") return res.status(405).send("Method Not Allowed");

        // Require any authenticated user
        await requireUser(req);

        const rows = await db.select().from(settings).orderBy(desc(settings.id)).limit(1);

        if (!rows.length) {
            // Fallback defaults
            return res.status(200).json({
                settings: { mon: 8, tue: 8, wed: 8, thu: 8, fri: 8, sat: 0, sun: 0, defaulted: true },
            });
        }

        const s = rows[0];
        // numeric columns come as strings -> convert to numbers
        const toNum = (v: unknown) => Number(v ?? 0);

        return res.status(200).json({
            settings: {
                mon: toNum(s.mon),
                tue: toNum(s.tue),
                wed: toNum(s.wed),
                thu: toNum(s.thu),
                fri: toNum(s.fri),
                sat: toNum(s.sat),
                sun: toNum(s.sun),
                defaulted: false,
            },
        });
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
