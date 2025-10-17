import type { DayEntry, DayType } from "../types";

export type Settings = { mon: number; tue: number; wed: number; thu: number; fri: number; sat: number; sun: number };
export type PeriodInfo = { weekKey: string; weekStartDate: string; closed: boolean; totalHours: number };
export type EntriesMap = Record<string, { totalHours: number; type: string }>;
export type EntriesByDate = Record<string, Partial<DayEntry>[]>;

export async function fetchSettings(token?: string) {
    const r = await fetch("/api/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error("Failed to load settings");
    return (await r.json()) as { settings: Settings };
}

export async function fetchWeek(from: string, to: string, token?: string) {
    const r = await fetch(`/api/day_entries?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) throw new Error("Failed to load week");
    return (await r.json()) as {
        period: PeriodInfo;
        entriesByDate: EntriesByDate;
        totals: Record<string, { totalHours: number; type: DayType | "mixed" }>;
    };
}

export async function replaceDayEntries(entriesByDate: EntriesByDate, token?: string) {
    const r = await fetch(`/api/day_entries`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ mode: "replace-day-entries", entriesByDate }),
    });
    const json = await r.json();
    if (!r.ok) throw new Error(json?.error || "Save failed");
    return json as { ok: true; dates: number };
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
