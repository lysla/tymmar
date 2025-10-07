import { useState, useEffect } from "react";
import { askAI } from "./api";
import "./App.css";

export default function App() {
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
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);
        if (!name.trim() || !surname.trim()) {
            setStatus("Please enter both name and surname.");
            return;
        }
        setLoading(true);
        try {
            const r = await fetch("/api/employees", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), surname: surname.trim() }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Request failed");
            setStatus(`Employee created: #${data?.id} ${data?.name} ${data?.surname}`);
            setName("");
            setSurname("");
        } catch (err: unknown) {
            setStatus(`Error: ${err instanceof Error ? err.message : "unknown"}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <main style={{ padding: 24, fontFamily: "system-ui" }}>
            <h1>tymmar</h1>
            <br />
            {text}
            <br />
            <h2>Add employee</h2>
            <p>Data is stored in Neon database using Drizzle ORM.</p>
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
                <button disabled={loading}>{loading ? "Saving..." : "Add employee"}</button>
            </form>
            {status && <p style={{ marginTop: 12 }}>{status}</p>}
        </main>
    );
}
