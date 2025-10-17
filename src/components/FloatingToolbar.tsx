// src/components/FloatingToolbar.tsx
import { useWeekDataContext } from "../context/WeekDataContext";

export default function FloatingToolbar() {
    const { isClosed, loadingWeek, saving, closing, handleSaveWeek, handleCloseOrReopen } = useWeekDataContext();

    const showSave = !isClosed;
    const disabled = loadingWeek;

    return (
        <div className="flowing-toolbar flowing-toolbar--alt">
            {showSave && (
                <button className="button button--alt" title="Save period" aria-label="Save period" onClick={handleSaveWeek} disabled={disabled || saving}>
                    {saving ? "Saving…" : "Save period"}
                </button>
            )}

            <button className="button button--alt2" title={isClosed ? "Reopen period" : "Close period"} aria-label={isClosed ? "Reopen period" : "Close period"} onClick={handleCloseOrReopen} disabled={disabled || closing}>
                {closing ? (isClosed ? "Reopening…" : "Closing…") : isClosed ? "Reopen period" : "Close period"}
            </button>
        </div>
    );
}
