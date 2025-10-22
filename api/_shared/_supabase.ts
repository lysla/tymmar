// api/_shared/_supabase.ts
import { createClient } from "@supabase/supabase-js";

/** 👀 !! we use supabase client to manage authentication, no other direct interactions with the database */

/** 👀 supabase client for regular user operations (does not bypass RLS policies) */
export const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

/** 👀 supabase client for admin operations (bypasses RLS policies) */
export const supadmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
