import { useState, useEffect } from "react";
import { supabase } from "./supabase";
import "./App.css";
import AuthGate from "./AuthGate";
import Admin from "./Admin";
import Employee from "./Employee";

function useIsAdmin() {
    const [role, setRole] = useState<"loading" | "admin" | "user">("loading");

    useEffect(() => {
        let active = true;

        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!active) return;
            const isAdmin = Boolean(user?.app_metadata?.is_admin);
            setRole(isAdmin ? "admin" : "user");
        })();

        const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
            if (!active) return;
            const isAdmin = Boolean(session?.user?.app_metadata?.is_admin);
            setRole(session ? (isAdmin ? "admin" : "user") : "user");
        });

        return () => {
            active = false;
            listener.subscription.unsubscribe();
        };
    }, []);

    return role;
}

export default function App() {
    const role = useIsAdmin();

    return (
        <AuthGate>
            {role === "loading" && <p>Loading…</p>}
            {role === "admin" && <Admin />}
            {role === "user" && <Employee />}
        </AuthGate>
    );
}
