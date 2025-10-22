// api/settings.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { eq, inArray, not } from "drizzle-orm";
import { db } from "./_shared/_db";
import { settings } from "../db/schema";
import { requireAdmin, requireUser } from "./_shared/_auth";

/* ---------------- helpers ---------------- */
function toNum(v: unknown) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
}
function isPositiveInt(n: unknown): n is number {
    return typeof n === "number" && Number.isInteger(n) && n > 0;
}
function isValidHours(n: unknown) {
    const x = Number(n);
    return Number.isFinite(x) && x >= 0 && x <= 24;
}

function coerceBody(body: any) {
    return {
        mon_hours: toNum(body?.mon_hours),
        tue_hours: toNum(body?.tue_hours),
        wed_hours: toNum(body?.wed_hours),
        thu_hours: toNum(body?.thu_hours),
        fri_hours: toNum(body?.fri_hours),
        sat_hours: toNum(body?.sat_hours),
        sun_hours: toNum(body?.sun_hours),
        isDefault: Boolean(body?.isDefault),
    };
}
function validateHoursAll(p: ReturnType<typeof coerceBody>) {
    return isValidHours(p.mon_hours) && isValidHours(p.tue_hours) && isValidHours(p.wed_hours) && isValidHours(p.thu_hours) && isValidHours(p.fri_hours) && isValidHours(p.sat_hours) && isValidHours(p.sun_hours);
}
function toDTO(row: typeof settings.$inferSelect) {
    return {
        id: row.id,
        mon_hours: Number(row.mon ?? 0),
        tue_hours: Number(row.tue ?? 0),
        wed_hours: Number(row.wed ?? 0),
        thu_hours: Number(row.thu ?? 0),
        fri_hours: Number(row.fri ?? 0),
        sat_hours: Number(row.sat ?? 0),
        sun_hours: Number(row.sun ?? 0),
        isDefault: !!row.isDefault,
        updatedAt: row.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    };
}

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        // Try admin first; fall back to regular user (like employees.ts)
        let isAdmin = false;
        try {
            await requireAdmin(req);
            isAdmin = true;
        } catch {
            await requireUser(req);
            isAdmin = false;
        }

        // ───────── GET ─────────
        if (req.method === "GET") {
            const idParam = req.query.id;

            if (isAdmin) {
                // Admin: get by id or list all
                if (idParam) {
                    const id = Number(idParam);
                    if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid id" });
                    const [row] = await db.select().from(settings).where(eq(settings.id, id)).limit(1);
                    if (!row) return res.status(404).json({ error: "Not found" });
                    return res.status(200).json(toDTO(row));
                }
                const rows = await db.select().from(settings).orderBy(settings.id);
                return res.status(200).json({ settings: rows.map(toDTO) });
            }

            // Non-admin: return the effective default settings
            const rows = await db.select().from(settings);
            const def = rows.find((r) => r.isDefault) ?? rows[rows.length - 1];
            if (!def) {
                // Fallback defaults
                return res.status(200).json({
                    id: 0,
                    mon_hours: 8,
                    tue_hours: 8,
                    wed_hours: 8,
                    thu_hours: 8,
                    fri_hours: 8,
                    sat_hours: 0,
                    sun_hours: 0,
                    isDefault: true,
                    updatedAt: new Date().toISOString(),
                    defaulted: true,
                });
            }
            return res.status(200).json({ ...toDTO(def), defaulted: false });
        }

        // From here: admin-only mutations
        if (!isAdmin) return res.status(403).json({ error: "Admin only" });

        // ───────── POST (create) ─────────
        if (req.method === "POST") {
            const p = coerceBody(req.body ?? {});
            if (!validateHoursAll(p)) {
                return res.status(400).json({ error: "Hours must be numbers between 0 and 24." });
            }

            let created: typeof settings.$inferSelect | null = null;
            await db.transaction(async (tx) => {
                if (p.isDefault) {
                    await tx.update(settings).set({ isDefault: false as any });
                }
                const [row] = await tx
                    .insert(settings)
                    .values({
                        mon: String(p.mon_hours),
                        tue: String(p.tue_hours),
                        wed: String(p.wed_hours),
                        thu: String(p.thu_hours),
                        fri: String(p.fri_hours),
                        sat: String(p.sat_hours),
                        sun: String(p.sun_hours),
                        isDefault: p.isDefault,
                    } as any)
                    .returning();
                created = row ?? null;
            });

            if (!created) return res.status(500).json({ error: "Create failed" });
            return res.status(201).json({ settings: toDTO(created) });
        }

        // ───────── PUT (update) ─────────
        if (req.method === "PUT") {
            const id = Number(req.body?.id);
            if (!isPositiveInt(id)) return res.status(400).json({ error: "Invalid id" });

            const p = coerceBody(req.body ?? {});
            if (!validateHoursAll(p)) {
                return res.status(400).json({ error: "Hours must be numbers between 0 and 24." });
            }

            const [existing] = await db.select().from(settings).where(eq(settings.id, id)).limit(1);
            if (!existing) return res.status(404).json({ error: "Not found" });

            await db.transaction(async (tx) => {
                if (p.isDefault) {
                    await tx
                        .update(settings)
                        .set({ isDefault: false as any })
                        .where(not(eq(settings.id, id)));
                }
                await tx
                    .update(settings)
                    .set({
                        mon: String(p.mon_hours),
                        tue: String(p.tue_hours),
                        wed: String(p.wed_hours),
                        thu: String(p.thu_hours),
                        fri: String(p.fri_hours),
                        sat: String(p.sat_hours),
                        sun: String(p.sun_hours),
                        isDefault: p.isDefault,
                        updatedAt: new Date(),
                    } as any)
                    .where(eq(settings.id, id));
            });

            return res.status(200).json({ ok: true });
        }

        // ───────── DELETE (bulk) ─────────
        if (req.method === "DELETE") {
            const ids = (req.body?.ids ?? []) as number[];
            if (!Array.isArray(ids) || ids.length === 0 || !ids.every((x) => isPositiveInt(Number(x)))) {
                return res.status(400).json({ error: "ids[] (positive integers) is required" });
            }

            // prevent deleting the only default
            const rows = await db.select().from(settings).where(inArray(settings.id, ids));
            const defaultRows = rows.filter((r) => r.isDefault);
            if (defaultRows.length) {
                const all = await db.select().from(settings);
                const allDefaults = all.filter((r) => r.isDefault);
                if (allDefaults.length === 1 && ids.includes(allDefaults[0].id)) {
                    return res.status(400).json({ error: "Cannot delete the only default settings row." });
                }
            }

            await db.delete(settings).where(inArray(settings.id, ids));
            return res.status(200).json({ deletedCount: rows.length });
        }

        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
