// api/admin-create-user.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClerkClient } from "@clerk/backend";

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY! });

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        // TODO: replace this with real auth/role check
        /* if (req.headers["x-admin"] !== process.env.VITE_ADMIN_KEY) {
      return res.status(401).json({ error: "Unauthorized" });
    } */

        const { email, firstName, lastName, password } = (req.body ?? {}) as {
            email?: string;
            firstName?: string;
            lastName?: string;
            password?: string;
        };
        if (!email) return res.status(400).json({ error: "email required" });

        // 🔐 Idempotency: if user already exists, don't try to create again
        const existing = await clerk.users.getUserList({ emailAddress: [email] });
        if (existing.data.length > 0) {
            const user = existing.data[0];
            return res.status(200).json({ id: user.id, email, created: false });
        }

        // Create new user
        const user = await clerk.users.createUser({
            emailAddress: [email],
            firstName,
            lastName,
            ...(password ? { password } : { skipPasswordRequirement: true }),
        });

        return res.status(201).json({ id: user.id, email, created: true });
    } catch (e: unknown) {
        // Handle "email taken" gracefully if it slips through
        let msg = "Server error";
        type ClerkError = {
            errors?: { message?: string }[];
            message?: string;
        };
        if (typeof e === "object" && e !== null) {
            const err = e as ClerkError;
            if ("errors" in err && Array.isArray(err.errors) && err.errors[0]?.message) {
                msg = err.errors[0].message!;
            } else if ("message" in err && typeof err.message === "string") {
                msg = err.message;
            }
        }
        if (msg.toLowerCase().includes("taken")) {
            return res.status(200).json({ created: false, note: "User exists" });
        }
        console.error(e);
        return res.status(500).json({ error: msg });
    }
}
