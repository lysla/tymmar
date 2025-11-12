// api/periods.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getPeriods, patchPeriods } from "./_periods";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        switch (req.method) {
            case "GET":
                return await getPeriods(req, res);
            case "PATCH":
                return await patchPeriods(req, res);
            default:
                return res.status(405).send("Method Not Allowed");
        }
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
