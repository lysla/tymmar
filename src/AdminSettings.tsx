import { useEffect, useRef, useState } from "react";
import { supabase } from "./supabase";
import { Link } from "react-router";
import type { Setting } from "./types";

export default function AdminSettings() {
    const [list, setList] = useState<Setting[]>([]);
    const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

    // selection
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const selectAllRef = useRef<HTMLInputElement>(null);

    const allIds = list.map((e) => e.id);
    const allChecked = list.length > 0 && selected.size === list.length;
    const isIndeterminate = selected.size > 0 && selected.size < list.length;

    useEffect(() => {
        if (selectAllRef.current) selectAllRef.current.indeterminate = isIndeterminate;
    }, [isIndeterminate]);

    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const { data } = await supabase.auth.getSession();
                const token = data.session?.access_token;
                const r = await fetch("/api/settings", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) return setStatus("error");
                const json = (await r.json()) as { settings: Setting[] };
                setList(json.settings ?? []);
                setStatus("ok");
            } catch {
                setStatus("error");
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
        setSelected(e.target.checked ? new Set(allIds) : new Set());
    }
    function toggleOne(id: number) {
        return (e: React.ChangeEvent<HTMLInputElement>) => {
            setSelected((prev) => {
                const next = new Set(prev);
                if (e.target.checked) next.add(id);
                else next.delete(id);
                return next;
            });
        };
    }

    async function handleDeleteSelected() {
        if (selected.size === 0) return;
        const ids = Array.from(selected);
        const confirmText = ids.length === 1 ? "Delete the selected setting? This will also remove linked hours." : `Delete ${ids.length} selected settings? This will also remove linked hours.`;
        if (!window.confirm(confirmText)) return;

        setDeleting(true);
        try {
            const { data } = await supabase.auth.getSession();
            const token = data.session?.access_token;

            const r = await fetch("/api/settings", {
                method: "DELETE",
                headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
                body: JSON.stringify({ ids }),
            });
            const json = await r.json();
            if (!r.ok) throw new Error(json?.error || "Delete failed");

            // Optimistically update UI
            setList((prev) => prev.filter((row) => !selected.has(row.id)));
            setSelected(new Set());
        } catch (e) {
            console.error(e);
            alert(e instanceof Error ? e.message : "Delete failed");
        } finally {
            setDeleting(false);
        }
    }

    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Settings list</h1>
                <Link to="/admin/add-setting" className="link">
                    + Add new
                </Link>
            </div>

            {/* Bulk action bar */}
            {selected.size > 0 && (
                <div className="flowing-toolbar">
                    <button className="button button--alt" onClick={handleDeleteSelected} disabled={deleting} title="Delete selected">
                        {deleting ? "Deleting…" : "- Delete selected"}
                    </button>
                </div>
            )}

            <div className="bg-white p-8 mt-8">
                <div className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 font-semibold pb-2">
                    <div className="th">
                        <div className="checkbox">
                            <input ref={selectAllRef} type="checkbox" id="cbListAll" checked={allChecked} onChange={toggleAll} disabled={list.length === 0} />
                            <label htmlFor="cbListAll"></label>
                        </div>
                    </div>
                    <div className="th">Hours</div>
                    <div className="th">Default</div>
                    <div className="th">
                        <span className="opacity-0">Edit</span>
                    </div>
                </div>

                {status === "loading" && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                {status === "error" && (
                    <p className="py-6 error">
                        <span>Could not load settings.</span>
                    </p>
                )}
                {status === "ok" && list.length === 0 && <p className="py-6">No settings yet.</p>}

                {status === "ok" && list.length > 0 && (
                    <div className="divide-y divide-light">
                        {list.map((e) => {
                            const cbId = `cbList${e.id}`;
                            const checked = selected.has(e.id);
                            return (
                                <div key={e.id} className="grid grid-cols-[auto_1fr_1fr_auto] gap-x-4 py-2 -mx-4 px-4 hover:bg-tertiary">
                                    <div className="checkbox">
                                        <input type="checkbox" id={cbId} checked={checked} onChange={toggleOne(e.id)} />
                                        <label htmlFor={cbId}></label>
                                    </div>
                                    <div className="flex items-center">{`${e.mon_hours},${e.tue_hours},${e.wed_hours},${e.thu_hours},${e.fri_hours},${e.sat_hours},${e.sun_hours}`}</div>
                                    <div className="text-gray text-xs flex items-center">{e.isDefault ? "Yes" : "No"}</div>
                                    <div className="text-right">
                                        <Link className="link" to={`/admin/setting/${e.id}/edit`}>
                                            Edit
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </>
    );
}
