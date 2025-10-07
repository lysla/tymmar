// src/App.tsx (or a dedicated Admin page)
import { useState } from "react";
import { SignedOut, SignInButton, SignedIn, UserButton } from "@clerk/clerk-react";

export default function App() {
    const [email, setEmail] = useState("");
    const [firstName, setFirst] = useState("");
    const [lastName, setLast] = useState("");
    const [password, setPwd] = useState("");
    const [msg, setMsg] = useState<string | null>(null);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMsg(null);
        const r = await fetch("/api/admin-create-user", {
            method: "POST",
            headers: { "Content-Type": "application/json" }, // temp guard
            body: JSON.stringify({ email, firstName, lastName, password: password || undefined }),
        });
        const data = await r.json();
        setMsg(r.ok ? `Created user ${data.email}` : `Error: ${data.error || r.statusText}`);
    }

    return (
        <div>
            <header style={{ display: "flex", justifyContent: "space-between", padding: 12 }}>
                <h1>tymmar</h1>
                <SignedIn>
                    <UserButton />
                </SignedIn>
                <SignedOut>
                    <SignInButton />
                </SignedOut>
            </header>

            <form onSubmit={onSubmit} style={{ display: "grid", gap: 8, maxWidth: 360, padding: 12 }}>
                <input placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                <input placeholder="first name" value={firstName} onChange={(e) => setFirst(e.target.value)} />
                <input placeholder="last name" value={lastName} onChange={(e) => setLast(e.target.value)} />
                <input placeholder="(optional) password" value={password} onChange={(e) => setPwd(e.target.value)} />
                <button>Create user</button>
            </form>
            {msg && <p>{msg}</p>}
        </div>
    );
}
