// api/employees.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { getEmployees } from "./_employees/get";
import { postEmployees } from "./_employees/post";
import { putEmployees } from "./_employees/put";
import { deleteEmployees } from "./_employees/delete";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method === "GET") {
            await getEmployees(req, res);
        }

        if (req.method === "POST") {
            await postEmployees(req, res);
        }

        if (req.method === "PUT") {
            await putEmployees(req, res);
        }

        if (req.method === "DELETE") {
            await deleteEmployees(req, res);
        }

        return res.status(405).send("Method Not Allowed");
    } catch (e: any) {
        return res.status(e?.status ?? 500).json({ error: e?.message ?? "Server error" });
    }
}
