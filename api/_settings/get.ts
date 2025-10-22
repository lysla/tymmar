// api/_settings/get.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, requireUser } from "../_shared/auth";
import { db } from "../_shared/db";
import { settings } from "../../db/schema";
import { Setting } from "../../src/types";
import { eq } from "drizzle-orm";

export const getSettings = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 check if the request is from an admin user, cause it can be handled differently for non-admins */
    let isAdmin = false;
    let caller = null;

    try {
        caller = await requireAdmin(req);
        isAdmin = true;
    } catch {
        caller = await requireUser(req);
    }

    if (isAdmin) {
        /** 👀 if it's admin, allow listing all records or retrieving a specific one by id */

        if (req.query.id) {
            const id = Number(req.query.id);
            const [row] = await db.select().from(settings).where(eq(settings.id, id)).limit(1);

            if (!row) return res.status(404).json({ error: "Not found" });

            return res.status(200).json({ setting: row as Setting });
        }

        const rows = await db.select().from(settings);

        return res.status(200).json({ settings: rows as Setting[] });
    } else {
        /** 👀 if it's not admin and neither a regular user, return unauthorized */

        if (!caller) return res.status(401).json({ error: "Unauthorized" });

        /** 👀 the regular user can only retrieve their own setting, which should be the default one */
        /** TODO: retrieve the setting from the employee settingId if possible */

        const [row] = await db.select().from(settings).where(eq(settings.isDefault, true)).limit(1);

        return res.status(200).json({ setting: row as Setting });
    }
};
