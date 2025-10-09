export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { db } from "./db";
import { employees } from "../db/schema";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const { name, surname } = (req.body ?? {}) as { name?: string; surname?: string };

        if (!name?.trim() || !surname?.trim()) {
            return res.status(400).json({ error: "Name and surname are required." });
        }

        const [inserted] = await db.insert(employees).values({ name: name.trim(), surname: surname.trim() }).returning();

        return res.status(201).json(inserted);
    } catch (e) {
        console.error(e);
        return res.status(500).json({ error: "Server error" });
    }
}
