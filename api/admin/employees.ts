// api/employees.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { inArray, eq } from "drizzle-orm";
import { db } from "./../_db";
import { employees } from "../../db/schema";
import { requireAdmin, requireUser } from "./../_auth";

const supaAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isPositiveInt(n: unknown): n is number {
    return typeof n === "number" && Number.isInteger(n) && n > 0;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // First try admin; if it throws, we’ll treat caller as non-admin.
        let isAdmin = false;
        let caller: Awaited<ReturnType<typeof requireUser>> | null = null;

        try {
            caller = await requireAdmin(req);
            isAdmin = true;
        } catch {
            caller = await requireUser(req); // authenticated but not admin
            isAdmin = false;
        }

        // ───────── GET ─────────
        if (req.method === "GET") {
            const idParam = req.query.id;

            if (isAdmin) {
                // Admin GET
                if (idParam && idParam !== "me") {
                    const id = Number(idParam);
                    if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid id" });

                    const rows = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
                    const row = rows[0];
                    if (!row) return res.status(404).json({ error: "Not found" });

                    let email = "";
                    if (row.userId) {
                        const { data } = await supaAdmin.auth.admin.getUserById(row.userId);
                        email = data.user?.email ?? "";
                    }

                    return res.status(200).json({ id: row.id, name: row.name, surname: row.surname, userId: row.userId, email });
                }

                // list all
                const rows = await db.select().from(employees);
                const result = await Promise.all(
                    rows.map(async (r) => {
                        let email = "";
                        if (r.userId) {
                            const { data } = await supaAdmin.auth.admin.getUserById(r.userId);
                            email = data.user?.email ?? "";
                        }
                        return { ...r, email };
                    })
                );
                return res.status(200).json({ employees: result });
            } else {
                // Non-admin GET: only return own employee row
                if (!caller) return res.status(401).json({ error: "Unauthorized" });

                // if id=me or no id → self
                if (!idParam || idParam === "me") {
                    const rows = await db.select().from(employees).where(eq(employees.userId, caller.id)).limit(1);
                    return res.status(200).json({
                        isEmployee: rows.length > 0,
                        employee: rows[0] ?? null,
                    });
                }

                // Any other id is forbidden
                return res.status(403).json({ error: "Forbidden" });
            }
        }

        // From here on, admin-only mutations
        if (!isAdmin) return res.status(403).json({ error: "Admin only" });

        // ───────── POST (create) ─────────
        if (req.method === "POST") {
            const { name, surname, email, password } = req.body ?? {};
            if (!name?.trim() || !surname?.trim() || !email?.trim() || !password?.trim()) {
                return res.status(400).json({ error: "Missing fields" });
            }

            const { data, error } = await supaAdmin.auth.admin.createUser({
                email: String(email).trim(),
                password: String(password).trim(),
                email_confirm: true,
            });
            if (error || !data.user) {
                return res.status(400).json({ error: error?.message ?? "Failed to create user" });
            }

            const [row] = await db
                .insert(employees)
                .values({
                    name: String(name).trim(),
                    surname: String(surname).trim(),
                    userId: data.user.id,
                })
                .returning();

            return res.status(201).json({ employee: row, userId: data.user.id });
        }

        // ───────── PUT (update) ─────────
        if (req.method === "PUT") {
            const { id, name, surname, email, password } = req.body ?? {};
            if (!isPositiveInt(Number(id)) || !name?.trim() || !surname?.trim() || !email?.trim()) {
                return res.status(400).json({ error: "Missing fields" });
            }
            const empId = Number(id);

            const rows = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
            const row = rows[0];
            if (!row) return res.status(404).json({ error: "Not found" });

            if (row.userId) {
                const updates: { email?: string; password?: string } = { email: String(email).trim() };
                if (password?.trim()) updates.password = String(password).trim();
                const { error } = await supaAdmin.auth.admin.updateUserById(row.userId, updates);
                if (error) return res.status(400).json({ error: error.message });
            }

            await db
                .update(employees)
                .set({ name: String(name).trim(), surname: String(surname).trim() })
                .where(eq(employees.id, empId));

            return res.status(200).json({ ok: true });
        }

        // ───────── DELETE (bulk) ─────────
        if (req.method === "DELETE") {
            const ids = (req.body?.ids ?? []) as number[];
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => isPositiveInt(Number(x)))) {
                return res.status(400).json({ error: "ids[] (positive integers) is required" });
            }

            const rows = await db.select().from(employees).where(inArray(employees.id, ids));
            const userIds = rows.map((r) => r.userId).filter(Boolean) as string[];

            await Promise.allSettled(userIds.map((uid) => supaAdmin.auth.admin.deleteUser(uid)));
            await db.delete(employees).where(inArray(employees.id, ids));

            return res.status(200).json({ deletedCount: rows.length });
        }

        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
