import { useState, useEffect } from "react";
import { askAI } from "./api";
import { supabase } from "./supabase";

export default function AdminDashboard() {
    const [text, setText] = useState<string>("Loading...");

    useEffect(() => {
        async function fetchAI() {
            try {
                const result = await askAI("Hello world");
                setText(result);
            } catch (err) {
                setText("Error contacting AI 😢");
                console.error(err);
            }
        }
        fetchAI();
    }, []);

    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);
        if (!email.trim() || !password.trim() || !name.trim() || !surname.trim()) {
            setStatus("Please enter all fields.");
            return;
        }
        setLoading(true);
        try {
            const sb = await supabase.auth.getSession();
            const token = sb.data.session?.access_token;
            const r = await fetch("/api/create-user", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ email: email.trim(), password: password.trim(), name: name.trim(), surname: surname.trim() }),
            });

            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Request failed");
            setStatus(`User created: #${data?.userId} ${data?.employee?.name} ${data?.employee?.surname}`);
            setEmail("");
            setPassword("");
            setName("");
            setSurname("");
        } catch (err: unknown) {
            setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    }

    return (
        <main style={{ padding: 24, fontFamily: "system-ui" }}>
            <h1>tymmar</h1>
            <br />
            {text}
            <br />
            <h2>Add employee user</h2>
            <p>Data is stored in Supabase.</p>
            <button
                onClick={handleSignOut}
                style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#eee",
                    cursor: "pointer",
                }}>
                Sign out
            </button>
            <br />
            <form onSubmit={onSubmit} style={{ display: "grid", gap: 12, maxWidth: 420 }}>
                <label>
                    Name
                    <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada" disabled={loading} />
                </label>
                <label>
                    Surname
                    <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Lovelace" disabled={loading} />
                </label>
                <label>
                    Email
                    <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="mail@mail.com" disabled={loading} />
                </label>
                <label>
                    Password
                    <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" disabled={loading} />
                </label>
                <button disabled={loading}>{loading ? "Saving..." : "Add user"}</button>
            </form>
            {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </main>
    );
}
