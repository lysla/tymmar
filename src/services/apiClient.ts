import type { DayEntry, DayType, Period, Setting } from "../types";

type EntriesMap = Record<string, { totalHours: number; type: string }>;

export async function fetchSettings(token?: string) {
    const r = await fetch("/api/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
    if (!r.ok) throw new Error("Failed to load settings");
    return (await r.json()) as { settings: Setting };
}

export async function fetchWeek(from: string, to: string, token?: string) {
    const r = await fetch(`/api/day_entries?from=${from}&to=${to}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) throw new Error("Failed to load week");
    return (await r.json()) as {
        period: Period;
        entriesByDate: EntriesByDate;
        totals: Record<string, { totalHours: number; type: DayType | "mixed" }>;
        expectationsByDate?: Record<string, number>;
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

export async function fetchWeekSummaries(fromISO: string, toISO: string, token?: string, opts?: { signal?: AbortSignal }) {
    const r = await fetch(`/api/week_summaries?from=${fromISO}&to=${toISO}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: opts?.signal,
    });
    if (!r.ok) throw new Error("Failed to load week summaries");
    return r.json() as Promise<{ summaries: any[]; range: { from: string; to: string } }>;
}
