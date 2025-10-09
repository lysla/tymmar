export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== "GET") return res.status(405).send("Method Not Allowed");
    return res.status(200).send("API is alive ✅");
}
