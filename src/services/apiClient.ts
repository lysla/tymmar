export type Settings = { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
export type PeriodInfo = { weekKey: string; weekStartDate: string; closed: boolean; totalHours: number };
export type EntriesMap = Record<string, { totalHours: number; type: string }>;

export async function fetchSettings(token?: string) {
    const r = await fetch("/api/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error("Failed to load settings");
    return (await r.json()) as { settings: Settings };
}

export async function fetchWeek(fromISO: string, toISO: string, token?: string) {
    const r = await fetch(`/api/hours?from=${fromISO}&to=${toISO}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error("Failed to load week");
    return (await r.json()) as { period: PeriodInfo; entries: EntriesMap };
}

export async function saveWeek(entries: { date: string; totalHours: number; type: "work" }[], token?: string) {
    const r = await fetch("/api/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ entries }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Save failed");
    return data;
}

export async function patchPeriod(action: "close" | "reopen", weekStart: string, token?: string) {
    const r = await fetch("/api/periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, weekStart }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Action failed");
    return data;
}

export async function askAIForHours(params: {
    command: string;
    weekStart: string; // YYYY-MM-DD
    expectedByDay: number[]; // Mon..Sun
    entries: Record<string, { totalHours: number; type?: "work" | "sick" | "time_off" }>;
    allowedDates: string[]; // exactly 7 dates (Mon–Sun)
    mode?: "overwrite-week" | "fill-missing"; // ← NEW
    token?: string;
}) {
    const r = await fetch("/api/ai", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
        },
        body: JSON.stringify(params), // now includes mode
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "AI request failed");

    return data as {
        suggestions: {
            date: string;
            totalHours: number;
            type: "work" | "sick" | "time_off";
        }[];
        rationale?: string | null;
    };
}
