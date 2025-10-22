// api/_shared/_auth.ts
import type { VercelRequest } from "@vercel/node";
import { User } from "@supabase/supabase-js";
import { supabase } from "./_supabase";

/** 👀 useful helpers for logic splitting */
type HttpErr = Error & { status: number };
function httpError(status: number, message: string): HttpErr {
    const err = new Error(message) as HttpErr;
    err.status = status;
    return err;
}
function getToken(req: VercelRequest): string {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        throw httpError(401, "Missing or invalid Authorization header");
    }
    return authHeader.slice(7);
}

/** 👀 verify caller token and return supabase user */
export async function requireUser(req: VercelRequest): Promise<User> {
    const token = getToken(req);
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);
    if (error || !user) throw httpError(401, "Invalid or expired token");
    return user;
}

/** 👀 verify caller is admin */
export async function requireAdmin(req: VercelRequest): Promise<User> {
    const user = await requireUser(req);
    if (!user.app_metadata?.is_admin) throw httpError(403, "Forbidden: admin only");
    return user;
}
