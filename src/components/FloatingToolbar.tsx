export default function FloatingToolbar({ showSave, onSave, saving, onToggleClose, closing, isClosed, disabled }: { showSave: boolean; onSave: () => void; saving: boolean; onToggleClose: () => void; closing: boolean; isClosed: boolean; disabled?: boolean }) {
    return (
        <div className="flowing-toolbar flowing-toolbar--alt">
            {showSave && (
                <button className="button button--alt" title="Save period" onClick={onSave} disabled={disabled || saving}>
                    {saving ? "Saving…" : "Save period"}
                </button>
            )}
            <button className="button button--alt2" title={isClosed ? "Reopen period" : "Close period"} onClick={onToggleClose} disabled={disabled || closing}>
                {closing ? (isClosed ? "Reopening…" : "Closing…") : isClosed ? "Reopen period" : "Close period"}
            </button>
        </div>
    );
}
