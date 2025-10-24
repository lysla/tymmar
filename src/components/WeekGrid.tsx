// src/components/WeekGrid.tsx
import { startOfDay, parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import { fmtDayLabel, toISO } from "../helpers";
import { useWeekDataContext } from "../context/PeriodDataContext";

export default function WeekGrid() {
    const { days, expectedByDay, draftEntriesByDate, addEntry, updateEntry, removeEntry, isClosed, loadingWeek, startDateISO, endDateISO } = useWeekDataContext();

    const startBound = startDateISO ? startOfDay(parseISO(startDateISO)) : null;
    const endBound = endDateISO ? startOfDay(parseISO(endDateISO)) : null;

    return (
        <div className="weekgrid">
            <div className="flex gap-x-8 mt-8">
                {days.map((d, i) => {
                    const expected = expectedByDay[i] ?? 0;
                    const iso = toISO(d);

                    const inStart = !startBound || !isBefore(d, startBound);
                    const inEnd = !endBound || !isAfter(d, endBound);
                    const withinEmployment = inStart && inEnd;

                    const disabled = isClosed || loadingWeek || !withinEmployment;
                    const disabledHint = !withinEmployment ? "Outside your employment dates" : undefined;

                    const rows = draftEntriesByDate[iso] ?? [];

                    const totalEntered = rows.reduce((s, r) => s + Number(r.hours || 0), 0);
                    const pct = expected > 0 ? Math.round((totalEntered / expected) * 100) : 0;
                    const exceededHours = totalEntered - expected;

                    // Build stacked segments by type
                    const byTypeTotals: Record<string, number> = rows.reduce((acc, r) => {
                        const t = r.type || "work";
                        const h = Number(r.hours || 0);
                        acc[t] = (acc[t] || 0) + h;
                        return acc;
                    }, {} as Record<string, number>);

                    const segments = Object.entries(byTypeTotals).map(([type, hours]) => ({
                        type,
                        hours,
                        widthPct: expected > 0 ? (hours / expected) * 100 : 0,
                    }));

                    const TYPE_COLORS: Record<string, string> = {
                        work: "bg-primary",
                        sick: "bg-secondary",
                        time_off: "bg-tertiary",
                    };

                    const isToday = isSameDay(d, new Date());

                    return (
                        <div key={iso} className={disabled ? "opacity-40 pointer-events-none" : ""} title={disabledHint}>
                            <p className={`font-serif leading-[1] ${isToday ? "text-secondary" : ""}`}>
                                {fmtDayLabel(d)}
                                {exceededHours > 0 && (
                                    <span className="ml-4 text-dark text-xs inline-flex items-center px-1 gap-x-1 bg-tertiary font-sans">
                                        <img src="/images/alert.svg" alt="" className="inline-block h-[15px]" />
                                        {exceededHours}
                                    </span>
                                )}
                            </p>

                            <div className="flex items-end mt-4">
                                <span className="progress [ mr-2 ]" title={`${pct}%`}>
                                    {segments.map((seg, idx) => (
                                        <span key={`${seg.type}-${idx}`} className={`progress__bar ${TYPE_COLORS[seg.type] || ""}`} style={{ width: `${seg.widthPct}%` }} />
                                    ))}
                                </span>
                                <p className="text-xs leading-[1] text-primary">{pct}%</p>
                            </div>

                            <p className="text-xs mt-2">Expected: {expected}</p>

                            {/* rows */}
                            <div className="flex flex-col mt-2">
                                {rows.map((r, idx) => (
                                    <div key={idx} className={`p-3 [ mt-4 ] relative ${TYPE_COLORS[r.type ?? "work"]}`}>
                                        <div className="flex flex-col">
                                            <input
                                                type="number"
                                                className="input input--alt [ mb-2 ]"
                                                min={0}
                                                max={24}
                                                step={1}
                                                value={Number.isFinite(r.hours) ? r.hours : 0}
                                                onChange={(e) => {
                                                    const v = Number(e.target.value);
                                                    updateEntry(d, idx, { hours: Number.isFinite(v) ? v : 0 });
                                                }}
                                                disabled={disabled}
                                            />

                                            <select className="input input--alt [ text-xs ]" value={r.type} onChange={(e) => updateEntry(d, idx, { type: e.target.value as any })} disabled={disabled}>
                                                <option value="work">Working</option>
                                                <option value="sick">Sick</option>
                                                <option value="time_off">Time off</option>
                                            </select>
                                            {/* Project placeholder (disabled for now) */}
                                            {r.type == "work" && (
                                                <select className="input input--alt text-xs w-40 opacity-60" disabled>
                                                    <option>— Project (soon) —</option>
                                                </select>
                                            )}

                                            <button className="remove" onClick={() => removeEntry(d, idx)} disabled={disabled}>
                                                x
                                            </button>
                                        </div>

                                        {/* Optional notes later */}
                                        {/* <input className="input input--alt mt-2" placeholder="Note (optional)" /> */}
                                    </div>
                                ))}
                            </div>

                            <div className="mt-2">
                                <button className="link link--mini" onClick={() => addEntry(d)} disabled={disabled}>
                                    + Entry
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
