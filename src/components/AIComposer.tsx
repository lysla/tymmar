export default function AIComposer({ value, setValue, busy, closed, message, onApply }: { value: string; setValue: (v: string) => void; busy: boolean; closed: boolean; message: string | null; onApply: () => void }) {
    return (
        <div className={closed ? "opacity-40" : ""}>
            <p className="text-sm mb-4">
                <img src="/images/sparkes.svg" alt="" className="inline-block mr-2 h-5" />
                Feeling lazy? Just ask tymmar to fill your hours!
            </p>
            <div className="flex items-center gap-2">
                <input
                    type="text"
                    className="input"
                    placeholder='e.g. "Fill Mon–Fri with normal hours, mark Wed sick"'
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !busy && !closed) {
                            e.preventDefault();
                            onApply();
                        }
                    }}
                    disabled={busy || closed}
                />
                <button className="button [ whitespace-nowrap ]" onClick={onApply} disabled={busy || closed}>
                    {busy ? "Thinking…" : "↲"}
                </button>
            </div>
            {message && (
                <p className="error mt-4">
                    <span>{message}</span>
                </p>
            )}
        </div>
    );
}
