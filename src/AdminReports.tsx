// src/AdminReports.tsx
import { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";

type ByDatesRow = {
    employeeId: number;
    employeeName: string;
    date: string; // YYYY-MM-DD
    expectedHours: number;
    workHours: number;
    sickHours: number;
    timeOffHours: number;
    totalHours: number;
    extraWorkHours: number;
    hasSick: boolean;
    hasTimeOff: boolean;
};

type MissingPeriodsRow = {
    employeeId: number;
    employeeName: string;
    weekKey: string; // YYYY-Www
    weekStartDate: string; // YYYY-MM-DD
    totalHours: number;
};

type EmployeeMini = { id: number; name: string; surname: string };
type ReportKind = "by-dates" | "missing-periods";

export default function AdminReports() {
    /* ---------------- UI state ---------------- */
    const [tab, setTab] = useState<ReportKind>("by-dates");

    // Filters — By Dates
    const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
    const monthStartISO = useMemo(() => {
        const d = new Date();
        const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
        return x.toISOString().slice(0, 10);
    }, []);
    const [from, setFrom] = useState<string>(monthStartISO);
    const [to, setTo] = useState<string>(todayISO);
    const [employeeId, setEmployeeId] = useState<string>("all");

    // Filters — Missing Periods
    const thisMondayISO = useMemo(() => {
        const d = new Date();
        const day = d.getUTCDay(); // 0..6
        const diff = (day === 0 ? -6 : 1) - day;
        const x = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
        x.setUTCDate(x.getUTCDate() + diff);
        return x.toISOString().slice(0, 10);
    }, []);
    const [before, setBefore] = useState<string>(thisMondayISO);
    const [onlyActive, setOnlyActive] = useState<boolean>(true);

    // Data / states
    const [employees, setEmployees] = useState<EmployeeMini[]>([]);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const [rowsByDates, setRowsByDates] = useState<ByDatesRow[] | null>(null);
    const [rowsMissing, setRowsMissing] = useState<MissingPeriodsRow[] | null>(null);

    // Download states
    const [downloadingByDates, setDownloadingByDates] = useState(false);
    const [downloadingMissing, setDownloadingMissing] = useState(false);

    /* ---------------- helpers ---------------- */
    async function authedFetch(input: string, init?: RequestInit) {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        return fetch(input, {
            ...(init || {}),
            headers: {
                ...(init?.headers || {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        });
    }

    function fmt(n: number) {
        return Number(n).toFixed(2).replace(/\.00$/, "");
    }

    async function download(url: string, filename: string) {
        const r = await authedFetch(url, { headers: { Accept: "text/csv" } });
        const blob = await r.blob();
        if (!r.ok) {
            try {
                const j = JSON.parse(await blob.text());
                throw new Error(j?.error || "Download failed");
            } catch {
                throw new Error("Download failed");
            }
        }
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    }

    /* ---------------- load employees (for select) ---------------- */
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const r = await authedFetch("/api/employees");
                if (!r.ok) throw new Error("Failed to load employees");
                const json = await r.json();
                const list: EmployeeMini[] = (json.employees ?? []).map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    surname: e.surname,
                }));
                if (active) setEmployees(list);
            } catch (e) {
                console.error(e);
            }
        })();
        return () => {
            active = false;
        };
    }, []);

    /* ---------------- run reports ---------------- */
    async function runByDates() {
        setErr(null);
        setLoading(true);
        setRowsByDates(null);
        try {
            const qs = new URLSearchParams({
                report: "by-dates",
                from,
                to,
                ...(employeeId !== "all" ? { employeeId } : {}),
            }).toString();
            const r = await authedFetch(`/api/reports?${qs}`);
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || "Request failed");
            setRowsByDates(j.rows ?? []);
        } catch (e: any) {
            setErr(e?.message || "Request failed");
        } finally {
            setLoading(false);
        }
    }

    async function runMissingPeriods() {
        setErr(null);
        setLoading(true);
        setRowsMissing(null);
        try {
            const qs = new URLSearchParams({
                report: "missing-periods",
                ...(before ? { before } : {}),
                ...(onlyActive ? { onlyActive: "true" } : {}),
            }).toString();
            const r = await authedFetch(`/api/reports?${qs}`);
            const j = await r.json();
            if (!r.ok) throw new Error(j?.error || "Request failed");
            setRowsMissing(j.rows ?? []);
        } catch (e: any) {
            setErr(e?.message || "Request failed");
        } finally {
            setLoading(false);
        }
    }

    /* ---------------- CSV download helpers with loading flags ---------------- */
    async function downloadByDatesCSV() {
        try {
            setErr(null);
            setDownloadingByDates(true);
            const qs = new URLSearchParams({
                report: "by-dates",
                from,
                to,
                ...(employeeId !== "all" ? { employeeId } : {}),
                format: "csv",
            }).toString();
            await download(`/api/reports?${qs}`, "report-by-dates.csv");
        } catch (e: any) {
            setErr(e?.message || "Download failed");
        } finally {
            setDownloadingByDates(false);
        }
    }

    async function downloadMissingCSV() {
        try {
            setErr(null);
            setDownloadingMissing(true);
            const qs = new URLSearchParams({
                report: "missing-periods",
                ...(before ? { before } : {}),
                ...(onlyActive ? { onlyActive: "true" } : {}),
                format: "csv",
            }).toString();
            await download(`/api/reports?${qs}`, "report-missing-periods.csv");
        } catch (e: any) {
            setErr(e?.message || "Download failed");
        } finally {
            setDownloadingMissing(false);
        }
    }

    /* ---------------- aggregates for by-dates ---------------- */
    const totals = useMemo(() => {
        if (!rowsByDates) return null as any;
        return rowsByDates.reduce(
            (acc, r) => {
                acc.expected += r.expectedHours;
                acc.work += r.workHours;
                acc.sick += r.sickHours;
                acc.toff += r.timeOffHours;
                acc.total += r.totalHours;
                acc.extra += r.extraWorkHours;
                return acc;
            },
            { expected: 0, work: 0, sick: 0, toff: 0, total: 0, extra: 0 }
        );
    }, [rowsByDates]);

    /* ---------------- UI ---------------- */
    return (
        <>
            <div className="flex items-center justify-between">
                <h1 className="font-serif text-2xl">Reports</h1>
            </div>

            <div className="bg-white p-8 mt-8">
                {/* Tabs */}
                <div className="flex gap-2 border-b border-gray-200">
                    <button className={`px-4 py-2 -mb-[1px] border-b-2 ${tab === "by-dates" ? "border-primary font-semibold" : "border-transparent text-gray-500"}`} onClick={() => setTab("by-dates")}>
                        By dates
                    </button>
                    <button className={`px-4 py-2 -mb-[1px] border-b-2 ${tab === "missing-periods" ? "border-primary font-semibold" : "border-transparent text-gray-500"}`} onClick={() => setTab("missing-periods")}>
                        Missing periods
                    </button>
                </div>

                {/* Panel */}
                {tab === "by-dates" ? (
                    <div className="pt-6">
                        {/* Filters */}
                        <div className="flex flex-wrap items-end gap-4">
                            <label className="grid text-sm">
                                <span className="mb-1">From *</span>
                                <input type="date" className="input w-48" value={from} onChange={(e) => setFrom(e.target.value)} />
                            </label>
                            <label className="grid text-sm">
                                <span className="mb-1">To *</span>
                                <input type="date" className="input w-48" value={to} onChange={(e) => setTo(e.target.value)} />
                            </label>
                            <label className="grid text-sm">
                                <span className="mb-1">Employee</span>
                                <select className="input w-64" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                                    <option value="all">All employees</option>
                                    {employees.map((e) => (
                                        <option key={e.id} value={e.id}>
                                            {e.surname} {e.name}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <div className="flex items-center gap-3">
                                <button className="button bg-primary text-white !py-[6px]" onClick={runByDates} disabled={loading || downloadingByDates}>
                                    {loading ? "Loading…" : "Run report"}
                                </button>
                                <button className="button button--alt !py-[6px]" onClick={() => void downloadByDatesCSV()} disabled={downloadingByDates || loading} title={downloadingByDates ? "Preparing CSV…" : "Download as CSV"}>
                                    {downloadingByDates ? "Downloading…" : "Download CSV"}
                                </button>
                            </div>
                        </div>

                        {/* Errors */}
                        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

                        {/* Table */}
                        {rowsByDates && (
                            <div className="mt-6 overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="py-2 pr-4">Date</th>
                                            <th className="py-2 pr-4">Employee</th>
                                            <th className="py-2 pr-4">Expected</th>
                                            <th className="py-2 pr-4">Work</th>
                                            <th className="py-2 pr-4">Sick</th>
                                            <th className="py-2 pr-4">Time off</th>
                                            <th className="py-2 pr-4">Total</th>
                                            <th className="py-2 pr-4">Extra work</th>
                                            <th className="py-2 pr-4">Flags</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowsByDates.map((r, i) => (
                                            <tr key={i} className="border-b last:border-0 hover:bg-primary/10">
                                                <td className="py-2 pr-4 font-mono">{r.date}</td>
                                                <td className="py-2 pr-4">{r.employeeName}</td>
                                                <td className="py-2 pr-4">{fmt(r.expectedHours)}</td>
                                                <td className="py-2 pr-4">{fmt(r.workHours)}</td>
                                                <td className="py-2 pr-4">{r.sickHours && <span className="bg-tertiary text-primary p-1">{fmt(r.sickHours)}</span>}</td>
                                                <td className="py-2 pr-4">{r.timeOffHours && <span className="bg-secondary text-white p-1">{fmt(r.timeOffHours)}</span>}</td>
                                                <td className="py-2 pr-4">{fmt(r.totalHours)}</td>
                                                <td className="py-2 pr-4">{r.extraWorkHours && <span className="bg-primary text-white p-1">{fmt(r.extraWorkHours)}</span>}</td>
                                                <td className="py-2 pr-4">
                                                    <div className="flex gap-2">
                                                        {r.expectedHours > r.workHours + r.sickHours + r.timeOffHours && <img src="/images/alert.svg" alt="" className="inline-block h-[20px]" title="missing hours" />}
                                                        {r.hasSick && <span className="px-2 py-0.5 bg-tertiary text-dark/90">sick</span>}
                                                        {r.hasTimeOff && <span className="px-2 py-0.5 bg-secondary text-white/90">time off</span>}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {/* Totals row */}
                                        {totals && (
                                            <tr className="border-t">
                                                <td className="py-2 pr-4 font-semibold" colSpan={2}>
                                                    Totals
                                                </td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.expected)}</td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.work)}</td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.sick)}</td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.toff)}</td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.total)}</td>
                                                <td className="py-2 pr-4 font-semibold">{fmt(totals.extra)}</td>
                                                <td />
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                                {rowsByDates.length === 0 && <p className="text-sm mt-4 opacity-70">No rows.</p>}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="pt-6">
                        {/* Filters */}
                        <div className="flex flex-wrap items-end gap-4">
                            <div className="flex flex-col gap-y-4">
                                <label className="grid text-sm">
                                    <span className="mb-1">Before (Monday)</span>
                                    <input type="date" className="input w-48" value={before} onChange={(e) => setBefore(e.target.value)} />
                                </label>
                                <div className="inline-flex items-center gap-2 text-sm">
                                    <div className="checkbox">
                                        <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} />
                                        <label>Only active employees</label>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button className="button bg-primary text-white !py-[6px]" onClick={runMissingPeriods} disabled={loading || downloadingMissing}>
                                        {loading ? "Loading…" : "Run report"}
                                    </button>
                                    <button className="button button--alt !py-[6px]" onClick={() => void downloadMissingCSV()} disabled={downloadingMissing || loading} title={downloadingMissing ? "Preparing CSV…" : "Download as CSV"}>
                                        {downloadingMissing ? "Downloading…" : "Download CSV"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Errors */}
                        {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

                        {/* Table */}
                        {rowsMissing && (
                            <div className="mt-6 overflow-auto">
                                <table className="min-w-full text-sm">
                                    <thead>
                                        <tr className="text-left border-b">
                                            <th className="py-2 pr-4">Week start</th>
                                            <th className="py-2 pr-4">Week</th>
                                            <th className="py-2 pr-4">Employee</th>
                                            <th className="py-2 pr-4">Registered hours</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rowsMissing.map((r, i) => (
                                            <tr key={i} className="border-b last:border-0">
                                                <td className="py-2 pr-4 font-mono">{r.weekStartDate}</td>
                                                <td className="py-2 pr-4">{r.weekKey}</td>
                                                <td className="py-2 pr-4">{r.employeeName}</td>
                                                <td className="py-2 pr-4">{fmt(r.totalHours)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {rowsMissing.length === 0 && <p className="text-sm mt-4 opacity-70">No open past periods 🎉</p>}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
