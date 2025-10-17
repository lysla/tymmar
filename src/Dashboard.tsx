// src/Dashboard.tsx
import { useAuth } from "./context/AuthContext";
import { useEmployee } from "./context/EmployeeContext";
import { WeekDataProvider, useWeekDataContext } from "./context/WeekDataContext";
import WeekNavigator from "./components/WeekNavigator";
import WeekGrid from "./components/WeekGrid";
import AIComposer from "./components/AIComposer";
import FloatingToolbar from "./components/FloatingToolbar";

export default function Dashboard() {
    const { signOut, getAccessToken } = useAuth();
    const { status, employee, refetch } = useEmployee();

    // Auth/employee states
    if (status === "idle" || status === "loading") {
        return (
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
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
        <WeekDataProvider getAccessToken={getAccessToken} startDateISO={employee?.startDate ?? null} endDateISO={employee?.endDate ?? null}>
            <DashboardBody onSignOut={signOut} employeeName={employee?.name || ""} />
        </WeekDataProvider>
    );
}

function DashboardBody({ onSignOut, employeeName }: { onSignOut: () => void; employeeName: string }) {
    const d = useWeekDataContext();

    return (
        <>
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
                <header className="flex items-center justify-between bg-white px-8 py-6">
                    <h1>
                        <span className="font-serif uppercase">Hello</span> {employeeName}!
                    </h1>
                    <button className="link" onClick={onSignOut}>
                        Sign out
                    </button>
                </header>

                <div className="bg-white mt-8 p-8">
                    <div className="flex items-start gap-x-16 pb-8 border-b border-light">
                        <div className="w-auto">
                            {/* Week navigator (inline calendar) */}
                            <WeekNavigator />
                        </div>

                        <div className="w-auto grow">
                            {/* Closed badge */}
                            {!d.weekErr && d.period?.closed && (
                                <p className="error mb-4">
                                    <span>This period is closed.</span>
                                </p>
                            )}

                            {/* AI composer */}
                            {!d.weekErr && <AIComposer />}

                            {/* Weekly totals */}
                            {!d.weekErr && !d.loadingWeek && (
                                <div className="py-8">
                                    <div className="flex items-end">
                                        <span className="progress progress--alt [ mr-2 ]" title={`${d.weekPct}%`}>
                                            <span className="progress__bar progress__bar--alt" style={{ width: `${d.weekPct}%` }} />
                                        </span>
                                        <p className="text-xs text-primary leading-[1]">{d.weekPct}%</p>
                                    </div>
                                    <div className="flex items-center gap-x-8">
                                        <div className="text-xs text-center mt-4 text-primary">Expected total hours: {d.weekExpected}</div>
                                        <div className="text-xs text-center mt-4 text-dark">Registered: {d.weekTotal.toFixed(2)}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Loading/Error */}
                    {d.loadingWeek && <img src="/images/loading.svg" alt="Loading…" className="py-8 mx-auto" />}
                    {d.weekErr && !d.loadingWeek && (
                        <p className="py-6 text-center error">
                            <span>{d.weekErr}</span>
                        </p>
                    )}

                    {/* Grid */}
                    {!d.loadingWeek && !d.weekErr && <WeekGrid />}

                    {/* Unsaved edits */}
                    {!d.loadingWeek && !d.weekErr && !d.isClosed && d.isDirty && (
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
            {!d.loadingWeek && <FloatingToolbar />}
        </>
    );
}
