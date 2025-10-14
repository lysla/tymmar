// api/employees.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { inArray, eq } from "drizzle-orm";
import { db } from "./_db";
import { employees } from "../db/schema";
import { requireAdmin, requireUser } from "./_auth";
import type { Employee } from "../src/types/db"; //

const supaAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

function isPositiveInt(n: unknown): n is number {
    return typeof n === "number" && Number.isInteger(n) && n > 0;
}
function isValidDateRange(start?: string | null, end?: string | null) {
    if (!start || !end) return true; // one or both are null → always valid
    const s = new Date(start);
    const e = new Date(end);
    return !isNaN(s.getTime()) && !isNaN(e.getTime()) && s <= e;
}

// Map a Drizzle row + email into our public DTO
function toEmployeeDTO(row: typeof employees.$inferSelect, email: string): Employee {
    return {
        id: row.id,
        name: row.name,
        surname: row.surname,
        password: "",
        userId: row.userId ?? null,
        email,
        startDate: (row as any).startDate ?? null, // ensure fields exist in schema
        endDate: (row as any).endDate ?? null,
        updatedAt: row.updatedAt.toISOString(),
        createdAt: row.createdAt.toISOString(),
    };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Try admin first; fall back to regular user
        let isAdmin = false;
        let caller: Awaited<ReturnType<typeof requireUser>> | null = null;

        try {
            caller = await requireAdmin(req);
            isAdmin = true;
        } catch {
            caller = await requireUser(req);
            isAdmin = false;
        }

        // ───────── GET ─────────
        if (req.method === "GET") {
            const idParam = req.query.id;

            if (isAdmin) {
                // Admin GET by id
                if (idParam && idParam !== "me") {
                    const id = Number(idParam);
                    if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid id" });

                    const [row] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);
                    if (!row) return res.status(404).json({ error: "Not found" });

                    let email = "";
                    if (row.userId) {
                        const { data } = await supaAdmin.auth.admin.getUserById(row.userId);
                        email = data.user?.email ?? "";
                    }

                    const dto = toEmployeeDTO(row, email);
                    return res.status(200).json(dto);
                }

                // Admin list all
                const rows = await db.select().from(employees);

                // stitch emails (N calls; fine for small sets — optimize later if needed)
                const result: Employee[] = await Promise.all(
                    rows.map(async (r) => {
                        let email = "";
                        if (r.userId) {
                            const { data } = await supaAdmin.auth.admin.getUserById(r.userId);
                            email = data.user?.email ?? "";
                        }
                        return toEmployeeDTO(r, email);
                    })
                );

                return res.status(200).json({ employees: result });
            } else {
                // Non-admin: only "me"
                if (!caller) return res.status(401).json({ error: "Unauthorized" });

                const [row] = await db.select().from(employees).where(eq(employees.userId, caller.id)).limit(1);

                if (!row) {
                    return res.status(200).json({ isEmployee: false, employee: null });
                }

                // caller token usually has email
                const email = caller.email ?? "";
                const dto = toEmployeeDTO(row, email);

                return res.status(200).json({ isEmployee: true, employee: dto });
            }
        }

        // From here: admin-only mutations
        if (!isAdmin) return res.status(403).json({ error: "Admin only" });

        // ───────── POST (create) ─────────
        if (req.method === "POST") {
            const { name, surname, email, password, startDate, endDate } = req.body ?? {};
            if (!name?.trim() || !surname?.trim() || !email?.trim() || !password?.trim()) {
                return res.status(400).json({ error: "Missing fields" });
            }

            if (!isValidDateRange(startDate, endDate)) {
                return res.status(400).json({ error: "startDate must be <= endDate" });
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
                    ...(startDate ? { startDate: String(startDate) } : {}),
                    ...(endDate ? { endDate: String(endDate) } : {}),
                } as any)
                .returning();

            const dto = toEmployeeDTO(row, String(email).trim());
            return res.status(201).json({ employee: dto, userId: data.user.id });
        }

        // ───────── PUT (update) ─────────
        if (req.method === "PUT") {
            const { id, name, surname, email, password, startDate, endDate } = req.body ?? {};
            if (!isPositiveInt(Number(id)) || !name?.trim() || !surname?.trim() || !email?.trim()) {
                return res.status(400).json({ error: "Missing fields" });
            }

            if (!isValidDateRange(startDate, endDate)) {
                return res.status(400).json({ error: "startDate must be <= endDate" });
            }

            const empId = Number(id);

            const [row] = await db.select().from(employees).where(eq(employees.id, empId)).limit(1);
            if (!row) return res.status(404).json({ error: "Not found" });

            // update auth user if linked
            if (row.userId) {
                const updates: { email?: string; password?: string } = { email: String(email).trim() };
                if (password?.trim()) updates.password = String(password).trim();
                const { error } = await supaAdmin.auth.admin.updateUserById(row.userId, updates);
                if (error) return res.status(400).json({ error: error.message });
            }

            // update employee table
            await db
                .update(employees)
                .set({
                    name: String(name).trim(),
                    surname: String(surname).trim(),
                    ...(startDate !== undefined ? { startDate: startDate ? String(startDate) : null } : {}),
                    ...(endDate !== undefined ? { endDate: endDate ? String(endDate) : null } : {}),
                } as any)
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
