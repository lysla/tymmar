// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

type AuthState = {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    signInWithPassword: (email: string, password: string) => Promise<{ error?: string; user?: User | null }>;
    signOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
};

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const isAdmin = Boolean((user?.app_metadata as Record<string, unknown> | undefined)?.is_admin);

    useEffect(() => {
        let active = true;

        (async () => {
            const { data } = await supabase.auth.getSession();
            if (!active) return;
            setUser(data.session?.user ?? null);
            setLoading(false);
        })();

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

    async function signInWithPassword(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };

        // 🔑 fetch the fresh user from the *new* session
        const {
            data: { user },
        } = await supabase.auth.getUser();
        // ensure context updates immediately
        setUser(user ?? null);

        return { user: user ?? null };
    }

    async function signOut() {
        await supabase.auth.signOut();
        setUser(null);
    }

    async function getAccessToken() {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
    }

    return { user, loading, isAdmin, signInWithPassword, signOut, getAccessToken };
}
