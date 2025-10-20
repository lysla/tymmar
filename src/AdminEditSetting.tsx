// src/AdminEditSetting.tsx
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { supabase } from "./supabase";
import AdminFormSetting, { type FormSettingValues } from "./AdminFormSetting";
import type { Setting } from "./types";

export default function AdminEditSetting() {
    const { id } = useParams();
    const [initial, setInitial] = useState<FormSettingValues | null>(null);
    const [state, setState] = useState<"loading" | "ok" | "error">("loading");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                const r = await fetch(`/api/settings?id=${encodeURIComponent(String(id))}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) return setState("error");
                const json = await r.json();
                setInitial(json as Setting);
                setState("ok");
            } catch {
                setState("error");
            }
        })();
        return () => {
            active = false;
        };
    }, [id]);

    async function handleUpdate(values: FormSettingValues) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        const r = await fetch("/api/settings", {
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
                <h1 className="font-serif text-2xl">Edit setting</h1>
                <Link to="/admin/settings" className="link">
                    ← Back to list
                </Link>
            </div>

            <div className="bg-white p-8 mt-8">
                {state === "loading" && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                {state === "error" && (
                    <p className="error">
                        <span>Could not load setting.</span>
                    </p>
                )}
                {state === "ok" && initial && <AdminFormSetting mode="edit" initial={initial} onSubmit={handleUpdate} submitLabel="Save changes" />}
            </div>
        </>
    );
}
