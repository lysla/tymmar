// src/components/AIComposer.tsx
import { useWeekDataContext } from "../context/WeekDataContext";

export default function AIComposer() {
    const { aiCmd, setAiCmd, aiBusy, aiMsg, handleAIApply, isClosed, loadingWeek } = useWeekDataContext();

    const closed = isClosed || loadingWeek;

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
                    placeholder='e.g. "Fill whole week"'
                    value={aiCmd}
                    onChange={(e) => setAiCmd(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey && !aiBusy && !closed) {
                            e.preventDefault();
                            handleAIApply();
                        }
                    }}
                    disabled={aiBusy || closed}
                />
                <button className="button [ whitespace-nowrap ]" onClick={handleAIApply} disabled={aiBusy || closed}>
                    {aiBusy ? "Thinking…" : "↲"}
                </button>
            </div>

            {aiMsg && (
                <p className="error mt-4">
                    <span>{aiMsg}</span>
                </p>
            )}
        </div>
    );
}
