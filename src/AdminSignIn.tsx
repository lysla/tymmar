// src/AdminSignIn.tsx
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "./hooks/useAuth";

export default function AdminSignIn() {
    const { signInWithPassword, isAdmin } = useAuth();
    const [email, setEmail] = useState("");
    const [pwd, setPwd] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const nav = useNavigate();
    const loc = useLocation();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await signInWithPassword(email, pwd);
        if (error) return setMsg(error);
        // only allow admins to proceed
        if (!isAdmin) return setMsg("Forbidden: admin only");
        nav(loc.state?.from?.pathname ?? "/admin", { replace: true });
    }

    return (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
            <input placeholder="admin email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
            <button>Sign in</button>
            {msg && <p>{msg}</p>}
        </form>
    );
}
