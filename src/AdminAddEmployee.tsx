import { useState } from "react";
import { supabase } from "./supabase";
import { Link, useNavigate } from "react-router";

export default function AdminAddEmployee() {
    const nav = useNavigate();
    const [name, setName] = useState("");
    const [surname, setSurname] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [errors, setErrors] = useState<{ name?: string; surname?: string; email?: string; password?: string }>({});
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);
        setErrors({}); // reset

        const newErrors: typeof errors = {};
        if (!name.trim()) newErrors.name = "Name is required";
        if (!surname.trim()) newErrors.surname = "Surname is required";
        if (!email.trim()) newErrors.email = "Email is required";
        if (!password.trim()) newErrors.password = "Password is required";

        if (Object.keys(newErrors).length > 0) {
            setErrors(newErrors);
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

            //setStatus(`User created: #${data?.userId} ${data?.employee?.name} ${data?.employee?.surname}`);
            setTimeout(() => nav("/admin"), 2000);
        } catch (err: unknown) {
            setStatus(`! ${err instanceof Error ? err.message : "unknown"}`);
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
                <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
                    <label className="grid gap-1">
                        <span className="text-sm">Name *</span>
                        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Myrs" disabled={loading} />
                        {errors.name && (
                            <p className="error">
                                <span>{errors.name}</span>
                            </p>
                        )}
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Surname *</span>
                        <input className="input" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Lok" disabled={loading} />
                        {errors.surname && (
                            <p className="error">
                                <span>{errors.surname}</span>
                            </p>
                        )}
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Email *</span>
                        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name.surname@elva11.se" disabled={loading} />
                        {errors.email && (
                            <p className="error">
                                <span>{errors.email}</span>
                            </p>
                        )}
                    </label>

                    <label className="grid gap-1">
                        <span className="text-sm">Password *</span>
                        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" disabled={loading} />
                        {errors.password && (
                            <p className="error">
                                <span>{errors.password}</span>
                            </p>
                        )}
                    </label>

                    <div className="flex flex-col gap-y-3 pt-2 mr-auto">
                        <button className="button" disabled={loading}>
                            {loading ? "Saving..." : "Add user"}
                        </button>
                        {status && (
                            <p className="error">
                                <span>{status}</span>
                            </p>
                        )}
                    </div>
                </form>
            </div>
        </>
    );
}
