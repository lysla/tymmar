export default function WeekNavigator({ from, to, onPrev, onNext, disabled }: { from: string; to: string; onPrev: () => void; onNext: () => void; disabled?: boolean }) {
    return (
        <div className="flex items-center justify-center gap-x-4">
            <button className="text-primary font-bold" onClick={onPrev} disabled={disabled} aria-label="Previous week">
                {" "}
                &lt;{" "}
            </button>
            <p>
                {from} — {to}
            </p>
            <button className="text-primary font-bold" onClick={onNext} disabled={disabled} aria-label="Next week">
                {" "}
                &gt;{" "}
            </button>
        </div>
    );
}
