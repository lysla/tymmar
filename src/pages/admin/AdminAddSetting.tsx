// src/AdminAddSetting.tsx
import { Link, useNavigate } from "react-router";
import { supabase } from "../../supabase";
import AdminFormSetting, { type FormSettingValues } from "../../components/admin/AdminFormSetting";

export function AdminAddSetting() {
    const nav = useNavigate();

    async function handleCreate(values: FormSettingValues) {
        const sb = await supabase.auth.getSession();
        const token = sb.data.session?.access_token;

        const r = await fetch("/api/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify(values),
        });

        const data = await r.json();
        if (!r.ok) throw new Error(data?.error || "Request failed");

        setTimeout(() => nav("/admin/settings"), 800);
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Add setting</h1>
                <Link to="/admin/settings" className="link">
                    ← Back to list
                </Link>
            </div>

            <div className="bg-white p-8 mt-8">
                <AdminFormSetting mode="create" initial={{ mon_hours: 8, tue_hours: 8, wed_hours: 8, thu_hours: 8, fri_hours: 8, sat_hours: 0, sun_hours: 0, isDefault: false }} onSubmit={handleCreate} />
            </div>
        </>
    );
}
