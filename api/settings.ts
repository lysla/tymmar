// api/settings.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getSettings, postSettings, putSettings, deleteSettings } from "./_settings";

/* ---------------- handler ---------------- */
export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === "GET") {
            await getSettings(req, res);
        }

        if (req.method === "POST") {
            await postSettings(req, res);
        }

        if (req.method === "PUT") {
            await putSettings(req, res);
        }

        if (req.method === "DELETE") {
            await deleteSettings(req, res);
        }

        /** 👀 any other method is not allowed */
        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
