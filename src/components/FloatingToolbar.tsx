// src/components/FloatingToolbar.tsx
import { useWeekDataContext } from "../context/PeriodDataContext";

export default function FloatingToolbar() {
    const { isClosed, loadingWeek, saving, closing, handleSaveWeek, handleCloseOrReopen, weekExpected, weekTotal, isDirty } = useWeekDataContext();

    const showSave = !isClosed;
    const disabled = loadingWeek || saving || closing;

    // Prevent close if registered hours < expected hours (with a tiny epsilon for float rounding)
    const EPS = 1e-6;
    const canClose = !isDirty && !disabled && (isClosed || Number(weekTotal || 0) + EPS >= Number(weekExpected || 0));
    const missing = Math.max(0, Number(weekExpected || 0) - Number(weekTotal || 0));

    const closeTitle = isDirty ? "Save changes before closing" : isClosed ? "Reopen period" : canClose ? "Close period" : `Cannot close: ${missing.toFixed(2)}h missing`;

    const handleCloseClick = () => {
        if (!isClosed && !canClose) {
            // Guard: do nothing if not eligible to close
            return;
        }
        handleCloseOrReopen();
    };

    return (
        <div className="flowing-toolbar flowing-toolbar--alt">
            {showSave && (
                <button className="button button--alt" title="Save period" aria-label="Save period" onClick={handleSaveWeek} disabled={disabled || saving}>
                    {saving ? "Saving…" : "Save period"}
                </button>
            )}

            <button className="button button--alt2" title={closeTitle} aria-label={isClosed ? "Reopen period" : "Close period"} onClick={handleCloseClick} disabled={disabled || closing || (!isClosed && !canClose)}>
                {!isClosed && !canClose && <img src="/images/alert-white.svg" className="h-[25px] mr-2 inline-block" />}
                {closing ? "Loading…" : isClosed ? "Reopen period" : "Close period"}
            </button>
        </div>
    );
}
