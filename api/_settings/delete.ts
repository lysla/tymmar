// api/_settings/delete.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { settings } from "../../db/schema";
import { inArray } from "drizzle-orm";

export const deleteSettings = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can delete settings */
    await requireAdmin(req);

    const ids = (req.body?.ids ?? []) as number[];
    if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: "ids[] (positive integers) is required" });
    }

    /** 👀 delete the records */
    await db.delete(settings).where(inArray(settings.id, ids));

    return res.status(200).json({});
};
