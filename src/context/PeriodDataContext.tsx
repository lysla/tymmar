// src/context/PeriodDataContext.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeriodDataContext, type EntriesByDate, type PeriodDataContextType } from "../hooks/usePeriodDataContext";
import { addDays, getMonday, toISO, weekRangeISO, clampMondayISO, isDateAllowed } from "../helpers";
import { parseISO, startOfDay, isBefore, isAfter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { DayEntry, Employee, Period, Setting } from "../types";
import { useAuth } from "../hooks";

/* 
async function replaceDayEntries(entriesByDate: EntriesByDate, token?: string) {
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

async function patchPeriod(action: "close" | "reopen", weekStart: string, token?: string) {
    const r = await fetch("/api/periods", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action, weekStart }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "Action failed");
    return data;
}

async function fetchWeekSummaries(fromISO: string, toISO: string, token?: string, opts?: { signal?: AbortSignal }) {
    const r = await fetch(`/api/week_summaries?from=${fromISO}&to=${toISO}`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: opts?.signal,
    });
    if (!r.ok) throw new Error("Failed to load week summaries");
    return r.json() as Promise<{ summaries: any[]; range: { from: string; to: string } }>;
}*/

/** 👀 helpers that tells us if the draft entries are != then perms => isDirty */
function equalEntriesForDates(a: EntriesByDate, b: EntriesByDate, dates: string[]) {
    for (const d of dates) {
        const aa = a[d] ?? [];
        const bb = b[d] ?? [];
        if (aa.length !== bb.length) return false;
        for (let i = 0; i < aa.length; i++) {
            const x = aa[i] || ({} as Partial<DayEntry>);
            const y = bb[i] || ({} as Partial<DayEntry>);
            if (x.type !== y.type || Number(x.hours) !== Number(y.hours) || (x.projectId ?? null) !== (y.projectId ?? null) || (x.note ?? "") !== (y.note ?? "")) {
                return false;
            }
        }
    }
    return true;
}

export function PeriodDataProvider({ children, employee }: { children: React.ReactNode; employee: Employee }) {
    const { getAccessToken } = useAuth();

    /** 👀 loading and errors */
    const [loadingSettings, setLoadingSettings] = useState(false);
    const [loadingPeriodData, setLoadingPeriodData] = useState(false);

    const loading = useMemo(() => loadingSettings && loadingPeriodData, [loadingSettings, loadingPeriodData]);
    const [error, setError] = useState<string | null>(null);

    /** 👀 period start date */
    const [fromDate, setFromDate] = useState<Date>(() => getMonday(new Date()));

    /** 👀 period bounds derived from fromDate */
    const toDate = useMemo(() => endOfWeek(fromDate, { weekStartsOn: 1 }), [fromDate]);
    const fromDateISO = useMemo(() => toISO(fromDate), [fromDate]);
    const toDateISO = useMemo(() => toISO(toDate), [toDate]);

    /** 👀 period key */
    const [currentKey, setCurrentKey] = useState<string>(`${fromDateISO}|${toDateISO}`);

    /** 👀 days in the period */
    const { days, daysISO } = useMemo(() => {
        const days = eachDayOfInterval({
            start: startOfDay(fromDate),
            end: startOfDay(toDate),
        });
        return { days, daysISO: days.map(toISO) };
    }, [fromDate, toDate]);

    /** 👀 calendar navigation by month */
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(fromDate));
    const jumpToPeriod = useCallback((fromDateISO: string) => {
        const f = parseISO(fromDateISO);
        const t = endOfWeek(f, { weekStartsOn: 1 });
        setCurrentKey(`${f}|${t}`);
        setFromDate(f);
        setVisibleMonth(startOfMonth(f));
    }, []);

    /** 👀 settings for the current period */
    const [settings, setSettings] = useState<Setting | null>(null);

    /** 👀 period data */
    const [period, setPeriod] = useState<Period | null>(null);

    /** 👀 entries perm and draft */
    const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
    const [draftEntriesByDate, setDraftEntriesByDate] = useState<EntriesByDate>({});

    /** 👀 hour expectations mapping */
    const [expectationsByDate, setExpectationsByDate] = useState<Record<string, number>>({});
    const expectedByDay = useMemo(() => {
        const fallback = settings ? [settings.monHours, settings.tueHours, settings.wedHours, settings.thuHours, settings.friHours, settings.satHours, settings.sunHours] : [8, 8, 8, 8, 8, 0, 0];
        return daysISO.map((iso, i) => (typeof expectationsByDate[iso] === "number" ? expectationsByDate[iso] : fallback[i] ?? 0)) as readonly number[];
    }, [settings, expectationsByDate, daysISO]);

    /** 👀 current period info */
    const weekTotal = useMemo(
        () =>
            daysISO.reduce((sum, iso) => {
                const rows = draftEntriesByDate[iso] ?? [];
                return sum + rows.reduce((s, r) => s + Number(r.hours || 0), 0);
            }, 0),
        [draftEntriesByDate, daysISO]
    );
    const weekExpected = expectedByDay.reduce((a, b) => a + b, 0);
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;
    const isClosed = Boolean(period?.closed);
    const isDirty = useMemo(() => !equalEntriesForDates(draftEntriesByDate, entriesByDate, daysISO), [draftEntriesByDate, entriesByDate, daysISO]);

    /** 👀 entry ui management functions */
    const addEntry = useCallback(
        (date: Date) => {
            if (!isDateAllowed(date, employee?.startDate, employee?.endDate)) return;
            const iso = toISO(date);
            setDraftEntriesByDate((cur) => {
                const rows = cur[iso] ? [...cur[iso]] : [];
                rows.push({ type: "work", hours: 0, projectId: null, note: null });
                return { ...cur, [iso]: rows };
            });
        },
        [employee?.startDate, employee?.endDate]
    );
    const updateEntry = useCallback((date: Date, index: number, patch: Partial<DayEntry>) => {
        const iso = toISO(date);
        setDraftEntriesByDate((cur) => {
            const rows = cur[iso] ? [...cur[iso]] : [];
            if (!rows[index]) return cur;
            rows[index] = { ...rows[index], ...patch };
            return { ...cur, [iso]: rows };
        });
    }, []);
    const removeEntry = useCallback((date: Date, index: number) => {
        const iso = toISO(date);
        setDraftEntriesByDate((cur) => {
            const rows = cur[iso] ? [...cur[iso]] : [];
            if (!rows[index]) return cur;
            rows.splice(index, 1);
            return { ...cur, [iso]: rows };
        });
    }, []);

    /** 👀 retrieve the current setting for the employee */
    useEffect(() => {
        (async () => {
            setLoadingSettings(true);
            try {
                const token = await getAccessToken();
                const r = await fetch("/api/settings", { headers: token ? { Authorization: `Bearer ${token}` } : {} });
                if (!r.ok) throw new Error("Failed to load settings");
                const { setting } = await r.json();
                setSettings(setting as Setting);
            } catch {
                setSettings(null);
            } finally {
                setLoadingSettings(false);
            }
        })();
    }, [getAccessToken]);

    /** 👀 load all the period data info */
    const loadPeriod = useCallback(async () => {
        setLoadingPeriodData(true);
        try {
            const token = await getAccessToken();
            const r = await fetch(`/api/day_entries?from=${from}&to=${to}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!r.ok) throw new Error("Failed to load week");
            const json = (await r.json()) as {
                period: Period;
                entriesByDate: EntriesByDate;
                totals: Record<string, { totalHours: number; type: DayType | "mixed" }>;
                expectationsByDate?: Record<string, number>;
            };

            setPeriod(json.period);
            setEntriesByDate(json.entriesByDate || {});
            setDraftEntriesByDate(json.entriesByDate || {});
            setExpectationsByDate(json.expectationsByDate || {});
            setError(null);
        } catch (e: any) {
            setError(e?.message || "Failed to load week");
        } finally {
            setLoadingPeriodData(false);
        }
    }, [boundsReady, getAccessToken, from, to, currentKey]);

    useEffect(() => {
        if (!boundsReady) return;
        const curISO = toISO(weekStart);
        const clampedISO = clampMondayISO(curISO, startBound, endBound);
        if (clampedISO !== curISO) {
            setLoadedKey(null);
            setFromDate(parseISO(clampedISO));
            return;
        }
        if (loadedKey !== currentKey) setLoadedKey(null);
        void reloadWeek();
    }, [boundsReady, weekStart, startBound, endBound, currentKey, loadedKey, reloadWeek]);

    // summaries for calendar badges
    useEffect(() => {
        setVisibleMonth((m) => m ?? startOfMonth(weekStart));
    }, [weekStart]);

    const allowedInterval = useMemo(() => {
        const s = startBound ? parseISO(startBound) : null;
        const e = endBound ? parseISO(endBound) : null;
        return s || e ? { start: s ?? new Date(-8640000000000000), end: e ?? new Date(8640000000000000) } : null;
    }, [startBound, endBound]);

    const monthSpan = useMemo(() => {
        const monthStart = startOfMonth(visibleMonth);
        const monthEnd = endOfMonth(visibleMonth);
        const spanFrom = startOfWeek(monthStart, { weekStartsOn: 1 });
        const spanTo = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const clampFrom = allowedInterval ? (spanFrom < allowedInterval.start ? allowedInterval.start : spanFrom) : spanFrom;
        const clampTo = allowedInterval ? (spanTo > allowedInterval.end ? allowedInterval.end : spanTo) : spanTo;
        return { clampFrom, clampTo };
    }, [visibleMonth, allowedInterval]);

    const fromISO_M = useMemo(() => toISO(monthSpan.clampFrom), [monthSpan.clampFrom]);
    const toISO_M = useMemo(() => toISO(monthSpan.clampTo), [monthSpan.clampTo]);
    const summariesKey = `${fromISO_M}|${toISO_M}`;

    const fetchedSummariesRef = useRef<Set<string>>(new Set());
    const [loadedSummariesKey, setLoadedSummariesKey] = useState<string | null>(null);
    const [fetchingSummaries, setFetchingSummaries] = useState(false);
    const [summaries, setSummaries] = useState<Record<string, any>>({});

    const reloadSummaries = useCallback(async () => {
        if (!boundsReady) return;
        if (monthSpan.clampFrom > monthSpan.clampTo) {
            setSummaries({});
            setLoadedSummariesKey(summariesKey);
            return;
        }
        if (fetchedSummariesRef.current.has(summariesKey)) {
            setLoadedSummariesKey(summariesKey);
            return;
        }
        setFetchingSummaries(true);
        try {
            const token = await getAccessToken();
            const { summaries } = await fetchWeekSummaries(fromISO_M, toISO_M, token);
            const map: Record<string, any> = {};
            for (const s of summaries) map[s.monday] = s;
            setSummaries(map);
            fetchedSummariesRef.current.add(summariesKey);
            setLoadedSummariesKey(summariesKey);
        } catch {
            setSummaries({});
        } finally {
            setFetchingSummaries(false);
        }
    }, [boundsReady, monthSpan.clampFrom, monthSpan.clampTo, summariesKey, fromISO_M, toISO_M, getAccessToken]);

    useEffect(() => {
        if (!boundsReady) return;
        if (loadedSummariesKey !== summariesKey) setLoadedSummariesKey(null);
        void reloadSummaries();
    }, [boundsReady, summariesKey, loadedSummariesKey, reloadSummaries]);

    const invalidateSummaries = useCallback(() => {
        fetchedSummariesRef.current.delete(summariesKey);
        setLoadedSummariesKey(null);
    }, [summariesKey]);

    // actions
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleSaveWeek = useCallback(async () => {
        try {
            setSaving(true);
            const token = await getAccessToken();
            const payload: EntriesByDate = {};
            for (const iso of weekDatesISO) {
                payload[iso] = (draftEntriesByDate[iso] ?? []).map((r) => ({
                    type: r.type,
                    hours: Number(r.hours || 0),
                    projectId: r.projectId ?? null,
                    note: r.note ?? null,
                }));
            }
            setEntriesByDate(() => payload); // optimistic
            await replaceDayEntries(payload, token);
            setDraftEntriesByDate(payload);
            invalidateSummaries();
            await reloadSummaries();
            setWeekErr(null);
            fetchedKeysRef.current.add(currentKey);
            setLoadedKey(currentKey);
        } finally {
            setSaving(false);
        }
    }, [getAccessToken, draftEntriesByDate, weekDatesISO, invalidateSummaries, reloadSummaries, currentKey]);

    const handleCloseOrReopen = useCallback(async () => {
        try {
            setClosing(true);
            const token = await getAccessToken();
            await patchPeriod(isClosed ? "reopen" : "close", weekStartISO, token);
            setPeriod((p) => (p ? { ...p, closed: !isClosed } : p));
            invalidateSummaries();
            await reloadSummaries();
            fetchedKeysRef.current.add(currentKey);
            setLoadedKey(currentKey);
        } finally {
            setClosing(false);
        }
    }, [getAccessToken, isClosed, weekStartISO, invalidateSummaries, reloadSummaries, currentKey]);

    // AI
    const [aiCmd, setAiCmd] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const [aiMsg, setAiMsg] = useState<string | null>(null);

    const handleAIApply = useCallback(async () => {
        try {
            setAiBusy(true);
            setAiMsg(null);
            const token = await getAccessToken();

            const weekSet = new Set(weekDatesISO);
            const inEmployment = (iso: string) => {
                const d = startOfDay(parseISO(iso));
                if (startBound && isBefore(d, startBound)) return false;
                if (endBound && isAfter(d, endBound)) return false;
                return true;
            };

            const weekdayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

            const currentEntries = weekDatesISO.map((iso, i) => {
                const expectedHoursForDay = Number(expectedByDay[i] ?? 0);
                return {
                    date: iso,
                    expectedHours: expectedHoursForDay,
                    weekdayName: weekdayNames[i],
                    entries: (draftEntriesByDate[iso] ?? [])
                        .map((r) => ({
                            hours: Math.max(0, Math.min(24, Number(r.hours || 0))),
                            type: (r.type ?? "work") as "work" | "sick" | "time_off",
                        }))
                        .filter((e) => e.hours > 0),
                };
            });

            const r = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    command: aiCmd || "Fill a normal week based on expected hours for each day.",
                    currentEntries,
                }),
            });

            const { suggestions, error } = await r.json();
            if (!r.ok) throw new Error(error || "AI failed");

            type DayType = "work" | "sick" | "time_off";
            const normalized: { date: string; entries: { hours: number; type: DayType }[] }[] = (suggestions ?? [])
                .map((s: any) => {
                    const date = String(s.date).trim();
                    if (Array.isArray(s.entries)) {
                        const entries = s.entries
                            .map((e: any) => ({
                                hours: Math.max(0, Math.min(24, Number(e.hours || 0))),
                                type: (e.type ?? "work") as DayType,
                            }))
                            .filter((e: any) => e.hours > 0);
                        return { date, entries };
                    } else {
                        const hours = Math.max(0, Math.min(24, Number(s.totalHours || 0)));
                        const type = (s.type ?? "work") as DayType;
                        const entries = hours > 0 ? [{ hours, type }] : [];
                        return { date, entries };
                    }
                })
                .filter((row: any) => weekSet.has(row.date) && inEmployment(row.date) && row.entries.length > 0);

            if (suggestions.length > 0 && normalized.length === 0) {
                setAiMsg("AI returned no applicable changes for this week.");
                return;
            }

            setDraftEntriesByDate((cur) => {
                const map = new Map<string, { hours: number; type: DayType }[]>();
                for (const row of normalized) map.set(row.date, row.entries);

                const next = { ...cur };
                for (const iso of weekDatesISO) {
                    const entries = map.get(iso) ?? [];
                    next[iso] = entries.map((e) => ({
                        type: e.type,
                        hours: e.hours,
                        projectId: null,
                        note: null,
                    }));
                }
                return next;
            });

            setAiCmd("");
        } catch (e: any) {
            setAiMsg(e?.message || "AI failed");
        } finally {
            setAiBusy(false);
        }
    }, [aiCmd, getAccessToken, expectedByDay, weekDatesISO, startBound, endBound, draftEntriesByDate]);

    const value: PeriodDataContextType = {
        // week navigation & range
        fromISO: weekStartISO,
        from,
        to,
        days,
        weekDatesISO,
        jumpToPeriod,
        prevWeek,
        nextWeek,

        // bounds
        startDateISO: startBound,
        endDateISO: endBound,

        // settings/data/derived
        settings,
        expectedByDay,
        period,
        entriesByDate,
        draftEntriesByDate,
        isClosed,
        isDirty,
        weekTotal,
        weekExpected,
        weekPct,

        // loading/error
        loadingWeek,
        weekErr,
        loadingSettings: !settingsLoaded,

        // row edit helpers
        addEntry,
        updateEntry,
        removeEntry,
        setVal,

        // actions
        handleSaveWeek,
        handleCloseOrReopen,
        saving,
        closing,

        // AI
        aiCmd,
        setAiCmd,
        aiBusy,
        aiMsg,
        handleAIApply,

        // Navigator month + summaries
        visibleMonth,
        setVisibleMonth,
        summaries,
        fetchingSummaries,
        reloadSummaries,
    };

    return <PeriodDataContext.Provider value={value}>{children}</PeriodDataContext.Provider>;
}
