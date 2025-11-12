// api/employees.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEmployees, postEmployees, putEmployees, deleteEmployees } from "./_employees";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        switch (req.method) {
            case "GET":
                return await getEmployees(req, res);
            case "POST":
                return await postEmployees(req, res);
            case "PUT":
                return await putEmployees(req, res);
            case "DELETE":
                return await deleteEmployees(req, res);
            default:
                return res.status(405).send("Method Not Allowed");
        }
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
