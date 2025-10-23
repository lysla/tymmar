// src/hooks/useAuth.ts
import type { User } from "@supabase/supabase-js";
import { createContext, useContext } from "react";

/** 👀 type for what this context offers */
export type AuthContextType = {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    getAccessToken: () => Promise<string | undefined>;
    signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
