// src/components/WeekGrid.tsx
import { startOfDay, parseISO, isBefore, isAfter, isSameDay } from "date-fns";
import { fmtDayLabel, toISO } from "../helpers";
import { useWeekDataContext } from "../context/WeekDataContext";

export default function WeekGrid() {
    const { days, expectedByDay, draftEntriesByDate, addEntry, updateEntry, removeEntry, isClosed, loadingWeek, startDateISO, endDateISO } = useWeekDataContext();

    const startBound = startDateISO ? startOfDay(parseISO(startDateISO)) : null;
    const endBound = endDateISO ? startOfDay(parseISO(endDateISO)) : null;

    return (
        <div className="grid grid-cols-7 gap-x-8 mt-8">
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
                const pct = expected > 0 ? Math.max(0, Math.min(100, Math.round((totalEntered / expected) * 100))) : 0;

                const isToday = isSameDay(d, new Date());

                return (
                    <div key={iso} className={disabled ? "opacity-40 pointer-events-none" : ""} title={disabledHint}>
                        <p className={`font-serif leading-[1] ${isToday ? "text-secondary" : ""}`}>{fmtDayLabel(d)}</p>

                        <div className="flex items-end mt-4">
                            <span className="progress [ mr-2 ]" title={`${pct}%`}>
                                <span className="progress__bar" style={{ width: `${pct}%` }} />
                            </span>
                            <p className="text-xs leading-[1] text-primary">{pct}%</p>
                        </div>

                        <p className="text-xs mt-2">Expected hours: {expected}</p>

                        {/* rows */}
                        <div className="flex flex-col mt-2">
                            {rows.map((r, idx) => (
                                <div key={idx} className="p-3 bg-primary [ mt-2 ] relative">
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
                                        <select className="input input--alt text-xs w-40 opacity-60" disabled>
                                            <option>— Project (soon) —</option>
                                        </select>

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
    );
}
