// api/_employees/get.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin, requireUser } from "../_shared/auth";
import { db } from "../_shared/db";
import { vEmployees } from "../../db/schema";
import { Employee } from "../../src/types";
import { eq } from "drizzle-orm";

export const getEmployees = async function (req: VercelRequest, res: VercelResponse) {
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
        /** 👀 if it's admin, allow listing all employees or retrieving a specific one by id */

        if (req.query.id) {
            const id = Number(req.query.id);
            const [row] = await db.select().from(vEmployees).where(eq(vEmployees.id, id)).limit(1);

            if (!row) return res.status(404).json({ error: "Not found" });

            return res.status(200).json({ employee: row as Employee });
        }

        const rows = await db.select().from(vEmployees);

        return res.status(200).json({ employees: rows as Employee[] });
    } else {
        /** 👀 if it's not admin and neither a regular user, return unauthorized */

        if (!caller) return res.status(401).json({ error: "Unauthorized" });

        /** 👀 the regular user can only retrieve their own employee record */

        const [row] = await db.select().from(vEmployees).where(eq(vEmployees.userId, caller.id)).limit(1);

        return res.status(200).json({ employee: row as Employee });
    }
};
