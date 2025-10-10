// src/SignIn.tsx  (employee)
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useAuth } from "./hooks/useAuth";

export default function SignIn() {
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
        // if someone logs in as admin here, send them to admin
        nav(isAdmin ? "/admin" : loc.state?.from?.pathname ?? "/", { replace: true });
    }

    return (
        <main>
            <h1>Employee Sign In</h1>
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
                <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input placeholder="password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                <button>Sign in</button>
                {msg && <p>{msg}</p>}
            </form>
        </main>
    );
}
