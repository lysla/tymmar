export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const admin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        const { data: list, error: listError } = await admin.auth.admin.listUsers();
        if (listError) throw listError;

        const user = list.users.find((u) => u.email === "carmenghirardi@gmail.com");
        if (!user) throw new Error("User not found");

        const { data, error } = await admin.auth.admin.updateUserById(user.id, {
            password: "password",
            app_metadata: { is_admin: true },
        });

        if (error) {
            console.error("Update error:", error);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ ok: true, user: data.user });
    } catch (err: unknown) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Server error" });
    }
}
