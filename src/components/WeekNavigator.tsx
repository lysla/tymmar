// src/components/WeekNavigator.tsx
import { getMondayISO } from "../helpers"; // or from "../helpers" if you barrel-export

export default function WeekNavigator({
    from,
    to,
    weekStartISO,
    onPrev,
    onNext,
    onJump, // receives a monday ISO string
    disabled,
}: {
    from: string; // e.g. "2025-10-06"
    to: string; // e.g. "2025-10-12"
    weekStartISO: string; // current Monday, "YYYY-MM-DD"
    onPrev: () => void;
    onNext: () => void;
    onJump: (mondayISO: string) => void;
    disabled?: boolean;
}) {
    function handlePick(dateISO: string) {
        if (!dateISO) return;
        const monday = getMondayISO(dateISO); // snap selection to its Monday
        onJump(monday);
    }

    return (
        <div className="flex items-center justify-center gap-3 flex-wrap">
            <button className="text-primary font-bold" onClick={onPrev} disabled={disabled} aria-label="Previous week">
                &lt;
            </button>

            <p className="mx-1">
                {new Date(from).toLocaleDateString("en-GB")} — {new Date(to).toLocaleDateString("en-GB")}
            </p>

            <button className="text-primary font-bold" onClick={onNext} disabled={disabled} aria-label="Next week">
                &gt;
            </button>

            {/* Date picker */}
            <input type="date" className="input" value={weekStartISO} onChange={(e) => handlePick(e.target.value)} disabled={disabled} title="Pick a date to jump to its week" />
        </div>
    );
}
