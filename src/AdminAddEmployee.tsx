// src/AdminAddEmployee.tsx
import { Link, useNavigate } from "react-router";
import { supabase } from "./supabase";
import AdminFormEmployee, { type FormEmployeeValues } from "./AdminFormEmployee";

export default function AdminAddEmployee() {
    const nav = useNavigate();

    async function handleCreate(values: FormEmployeeValues) {
        const sb = await supabase.auth.getSession();
        const token = sb.data.session?.access_token;

        const r = await fetch("/api/employees", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        });

        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Request failed");

        setTimeout(() => nav("/admin"), 800);
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
                <AdminFormEmployee mode="create" initial={{ name: "", surname: "", email: "", password: "" }} onSubmit={handleCreate} />
            </div>
        </>
    );
}
