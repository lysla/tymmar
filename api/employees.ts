export const config = { runtime: "nodejs" };

import { db } from "./db";
import { employees } from "../db/schema";

export default async function handler(req: Request) {
    try {
        if (req.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        const { name, surname } = ((await req.json?.()) ?? {}) as { name?: string; surname?: string };

        if (!name?.trim() || !surname?.trim()) {
            return new Response(JSON.stringify({ error: "Name and surname are required." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const [inserted] = await db.insert(employees).values({ name: name.trim(), surname: surname.trim() }).returning();

        return new Response(JSON.stringify(inserted), {
            status: 201,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "Server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
