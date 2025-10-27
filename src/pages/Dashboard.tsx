// src/Dashboard.tsx
import { EmployeeProvider } from "../context/EmployeeContext";
import { PeriodDataProvider } from "../context/PeriodDataContext";
import WeekNavigator from "../components/WeekNavigator";
import WeekGrid from "../components/WeekGrid";
import AIComposer from "../components/AIInput";
import FloatingToolbar from "../components/ButtonsToolbar";
import { useAuth, useEmployee, usePeriodDataContext } from "../hooks";

export function Dashboard() {
    const { signOut } = useAuth();
    const { status, employee, refetch } = useEmployee();

    // Auth/employee states
    if (status === "idle" || status === "loading") {
        return (
            <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );
    }
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

    // We have a logged-in employee → provide week data with their date bounds.
    return (
        <EmployeeProvider>
            <PeriodDataProvider employee={employee!}>
                <DashboardBody onSignOut={signOut} employeeName={employee?.name || ""} />
            </PeriodDataProvider>
        </EmployeeProvider>
    );
}

function DashboardBody({ onSignOut, employeeName }: { onSignOut: () => void; employeeName: string }) {
    const d = usePeriodDataContext();

    // Wait for settings to load to avoid flashing fallback expected hours
    if (d.loading) {
        return (
            <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );
    }

    // ------- Weekly stacked progress (work/sick/time_off) with >100% support -------
    const TYPE_COLORS: Record<string, string> = {
        work: "bg-primary",
        sick: "bg-secondary",
        time_off: "bg-tertiary",
    };

    // Aggregate hours by type across all days of the current week
    const byTypeTotals: Record<string, number> = (() => {
        const acc: Record<string, number> = {};
        const map = d.draftEntriesByDate || {};
        for (const iso in map) {
            const rows = map[iso] || [];
            for (const r of rows) {
                const t = (r.type as string) || "work";
                const h = Number(r.hours || 0);
                acc[t] = (acc[t] || 0) + h;
            }
        }
        return acc;
    })();

    const weekExpected = d.weekExpected || 0;
    const weekTotal = Number(d.weekTotal || 0);
    const weekPct = weekExpected > 0 ? Math.round((weekTotal / weekExpected) * 100) : 0; // allow >100%

    const TYPE_ORDER = ["work", "sick", "time_off"];
    const weekSegments = TYPE_ORDER.map((type) => {
        const hours = byTypeTotals[type] || 0;
        const widthPct = weekExpected > 0 ? (hours / weekExpected) * 100 : 0;
        return { type, hours, widthPct };
    }).filter((s) => s.hours > 0);

    return (
        <>
            <div className="w-full min-h-vh bg-paper flex flex-col px-16 pt-8">
                <header className="flex items-center justify-between bg-white px-8 py-6">
                    <h1>
                        <span className="font-serif uppercase">Hello</span> <span className="bg-primary text-light px-1">{employeeName}</span> <span className="font-serif uppercase">!</span>
                    </h1>
                    <button className="link" onClick={onSignOut}>
                        Sign out
                    </button>
                </header>

                <div className="bg-white mt-8 p-8">
                    <div className="flex max-lg:flex-col max-lg:gap-y-8 items-start gap-x-16 md:pb-8 border-b border-light">
                        <div className="w-auto">
                            {/* Week navigator (inline calendar) */}
                            <WeekNavigator />
                        </div>

                        <div className="w-auto grow">
                            {/* Closed badge */}
                            {!d.error && d.period?.closed && (
                                <p className="error mb-4">
                                    <span>This period is closed.</span>
                                </p>
                            )}

                            {/* AI composer */}
                            {!d.error && <AIComposer />}

                            {/* Weekly totals */}
                            {!d.error && !d.loading && (
                                <div className="py-8">
                                    <div className="flex items-end">
                                        <span className="progress progress--alt [ mr-2 ]" title={`${weekPct}%`}>
                                            {weekSegments.map((seg, i) => (
                                                <span key={`${seg.type}-${i}`} className={`progress__bar progress__bar--alt ${TYPE_COLORS[seg.type]}`} style={{ width: `${seg.widthPct}%` }} />
                                            ))}
                                        </span>
                                        <p className="text-xs text-primary leading-none">{weekPct}%</p>
                                    </div>
                                    <div className="flex max-md:flex-col md:items-center gap-x-8">
                                        <div className="text-xs md:text-center mt-4 text-primary">Expected total hours: {d.weekExpected}</div>
                                        <div className="text-xs md:text-center mt-4 text-dark">Registered: {d.weekTotal.toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading/Error */}
                    {d.loading && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                    {d.error && !d.loading && (
                        <p className="py-6 text-center error">
                            <span>{d.error}</span>
                        </p>
                    )}

                    {/* Grid */}
                    {!d.loading && !d.error && <WeekGrid />}

                    {/* Unsaved edits */}
                    {!d.loading && !d.error && !d.isClosed && d.isDirty && (
                        <div className="flex items-center justify-end mt-8 text-xs text-secondary">
                            <p>There are unsaved edits! Remember to save!</p>
                        </div>
                    )}
                </div>

                <footer className="px-16 py-8 mt-auto">
                    <p className="text-center text-xs">&copy; {new Date().getFullYear()} ELVA11. All rights reserved.</p>
                </footer>
            </div>

            {/* Floating toolbar */}
            {!d.loading && <FloatingToolbar />}
        </>
    );
}
