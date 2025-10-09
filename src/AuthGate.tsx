import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import SignIn from "./SignIn";

export default function AuthGate({ children }: { children: React.ReactNode }) {
    const [status, setStatus] = useState<"loading" | "signedOut" | "signedIn">("loading");

    useEffect(() => {
        let mounted = true;

        async function init() {
            const { data } = await supabase.auth.getSession();
            if (!mounted) return;
            setStatus(data.session ? "signedIn" : "signedOut");
        }
        init();

        const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
            setStatus(session ? "signedIn" : "signedOut");
        });

        return () => {
            mounted = false;
            sub.subscription.unsubscribe();
        };
    }, []);

    if (status === "loading") return <p>Loading…</p>;
    if (status === "signedOut") return <SignIn />;
    return <>{children}</>;
}
