import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export default function AdminGate({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<"loading" | "forbidden" | "ok">("loading");

    useEffect(() => {
        let mounted = true;
        (async () => {
            const {
                data: { user },
            } = await supabase.auth.getUser();
            if (!mounted) return;
            const isAdmin = Boolean(user?.app_metadata?.is_admin);
            setState(isAdmin ? "ok" : "forbidden");
        })();
        return () => {
            mounted = false;
        };
    }, []);

    if (state === "loading") return <p>Checking admin…</p>;
    if (state === "forbidden") return <p>Forbidden (admin only)</p>;
    return <>{children}</>;
}
