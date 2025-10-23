// api/periods.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { patchPeriods } from "./_periods";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "PATCH") {
            await patchPeriods(req, res);
        }

        /** 👀 any other method is not allowed */
        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
