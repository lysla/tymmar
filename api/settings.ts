// api/settings.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSettings, postSettings, putSettings, deleteSettings } from "./_settings";

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        switch (req.method) {
            case "GET":
                return await getSettings(req, res);
            case "POST":
                return await postSettings(req, res);
            case "PUT":
                return await putSettings(req, res);
            case "DELETE":
                return await deleteSettings(req, res);
            default:
                return res.status(405).send("Method Not Allowed");
        }
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
