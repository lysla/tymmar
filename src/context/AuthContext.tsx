// src/context/AuthContext.tsx
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";
import { AuthContext, type AuthContextType } from "../hooks";

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        /** 👀 get the initial user of the current session */
        supabase.auth.getSession().then(({ data }) => {
            setUser(data.session?.user ?? null);
            setLoading(false);
        });

        /** 👀 keep an eye if the user status change */
        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        /** 👀 stop keeping an eye on the user status change */
        return () => {
            sub.subscription.unsubscribe();
        };
    }, []);

    /** 👀 current user JWT */
    async function getAccessToken() {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
    }

    /** 👀 manage the sign in throu supabase */
    async function signInWithPassword(email: string, password: string) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            return { error: error.message };
        }
        return { user: data.user };
    }

    /** 👀 manage the sign out throu supabase */
    async function signOut() {
        await supabase.auth.signOut();
    }

    /** 👀 check if the user is an administrator */
    const isAdmin = user?.app_metadata?.is_admin === true;

    const value = useMemo<AuthContextType>(() => ({ user, loading, isAdmin, getAccessToken, signInWithPassword, signOut }), [user, loading, isAdmin]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
