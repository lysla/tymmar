// src/Dashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useEmployee } from "./context/EmployeeContext";

type Settings = { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
type PeriodInfo = { weekKey: string; weekStartDate: string; closed: boolean; totalHours: number };
type EntriesMap = Record<string, { totalHours: number; type: string }>;

function getMonday(d = new Date()) {
    const day = d.getDay(); // 0=Sun, 1=Mon, ...
    const diff = (day === 0 ? -6 : 1) - day;
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    m.setDate(d.getDate() + diff);
    return m;
}
function addDays(date: Date, n: number) {
    const d = new Date(date);
    d.setDate(date.getDate() + n);
    return d;
}
function fmtDayLabel(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: "short" }); // Mon, Tue...
}
function toISO(d: Date) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}
function weekRangeISO(weekStart: Date) {
    const from = toISO(weekStart);
    const to = toISO(addDays(weekStart, 6));
    return { from, to };
}
function shallowEqualHours(a: Record<string, number>, b: Record<string, number>, keys: string[]) {
    for (const k of keys) {
        if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
    }
    return true;
}

export default function Dashboard() {
    const { signOut, getAccessToken } = useAuth();
    const { status, employee, refetch } = useEmployee();

    // ---------------- Week state ----------------
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekDatesISO = useMemo(() => days.map(toISO), [days]);

    // ---------------- Settings (expected hours) ----------------
    const [settings, setSettings] = useState<Settings | null>(null);
    const expectedByDay = useMemo(() => {
        if (!settings) return [8, 8, 8, 8, 8, 0, 0] as const;
        return [settings.mon, settings.tue, settings.wed, settings.thu, settings.fri, settings.sat, settings.sun] as const;
    }, [settings]);

    // ---------------- Period + Hours (server data) ----------------
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [entries, setEntries] = useState<EntriesMap>({});
    const [loadingWeek, setLoadingWeek] = useState(true);
    const [weekErr, setWeekErr] = useState<string | null>(null);

    // Local editable numeric view for inputs
    const hoursView = useMemo(() => {
        const obj: Record<string, number> = {};
        for (const d of weekDatesISO) obj[d] = entries[d]?.totalHours ?? 0;
        return obj;
    }, [entries, weekDatesISO]);
    const [hoursDraft, setHoursDraft] = useState<Record<string, number>>({});

    // snapshot for "unsaved edits" (previous saved state)
    const [savedSnapshot, setSavedSnapshot] = useState<Record<string, number>>({});

    // recompute draft when entries change or week changes
    useEffect(() => {
        setHoursDraft(hoursView);
        setSavedSnapshot(hoursView);
    }, [hoursView]);

    // Is closed?
    const isClosed = Boolean(period?.closed);

    // Dirty check (compare only current week dates)
    const isDirty = !shallowEqualHours(hoursDraft, savedSnapshot, weekDatesISO);

    // Week totals
    const weekTotal = weekDatesISO.reduce((sum, k) => sum + (hoursDraft[k] ?? 0), 0);
    const weekExpected = expectedByDay.reduce((a, b) => a + b, 0);
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;

    function setVal(date: Date, v: number) {
        const k = toISO(date);
        setHoursDraft((h) => ({ ...h, [k]: v }));
    }
    function prevWeek() {
        setWeekStart(addDays(weekStart, -7));
    }
    function nextWeek() {
        setWeekStart(addDays(weekStart, 7));
    }

    // ---------------- Load settings (once) ----------------
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const token = await getAccessToken();
                const r = await fetch("/api/get-settings", {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) throw new Error("Failed to load settings");
                const json = (await r.json()) as { settings: Settings };
                setSettings(json.settings);
            } catch {
                // fallback defaults already handled
            }
        })();
        return () => {
            active = false;
        };
    }, [getAccessToken]);

    // ---------------- Load week ----------------
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                setLoadingWeek(true);
                setWeekErr(null);
                const token = await getAccessToken();
                const { from, to } = weekRangeISO(weekStart);
                const r = await fetch(`/api/get-hours?from=${from}&to=${to}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                });
                if (!active) return;
                if (!r.ok) throw new Error("Failed to load week");
                const json = (await r.json()) as { period: PeriodInfo; entries: EntriesMap };
                setPeriod(json.period);
                setEntries(json.entries || {});
            } catch (e: unknown) {
                setWeekErr(e instanceof Error ? e.message : "Failed to load week");
            } finally {
                if (active) setLoadingWeek(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [weekStart, getAccessToken]);

    // ---------------- Actions ----------------
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    async function handleSaveWeek() {
        try {
            setSaving(true);
            const token = await getAccessToken();
            const payload = {
                entries: weekDatesISO.map((k) => ({
                    date: k,
                    totalHours: Number(hoursDraft[k] ?? 0),
                    type: "work" as const,
                })),
            };
            const r = await fetch("/api/upsert-hours", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(payload),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Save failed");

            await reloadWeek();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Save failed");
        } finally {
            setSaving(false);
        }
    }

    async function handleCloseOrReopen() {
        try {
            setClosing(true);
            const token = await getAccessToken();
            const body = { weekStart: toISO(weekStart) };

            const endpoint = isClosed ? "/api/reopen-period" : "/api/close-period";
            const r = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify(body),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Action failed");

            await reloadWeek();
        } catch (e: unknown) {
            alert(e instanceof Error ? e.message : "Action failed");
        } finally {
            setClosing(false);
        }
    }

    async function reloadWeek() {
        const token = await getAccessToken();
        const { from, to } = weekRangeISO(weekStart);
        const r = await fetch(`/api/get-hours?from=${from}&to=${to}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) throw new Error("Failed to reload week");
        const json = (await r.json()) as { period: PeriodInfo; entries: EntriesMap };
        setPeriod(json.period);
        setEntries(json.entries || {});
        // snapshot will be reset by entries->hoursDraft effect
    }

    // ---------------- Employee state handling ----------------
    if (status === "idle" || status === "loading")
        return (
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );
    if (status === "error") {
        return (
            <div>
                <h2>Something went wrong</h2>
                <button className="button" onClick={() => void refetch()}>
                    Try again
                </button>
            </div>
        );
    }
    if (status === "missing") {
        return (
            <div>
                <h2>Account not configured</h2>
                <p>Your login is active, but your employee profile isn’t set up yet.</p>
                <button className="button" onClick={signOut}>
                    Sign out
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
                <header className="flex items-center justify-between bg-white px-8 py-6 rounded">
                    <h1>
                        <span className="font-serif uppercase">Hello</span> {employee?.name}!
                    </h1>
                    <button className="link" onClick={signOut}>
                        Sign out
                    </button>
                </header>

                <div className="bg-white mt-8 p-8 rounded">
                    {/* Closed badge */}
                    {!loadingWeek && !weekErr && period?.closed && (
                        <p className="text-center error mb-4">
                            <span>This period is closed.</span>
                        </p>
                    )}

                    {/* Week nav */}
                    <div className="flex items-center justify-center gap-x-4">
                        <button className="text-primary font-bold cursor-pointer" onClick={prevWeek} aria-label="Previous week">
                            &lt;
                        </button>
                        <p>
                            {weekStart.toLocaleDateString("en-GB")} — {addDays(weekStart, 6).toLocaleDateString("en-GB")}
                        </p>
                        <button className="text-primary font-bold cursor-pointer" onClick={nextWeek} aria-label="Next week">
                            &gt;
                        </button>
                    </div>

                    {/* Weekly total percentage */}
                    {!loadingWeek && !weekErr && (
                        <>
                            <div className="flex items-end justify-center mt-4">
                                <span className="progress progress--alt [ mr-2 ]" title={`${weekPct}%`}>
                                    <span className="progress__bar progress__bar--alt" style={{ width: `${weekPct}%` }} />
                                </span>
                                <p className="text-xs text-primary leading-[1]">{weekPct}%</p>
                            </div>
                            <div className="flex items-center justify-center gap-x-8">
                                <div className="text-xs text-center mt-4 text-primary">Expected total hours: {weekExpected}</div>
                                <div className="text-xs text-center mt-4 text-dark">Registered: {weekTotal.toFixed(2)}</div>
                            </div>
                        </>
                    )}

                    {/* Loading/Error states for week */}
                    {loadingWeek && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                    {weekErr && !loadingWeek && <p className="py-6 text-center text-red-600">{weekErr}</p>}

                    {/* Days grid */}
                    {!loadingWeek && !weekErr && (
                        <div className="grid grid-cols-7 gap-4 mt-8">
                            {days.map((d, i) => {
                                const expected = expectedByDay[i];
                                const k = toISO(d);
                                const entered = hoursDraft[k] ?? 0;
                                const pct = expected > 0 ? Math.max(0, Math.min(100, Math.round((entered / expected) * 100))) : 0;
                                const label = fmtDayLabel(d);
                                const disabled = expected === 0 || isClosed;

                                return (
                                    <div key={k} className={disabled ? "opacity-40" : ""}>
                                        <p className="font-serif leading-[1]">{label}</p>

                                        <div className="flex items-end mt-4">
                                            <span className="progress [ mr-2 ]" title={`${pct}%`}>
                                                <span className="progress__bar" style={{ width: `${pct}%` }} />
                                            </span>
                                            <p className="text-xs leading-[1] text-primary">{pct}%</p>
                                        </div>

                                        <p className="text-xs mt-4">Expected hours: {expected}</p>

                                        <input type="number" className="input input--text [ mt-4 ]" min={0} max={24} step={1} value={entered || ""} onChange={(e) => setVal(d, Number(e.target.value))} placeholder="0" disabled={disabled} />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* AI helper mock (inactive now) */}
                    <div className="mt-8 pt-8 border-t border-light">
                        <p className="text-sm mb-4">
                            <img src="/images/sparkes.svg" alt="" className="inline-block mr-2 h-5" /> Feeling lazy? Just ask tymmar to fill your hours for you!
                        </p>
                        <div>
                            <input type="text" className="input" placeholder="Just fill in my week normally, I worked all week..." disabled />
                        </div>
                    </div>

                    {/* Unsaved edits notice */}
                    {!loadingWeek && !weekErr && !isClosed && isDirty && (
                        <div className="flex items-center justify-end mt-8 text-xs text-secondary">
                            <p>There are unsaved edits! Remember to save!</p>
                        </div>
                    )}
                </div>

                <footer className="px-16 pt-8 mt-auto">
                    <p className="text-center text-xs">&copy; {new Date().getFullYear()} ELVA11. All rights reserved.</p>
                </footer>
            </div>

            {/* Floating toolbar */}
            <div className="flowing-toolbar flowing-toolbar--alt">
                {!isClosed && (
                    <button className="button button--alt" title="Save period" onClick={handleSaveWeek} disabled={loadingWeek || !isDirty || saving}>
                        {saving ? "Saving…" : "Save period"}
                    </button>
                )}
                <button className="button button--alt2" title={isClosed ? "Reopen period" : "Close period"} onClick={handleCloseOrReopen} disabled={loadingWeek || closing}>
                    {closing ? (isClosed ? "Reopening…" : "Closing…") : isClosed ? "Reopen period" : "Close period"}
                </button>
            </div>
        </>
    );
}
