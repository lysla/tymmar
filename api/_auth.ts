// api/_auth.ts
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest } from "@vercel/node";

// Supabase client for verifying JWTs (uses anon key)
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/**
 * Verifies the caller's access token from the Authorization header
 * and ensures the user is authenticated.
 *
 * @throws {Error & {status: number}} when invalid/missing/unauthorized
 */
export async function requireUser(req: VercelRequest) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
        const err = new Error("Missing or invalid Authorization header") as Error & { status: number };
        err.status = 401;
        throw err;
    }

    const token = authHeader.split(" ")[1];
    const {
        data: { user },
        error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
        const err = new Error("Invalid or expired token") as Error & { status: number };
        err.status = 401;
        throw err;
    }

    return user;
}

/**
 * Verifies the caller is an authenticated admin.
 *
 * @throws {Error & {status: number}} when unauthorized or not admin
 */
export async function requireAdmin(req: VercelRequest) {
    const user = await requireUser(req);

    if (!user.app_metadata?.is_admin) {
        const err = new Error("Forbidden: admin only") as Error & { status: number };
        err.status = 403;
        throw err;
    }

    return user;
}
