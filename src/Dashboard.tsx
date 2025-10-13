// src/Dashboard.tsx
import { useState } from "react";
import { useAuth } from "./context/AuthContext";
import { useEmployee } from "./context/EmployeeContext";

export default function Dashboard() {
    const { signOut } = useAuth();
    const { status, employee, refetch } = useEmployee();

    // ----- Expected hours per weekday: Mon..Sun -----
    const EXPECTED_BY_DAY = [8, 8, 8, 8, 8, 0, 0] as const;

    // ----- Week helpers & state -----
    function getMonday(d = new Date()) {
        const day = d.getDay(); // 0=Sun, 1=Mon, ...
        const diff = (day === 0 ? -6 : 1) - day; // shift to Monday
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

    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // hours per day (keyed by YYYY-MM-DD)
    const [hours, setHours] = useState<Record<string, number>>({});

    function keyOf(d: Date) {
        return d.toISOString().slice(0, 10);
    }
    function valFor(d: Date) {
        return hours[keyOf(d)] ?? 0;
    }
    function setVal(d: Date, v: number) {
        setHours((h) => ({ ...h, [keyOf(d)]: v }));
    }
    function prevWeek() {
        setWeekStart(addDays(weekStart, -7));
    }
    function nextWeek() {
        setWeekStart(addDays(weekStart, 7));
    }

    // ----- Weekly totals using EXPECTED_BY_DAY -----
    const weekTotal = days.reduce((sum, d) => sum + (valFor(d) || 0), 0);
    const weekExpected = EXPECTED_BY_DAY.reduce<number>((a, b) => a + b, 0); // 40
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;

    // ----- Employee state handling -----
    if (status === "idle" || status === "loading") return <p>Loading…</p>;
    if (status === "error") {
        return (
            <div>
                <h2>Something went wrong</h2>
                <button onClick={() => void refetch()}>Try again</button>
            </div>
        );
    }
    if (status === "missing") {
        return (
            <div>
                <h2>Account not configured</h2>
                <p>Your login is active, but your employee profile isn’t set up yet.</p>
                <button onClick={signOut}>Sign out</button>
            </div>
        );
    }

    return (
        <>
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
                <div className="bg-white p-8">
                    <header className="flex items-center justify-between">
                        <h1>
                            <span className="font-serif uppercase">Hello</span> {employee?.name}!
                        </h1>
                        <button className="link" onClick={signOut}>
                            Sign out
                        </button>
                    </header>
                </div>

                <div className="bg-white mt-8 p-8">
                    <div className="flex items-center justify-center gap-x-4">
                        <button className="text-secondary font-bold cursor-pointer" onClick={prevWeek} aria-label="Previous week">
                            &lt;
                        </button>
                        <p>
                            {weekStart.toLocaleDateString()} — {addDays(weekStart, 6).toLocaleDateString()}
                        </p>
                        <button className="text-secondary font-bold cursor-pointer" onClick={nextWeek} aria-label="Next week">
                            &gt;
                        </button>
                    </div>

                    {/* weekly total percentage */}
                    <div className="flex items-end justify-center mt-4">
                        <span className="progress progress--alt [ mr-2 ]" title={`${weekPct}%`}>
                            <span className="progress__bar progress__bar--alt" style={{ width: `${weekPct}%` }} />
                        </span>
                        <p className="text-xs text-secondary leading-[1]">
                            {weekPct}% &nbsp;({weekTotal.toFixed(2)} / {weekExpected})
                        </p>
                    </div>

                    <div className="grid grid-cols-7 gap-4 mt-8">
                        {days.map((d, i) => {
                            const expected = EXPECTED_BY_DAY[i];
                            const entered = valFor(d);
                            const pct = expected > 0 ? Math.max(0, Math.min(100, Math.round((entered / expected) * 100))) : 0;
                            const label = fmtDayLabel(d);
                            const disabled = expected === 0;

                            return (
                                <div key={keyOf(d)} className={disabled ? "opacity-40" : ""}>
                                    <p className="font-serif leading-[1]">{label}</p>

                                    <div className="flex items-end mt-4">
                                        <span className={`progress [ mr-2 ]`} title={`${pct}%`}>
                                            <span className="progress__bar" style={{ width: `${pct}%` }} />
                                        </span>
                                        <p className={`text-xs leading-[1] text-primary`}>{pct}%</p>
                                    </div>

                                    <p className="text-xs mt-4">Expected hours: {expected}</p>

                                    <input type="number" className={`input input--text [ mt-4 ]`} min={0} max={24} step={0.25} value={entered || ""} onChange={(e) => setVal(d, Number(e.target.value))} placeholder="0" disabled={disabled} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                <footer className="px-16 pt-8 mt-auto">
                    <p className="text-center text-xs">&copy; {new Date().getFullYear()} ELVA11. All rights reserved.</p>
                </footer>
            </div>

            <div className="flowing-toolbar flowing-toolbar--alt">
                <button className="button button--alt" title="Save period">
                    Save period
                </button>
                <button className="button button--alt2" title="Close period">
                    Close period
                </button>
            </div>
        </>
    );
}
