import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";
import { db } from "./db";
import { employees } from "../db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@supabase/supabase-js";

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

type EmployeeRow = typeof employees.$inferSelect;
type HttpErr = Error & { status: number };

function httpError(status: number, message: string): HttpErr {
    const err = new Error(message) as HttpErr;
    err.status = status;
    return err;
}

function getToken(req: VercelRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw httpError(401, "Missing or invalid Authorization header");
    return authHeader.slice(7);
}

export async function requireUser(req: VercelRequest): Promise<User> {
    const token = getToken(req);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);
    if (error || !user) throw httpError(401, "Invalid or expired token");
    return user;
}

export async function requireAdmin(req: VercelRequest): Promise<User> {
    const user = await requireUser(req);
    if (!user.app_metadata?.is_admin) throw httpError(403, "Forbidden: admin only");
    return user;
}

export async function requireEmployee(req: VercelRequest, opts: { allowAdmin?: boolean } = {}): Promise<{ user: User; employee: EmployeeRow | null }> {
    const user = await requireUser(req);

    if (opts.allowAdmin && user.app_metadata?.is_admin) {
        return { user, employee: null };
    }

    const rows = await db.select().from(employees).where(eq(employees.userId, user.id)).limit(1);
    const employee = rows[0] ?? null;

    if (!employee) throw httpError(403, "Forbidden: employee account required");

    return { user, employee };
}
