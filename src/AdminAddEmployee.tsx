import { useState } from "react";
import { supabase } from "./supabase";
import { Link, useNavigate } from "react-router";

export default function AdminAddEmployee() {
    const nav = useNavigate();
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
            setTimeout(() => nav("/admin"), 500);
        } catch (err: unknown) {
            setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Add employee</h1>
                <Link to="/admin" className="link">
                    ← Back to list
                </Link>
            </div>

            <div className="bg-white p-8 mt-8">
                <form onSubmit={onSubmit} className="grid gap-4">
                    <label className="grid gap-1">
                        <span className="text-sm">Name *</span>
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Myrs" disabled={loading} />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Surname *</span>
                        <input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Lok" disabled={loading} />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Email *</span>
                        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name.surname@elva11.se" disabled={loading} />
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Password *</span>
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" disabled={loading} />
                    </label>

                    <div className="flex items-center gap-3 pt-2">
                        <button className="button" disabled={loading}>
                            {loading ? "Saving..." : "Add user"}
                        </button>
                        {status && <p className="text-sm">{status}</p>}
                    </div>
                </form>
            </div>
        </>
    );
}
