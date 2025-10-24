// src/context/PeriodDataContext.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PeriodDataContext, type PeriodDataContextType } from "../hooks/usePeriodDataContext";
import { addDays, getMonday, toISO, weekRangeISO, clampMondayISO, isDateAllowed } from "../helpers";
import { fetchSettings, patchPeriod, fetchWeek, replaceDayEntries, fetchWeekSummaries, type Settings, type PeriodInfo, type EntriesByDate } from "../services";
import { parseISO, startOfDay, isBefore, isAfter, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import type { DayEntry as DayEntryType } from "../types";

// shallow comparator for entries (per-date)
function equalEntriesForDates(a: EntriesByDate, b: EntriesByDate, dates: string[]) {
    for (const d of dates) {
        const aa = a[d] ?? [];
        const bb = b[d] ?? [];
        if (aa.length !== bb.length) return false;
        for (let i = 0; i < aa.length; i++) {
            const x = aa[i] || ({} as Partial<DayEntryType>);
            const y = bb[i] || ({} as Partial<DayEntryType>);
            if (x.type !== y.type || Number(x.hours) !== Number(y.hours) || (x.projectId ?? null) !== (y.projectId ?? null) || (x.note ?? "") !== (y.note ?? "")) {
                return false;
            }
        }
    }
    return true;
}

export function PeriodDataProvider({ children, getAccessToken, startDateISO, endDateISO }: { children: React.ReactNode; getAccessToken: () => Promise<string | undefined>; startDateISO?: string | null; endDateISO?: string | null }) {
    const startBound = startDateISO ?? null;
    const endBound = endDateISO ?? null;
    const boundsReady = true;

    // week state
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const weekStartISO = useMemo(() => toISO(weekStart), [weekStart]);
    const { from, to } = useMemo(() => weekRangeISO(weekStart), [weekStart]);
    const currentKey = `${from}|${to}`;
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekDatesISO = useMemo(() => days.map(toISO), [days]);

    // hydration/dedupe
    const fetchedKeysRef = useRef<Set<string>>(new Set());
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const loadingWeek = fetching || loadedKey !== currentKey;

    // navigation + visible month
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(weekStart));
    const jumpToWeek = useCallback(
        (mondayISO: string) => {
            const clamped = clampMondayISO(mondayISO, startBound, endBound);
            const monday = parseISO(clamped);
            const r = weekRangeISO(monday);
            fetchedKeysRef.current.delete(`${r.from}|${r.to}`);
            setLoadedKey(null);
            setWeekStart(monday);
            setVisibleMonth(startOfMonth(monday));
        },
        [startBound, endBound]
    );
    const prevWeek = useCallback(() => {
        setWeekStart((cur) => {
            const nextMonday = parseISO(clampMondayISO(toISO(addDays(cur, -7)), startBound, endBound));
            const r = weekRangeISO(nextMonday);
            fetchedKeysRef.current.delete(`${r.from}|${r.to}`);
            setLoadedKey(null);
            setVisibleMonth(startOfMonth(nextMonday));
            return nextMonday;
        });
    }, [startBound, endBound]);
    const nextWeek = useCallback(() => {
        setWeekStart((cur) => {
            const nextMonday = parseISO(clampMondayISO(toISO(addDays(cur, 7)), startBound, endBound));
            const r = weekRangeISO(nextMonday);
            fetchedKeysRef.current.delete(`${r.from}|${r.to}`);
            setLoadedKey(null);
            setVisibleMonth(startOfMonth(nextMonday));
            return nextMonday;
        });
    }, [startBound, endBound]);

    // settings
    const [settings, setSettings] = useState<Settings | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);

    // data & derived
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
    const [draftEntriesByDate, setDraftEntriesByDate] = useState<EntriesByDate>({});
    const [expectationsByDate, setExpectationsByDate] = useState<Record<string, number>>({});
    const [weekErr, setWeekErr] = useState<string | null>(null);

    const expectedByDay = useMemo(() => {
        const fallback = settings ? ([settings.mon, settings.tue, settings.wed, settings.thu, settings.fri, settings.sat, settings.sun] as const) : ([8, 8, 8, 8, 8, 0, 0] as const);
        return weekDatesISO.map((iso, i) => (typeof expectationsByDate[iso] === "number" ? expectationsByDate[iso] : fallback[i] ?? 0)) as readonly number[];
    }, [settings, expectationsByDate, weekDatesISO]);

    const weekTotal = useMemo(
        () =>
            weekDatesISO.reduce((sum, iso) => {
                const rows = draftEntriesByDate[iso] ?? [];
                return sum + rows.reduce((s, r) => s + Number(r.hours || 0), 0);
            }, 0),
        [draftEntriesByDate, weekDatesISO]
    );
    const weekExpected = expectedByDay.reduce((a, b) => a + b, 0);
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;
    const isClosed = Boolean(period?.closed);
    const isDirty = useMemo(() => !equalEntriesForDates(draftEntriesByDate, entriesByDate, weekDatesISO), [draftEntriesByDate, entriesByDate, weekDatesISO]);

    // edit helpers
    const addEntry = useCallback(
        (date: Date) => {
            if (!isDateAllowed(date, startBound, endBound)) return;
            const iso = toISO(date);
            setDraftEntriesByDate((cur) => {
                const rows = cur[iso] ? [...cur[iso]] : [];
                rows.push({ type: "work", hours: 0, projectId: null, note: null });
                return { ...cur, [iso]: rows };
            });
        },
        [startBound, endBound]
    );
    const updateEntry = useCallback((date: Date, index: number, patch: Partial<DayEntryType>) => {
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
    const setVal = useCallback(
        (date: Date, hours: number) => {
            if (!isDateAllowed(date, startBound, endBound)) return;
            const iso = toISO(date);
            setDraftEntriesByDate((cur) => {
                const rows = cur[iso] ? [...cur[iso]] : [];
                if (rows.length === 0) rows.push({ type: "work", hours, projectId: null, note: null });
                else rows[0] = { ...rows[0], hours };
                return { ...cur, [iso]: rows };
            });
        },
        [startBound, endBound]
    );

    // settings load once
    useEffect(() => {
        let active = true;
        const toLocalSettings = (src: any): Settings => ({
            mon: Number(src.mon ?? src.mon_hours ?? 8),
            tue: Number(src.tue ?? src.tue_hours ?? 8),
            wed: Number(src.wed ?? src.wed_hours ?? 8),
            thu: Number(src.thu ?? src.thu_hours ?? 8),
            fri: Number(src.fri ?? src.fri_hours ?? 8),
            sat: Number(src.sat ?? src.sat_hours ?? 0),
            sun: Number(src.sun ?? src.sun_hours ?? 0),
        });
        (async () => {
            try {
                const token = await getAccessToken();
                const json = await fetchSettings(token);
                let chosen: any | null = null;
                if (json?.settings && Array.isArray(json.settings)) {
                    chosen = json.settings.find((s: any) => s.isDefault) ?? json.settings[json.settings.length - 1] ?? null;
                } else if (json?.settings && typeof json.settings === "object") {
                    chosen = json.settings;
                } else if (json && typeof json === "object") {
                    chosen = json;
                }
                if (active && chosen) setSettings(toLocalSettings(chosen));
            } finally {
                if (active) setSettingsLoaded(true);
            }
        })();
        return () => {
            active = false;
        };
    }, [getAccessToken]);

    // week load + dedupe
    const reloadWeek = useCallback(async () => {
        if (!boundsReady) return;
        if (fetchedKeysRef.current.has(currentKey)) {
            setLoadedKey(currentKey);
            return;
        }
        setFetching(true);
        try {
            const token = await getAccessToken();
            const json = await fetchWeek(from, to, token);
            setPeriod(json.period);
            setEntriesByDate(json.entriesByDate || {});
            setDraftEntriesByDate(json.entriesByDate || {});
            setExpectationsByDate(json.expectationsByDate || {});
            fetchedKeysRef.current.add(currentKey);
            setLoadedKey(currentKey);
            setWeekErr(null);
        } catch (e: any) {
            setWeekErr(e?.message || "Failed to load week");
        } finally {
            setFetching(false);
        }
    }, [boundsReady, getAccessToken, from, to, currentKey]);

    useEffect(() => {
        if (!boundsReady) return;
        const curISO = toISO(weekStart);
        const clampedISO = clampMondayISO(curISO, startBound, endBound);
        if (clampedISO !== curISO) {
            setLoadedKey(null);
            setWeekStart(parseISO(clampedISO));
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
        weekStart,
        weekStartISO,
        from,
        to,
        days,
        weekDatesISO,
        jumpToWeek,
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
