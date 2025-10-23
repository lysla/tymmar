// src/supabase.ts
import { createClient } from "@supabase/supabase-js";

/** 👀 !! we use supabase client to manage authentication, nothing to do with the database */

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL!, import.meta.env.VITE_SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true } });
