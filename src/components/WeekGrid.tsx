// src/components/WeekGrid.tsx
import { fmtDayLabel, toISO } from "../helpers";
import { isAfter, isBefore, parseISO, startOfDay } from "date-fns";

export default function WeekGrid({
    days,
    expectedByDay,
    values,
    onChange,
    disabled,
    startDateISO,
    endDateISO,
}: {
    days: Date[];
    expectedByDay: readonly number[];
    values: Record<string, number>;
    onChange: (date: Date, v: number) => void;
    disabled?: boolean;
    /** Employment interval (inclusive). If omitted -> no bound on that side */
    startDateISO?: string | null;
    endDateISO?: string | null;
}) {
    // Pre-parse bounds once (start/end at 00:00 local)
    const startBound = startDateISO ? startOfDay(parseISO(startDateISO)) : null;
    const endBound = endDateISO ? startOfDay(parseISO(endDateISO)) : null;

    return (
        <div className="grid grid-cols-7 gap-4 mt-8">
            {days.map((d, i) => {
                const expected = expectedByDay[i] ?? 0;
                const k = toISO(d);
                const entered = values[k] ?? 0;
                const pct = expected > 0 ? Math.max(0, Math.min(100, Math.round((entered / expected) * 100))) : 0;

                // within employment range? (inclusive)
                const inStart = !startBound || !isBefore(d, startBound);
                const inEnd = !endBound || !isAfter(d, endBound);
                const withinEmployment = inStart && inEnd;

                // final disabled flag (no more "expected===0")
                const isDisabled = disabled || !withinEmployment;

                // small hint if disabled by employment window
                const disabledHint = !withinEmployment ? "Outside your employment dates" : undefined;

                return (
                    <div key={k} className={isDisabled ? "opacity-40" : ""} title={disabledHint}>
                        <p className="font-serif leading-[1]">{fmtDayLabel(d)}</p>

                        <div className="flex items-end mt-4">
                            <span className="progress [ mr-2 ]" title={`${pct}%`}>
                                <span className="progress__bar" style={{ width: `${pct}%` }} />
                            </span>
                            <p className="text-xs leading-[1] text-primary">{pct}%</p>
                        </div>

                        <p className="text-xs mt-4">Expected hours: {expected}</p>

                        <input
                            type="number"
                            className="input input--text [ mt-4 ]"
                            min={0}
                            max={24}
                            step={1}
                            value={entered || ""}
                            onChange={(e) => {
                                if (isDisabled) return; // guard
                                onChange(d, Number(e.target.value));
                            }}
                            placeholder="0"
                            disabled={isDisabled}
                        />
                    </div>
                );
            })}
        </div>
    );
}
