// src/SignIn.tsx
import { useState } from "react";
import { supabase } from "./supabase";

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [password, setPwd] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setLoading(true);
        setMsg(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        setMsg(error ? error.message : "Signed in!");
        setLoading(false);
    }

    return (
        <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 320 }}>
            <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input placeholder="password" type="password" value={password} onChange={(e) => setPwd(e.target.value)} />
            <button disabled={loading}>{loading ? "..." : "Sign in"}</button>
            {msg && <p>{msg}</p>}
        </form>
    );
}
