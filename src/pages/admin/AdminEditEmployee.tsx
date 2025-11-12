// src/AdminEditEmployee.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "../../supabase";
import { AdminFormEmployee, type FormEmployeeValues } from "../../components/admin";
import type { Employee } from "../../types";

export function AdminEditEmployee() {
    const { id } = useParams();
    const [initial, setInitial] = useState<FormEmployeeValues | null>(null);
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                const r = await fetch(`/api/employees?id=${encodeURIComponent(String(id))}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) return setState("error");
                const { employee } = (await r.json()) as { employee?: Employee };
                if (!employee) {
                    setState("error");
                    return;
                }
                setInitial(employee);
                setState("ok");
            } catch {
                setState("error");
            }
        })();
        return () => {
            active = false;
        };
    }, [id]);

    async function handleUpdate(values: FormEmployeeValues) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Missing auth token, please sign in again.");
        const r = await fetch("/api/employees", {
            method: "PUT",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ id: Number(id), ...values }),
        });
        const json = await r.json();
        if (!r.ok) throw new Error(json?.error || "Request failed");
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Edit employee</h1>
                <Link to="/admin" className="link">
                    ← Back to list
                </Link>
            </div>

            <div className="bg-white p-8 mt-8">
                {state === "loading" && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                {state === "error" && (
                    <p className="error">
                        <span>Could not load employee.</span>
                    </p>
                )}
                {state === "ok" && initial && <AdminFormEmployee mode="edit" initial={initial} onSubmit={handleUpdate} submitLabel="Save changes" />}
            </div>
        </>
    );
}
