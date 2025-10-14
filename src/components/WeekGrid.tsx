import { fmtDayLabel, toISO } from "../helpers";

export default function WeekGrid({ days, expectedByDay, values, onChange, disabled }: { days: Date[]; expectedByDay: readonly number[]; values: Record<string, number>; onChange: (date: Date, v: number) => void; disabled?: boolean }) {
    return (
        <div className="grid grid-cols-7 gap-4 mt-8">
            {days.map((d, i) => {
                const expected = expectedByDay[i] ?? 0;
                const k = toISO(d);
                const entered = values[k] ?? 0;
                const pct = expected > 0 ? Math.max(0, Math.min(100, Math.round((entered / expected) * 100))) : 0;
                const label = fmtDayLabel(d);
                const isDisabled = disabled || expected === 0;

                return (
                    <div key={k} className={isDisabled ? "opacity-40" : ""}>
                        <p className="font-serif leading-[1]">{label}</p>
                        <div className="flex items-end mt-4">
                            <span className="progress [ mr-2 ]" title={`${pct}%`}>
                                <span className="progress__bar" style={{ width: `${pct}%` }} />
                            </span>
                            <p className="text-xs leading-[1] text-primary">{pct}%</p>
                        </div>
                        <p className="text-xs mt-4">Expected hours: {expected}</p>
                        <input type="number" className="input input--text [ mt-4 ]" min={0} max={24} step={1} value={entered || ""} onChange={(e) => onChange(d, Number(e.target.value))} placeholder="0" disabled={isDisabled} />
                    </div>
                );
            })}
        </div>
    );
}
