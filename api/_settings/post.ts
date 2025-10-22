// api/_settings/post.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { settings } from "../../db/schema";
import { Setting, SettingForm } from "../../src/types";
import { hoursAreValid } from "../../src/helpers";

export const postSettings = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can create records */
    await requireAdmin(req);

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
    let created = null;
    await db.transaction(async (tx) => {
        if (formBody.isDefault) {
            await tx.update(settings).set({ isDefault: false as any });
        }
        const [row] = await tx.insert(settings).values(normalizedBody).returning();
        created = row ?? null;
    });

    if (!created) {
        return res.status(500).json({ error: "Create failed" });
    }

    return res.status(201).json({ setting: created as Setting });
};
