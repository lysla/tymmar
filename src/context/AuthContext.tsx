import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

type AuthValue = {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    getAccessToken: () => Promise<string | undefined>;
    signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        // initial session
        supabase.auth.getSession().then(({ data }) => {
            if (!active) return;
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        // subscribe to changes
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!active) return;
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    async function getAccessToken() {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
    }

    async function signInWithPassword(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
    }

    async function signOut() {
        await supabase.auth.signOut();
    }

    const isAdmin = Boolean((user?.app_metadata as any)?.is_admin);

    const value = useMemo<AuthValue>(() => ({ user, loading, isAdmin, getAccessToken, signInWithPassword, signOut }), [user, loading, isAdmin]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}
