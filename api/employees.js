export const config = { runtime: "nodejs" };

import { db } from "./db/index.js";
import { employees } from "./db/schema.js";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        // Vercel parses JSON when Content-Type: application/json
        const { name, surname } = req.body || {};

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
