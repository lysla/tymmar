// src/hooks/useAuth.ts
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../supabase";

type AuthState = {
    user: User | null;
    loading: boolean;
    isAdmin: boolean;
    isEmployee: boolean; // ← no null needed
    signInWithPassword: (email: string, password: string) => Promise<{ error?: string }>;
    signOut: () => Promise<void>;
    getAccessToken: () => Promise<string | undefined>;
};

export function useAuth(): AuthState {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEmployee, setIsEmployee] = useState(false);

    const isAdmin = Boolean((user?.app_metadata as Record<string, unknown> | undefined)?.is_admin);

    useEffect(() => {
        let active = true;

        (async () => {
            const { data } = await supabase.auth.getSession();
            if (!active) return;
            setUser(data.session?.user ?? null);
            setLoading(false);
            if (!data.session?.user) setIsEmployee(false); // ← important
        })();

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!active) return;
            const u = session?.user ?? null;
            setUser(u);
            setLoading(false);
            if (!u) setIsEmployee(false); // ← important
        });

        return () => {
            active = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    // Fetch isEmployee whenever we have a user
    useEffect(() => {
        let active = true;
        (async () => {
            if (!user) {
                setIsEmployee(false); // ← treat logged-out as not employee
                return;
            }
            const { data: sessionData } = await supabase.auth.getSession();
            const token = sessionData.session?.access_token;
            if (!token) {
                setIsEmployee(false);
                return;
            }

            const res = await fetch("/api/is-employee", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!active) return;

            if (!res.ok) {
                setIsEmployee(false);
                return;
            }
            const json = (await res.json()) as { isEmployee: boolean };
            setIsEmployee(Boolean(json.isEmployee));
        })();

        return () => {
            active = false;
        };
    }, [user]);

    async function signInWithPassword(email: string, password: string) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return error ? { error: error.message } : {};
    }

    async function signOut() {
        await supabase.auth.signOut();
        setIsEmployee(false);
    }

    async function getAccessToken() {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token;
    }

    return { user, loading, isAdmin, isEmployee, signInWithPassword, signOut, getAccessToken };
}
