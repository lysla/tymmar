// api/_settings/put.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { settings } from "../../db/schema";
import { Setting, SettingForm } from "../../src/types";
import { hoursAreValid } from "../../src/helpers";
import { eq, not } from "drizzle-orm";

export const putSettings = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can update records */
    await requireAdmin(req);

    const id = Number(req.body.id);

    if (!id || id <= 0) {
        return res.status(400).json({ error: "Valid record id is required" });
    }

    const formBody = (req.body as SettingForm) ?? {};

    /** 👀 fields validation */
    if (!hoursAreValid([formBody.monHours, formBody.tueHours, formBody.wedHours, formBody.thuHours, formBody.friHours, formBody.satHours, formBody.sunHours])) {
        return res.status(400).json({ error: "Invalid hours" });
    }

    /** 👀 normalize record body */
    const normalizedBody = {
        monHours: String(formBody.monHours),
        tueHours: String(formBody.tueHours),
        wedHours: String(formBody.wedHours),
        thuHours: String(formBody.thuHours),
        friHours: String(formBody.friHours),
        satHours: String(formBody.satHours),
        sunHours: String(formBody.sunHours),
        isDefault: formBody.isDefault,
    };

    /** 👀 makes the transation so the default setting is always one */
    let updated = null;
    await db.transaction(async (tx) => {
        if (formBody.isDefault) {
            await tx
                .update(settings)
                .set({ isDefault: false as any })
                .where(not(eq(settings.id, id)));
        }
        const [row] = await tx.update(settings).set(normalizedBody).where(eq(settings.id, id)).returning();
        updated = row ?? null;
    });

    if (!updated) {
        return res.status(500).json({ error: "Update failed" });
    }

    return res.status(200).json({ setting: updated as Setting });
};
