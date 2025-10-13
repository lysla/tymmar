import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router";

type AdminEmployee = {
    id: number;
    name: string;
    surname: string;
    userId: string | null;
    email: string;
};

export default function AdminDashboard() {
    const [list, setList] = useState<AdminEmployee[]>([]);
    const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                const r = await fetch("/api/admin-employees", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) return setStatus("error");

                const json = (await r.json()) as { employees: AdminEmployee[] };
                setList(json.employees ?? []);
                setStatus("ok");
            } catch {
                setStatus("error");
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Employees list</h1>
                <Link to="/admin/add-user" className="link">
                    + Add new
                </Link>
            </div>

            <div className="bg-white p-8 mt-8">
                <div className="grid grid-cols-4 gap-x-4 font-semibold pb-2">
                    <div className="th">Surname</div>
                    <div className="th">Name</div>
                    <div className="th">Email</div>
                    <div className="th">Actions</div>
                </div>

                {status === "loading" && <p className="py-6">Loading…</p>}
                {status === "error" && <p className="py-6 text-red-600">Could not load employees.</p>}
                {status === "ok" && list.length === 0 && <p className="py-6">No employees yet.</p>}

                {status === "ok" && list.length > 0 && (
                    <div className="divide-y divide-light">
                        {list.map((e) => (
                            <div key={e.id} className="grid grid-cols-4 gap-x-4 py-2 -mx-4 px-4 hover:bg-tertiary">
                                <div>{e.surname}</div>
                                <div>{e.name}</div>
                                <div className="text-gray">{e.email || <span>no email</span>}</div>
                                <div>
                                    <button className="link">Edit</button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}
