import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { addDays, getMonday, toISO, weekRangeISO, clampMondayISO, isDateAllowed } from "../helpers";
import { fetchSettings, patchPeriod, fetchWeek, replaceDayEntries, fetchWeekSummaries, type Settings, type PeriodInfo, type EntriesByDate } from "../services";
import { parseISO, startOfDay, isBefore, isAfter, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import type { DayEntry as DayEntryType, WeekSummary } from "../types";

type DayEntry = Partial<DayEntryType>;

/* ---------- deep compare utility for isDirty ---------- */
function equalEntriesForDates(a: EntriesByDate, b: EntriesByDate, dates: string[]) {
    for (const d of dates) {
        const aa = a[d] ?? [];
        const bb = b[d] ?? [];
        if (aa.length !== bb.length) return false;
        for (let i = 0; i < aa.length; i++) {
            const x = aa[i] || ({} as DayEntry);
            const y = bb[i] || ({} as DayEntry);
            if (x.type !== y.type || Number(x.hours) !== Number(y.hours) || (x.projectId ?? null) !== (y.projectId ?? null) || (x.note ?? "") !== (y.note ?? "")) {
                return false;
            }
        }
    }
    return true;
}

export function useWeekData(getAccessToken: () => Promise<string | undefined>, opts?: { startDateISO?: string | null; endDateISO?: string | null; boundsReady?: boolean }) {
    const startBound = opts?.startDateISO ?? null;
    const endBound = opts?.endDateISO ?? null;
    const boundsReady = Boolean(opts?.boundsReady ?? true);

    // ——— week state ———
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const weekStartISO = useMemo(() => toISO(weekStart), [weekStart]);
    const { from, to } = useMemo(() => weekRangeISO(weekStart), [weekStart]);
    const currentKey = `${from}|${to}`;

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekDatesISO = useMemo(() => days.map(toISO), [days]);

    // ——— hydration/loading control + dedupe ———
    const fetchedKeysRef = useRef<Set<string>>(new Set());
    const [loadedKey, setLoadedKey] = useState<string | null>(null);
    const [fetching, setFetching] = useState(false);
    const loadingWeek = fetching || loadedKey !== currentKey;

    // ——— navigation (invalidate target range so it refetches) ———
    const jumpToWeek = useCallback(
        (mondayISO: string) => {
            const clamped = clampMondayISO(mondayISO, startBound, endBound);
            const monday = parseISO(clamped);
            const r = weekRangeISO(monday);
            const targetKey = `${r.from}|${r.to}`;
            fetchedKeysRef.current.delete(targetKey);
            setLoadedKey(null);
            setWeekStart(monday);
            // also sync visible month to that week (so navigator month follows selection)
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
            // keep visible month aligned
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

    // ——— settings ———
    const [settings, setSettings] = useState<Settings | null>(null);
    const expectedByDay = useMemo(() => {
        if (!settings) return [8, 8, 8, 8, 8, 0, 0] as const;
        return [settings.mon, settings.tue, settings.wed, settings.thu, settings.fri, settings.sat, settings.sun] as const;
    }, [settings]);

    // ——— data ———
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [entriesByDate, setEntriesByDate] = useState<EntriesByDate>({});
    const [draftEntriesByDate, setDraftEntriesByDate] = useState<EntriesByDate>({});
    const [weekErr, setWeekErr] = useState<string | null>(null);

    // compute totals/percent from the draft (what the user sees)
    const weekTotal = useMemo(() => {
        return weekDatesISO.reduce((sum, iso) => {
            const rows = draftEntriesByDate[iso] ?? [];
            const subtotal = rows.reduce((s, r) => s + Number(r.hours || 0), 0);
            return sum + subtotal;
        }, 0);
    }, [draftEntriesByDate, weekDatesISO]);

    const weekExpected = expectedByDay.reduce((a, b) => a + b, 0);
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;

    // isClosed + isDirty
    const isClosed = Boolean(period?.closed);
    const isDirty = useMemo(() => !equalEntriesForDates(draftEntriesByDate, entriesByDate, weekDatesISO), [draftEntriesByDate, entriesByDate, weekDatesISO]);

    // ——— edit helpers (row-based) ———
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

    // legacy single-value helper
    const setVal = useCallback(
        (date: Date, v: number) => {
            if (!isDateAllowed(date, startBound, endBound)) return;
            const iso = toISO(date);
            setDraftEntriesByDate((cur) => {
                const rows = cur[iso] ? [...cur[iso]] : [];
                if (rows.length === 0) {
                    rows.push({ type: "work", hours: v, projectId: null, note: null });
                } else {
                    rows[0] = { ...rows[0], hours: v };
                }
                return { ...cur, [iso]: rows };
            });
        },
        [startBound, endBound]
    );

    // ——— load settings once ———
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const token = await getAccessToken();
                const json = await fetchSettings(token);
                if (active) setSettings(json.settings);
            } catch {
                /* ignore */
            }
        })();
        return () => {
            active = false;
        };
    }, [getAccessToken]);

    // ——— fetch week (with dedupe) ———
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
            fetchedKeysRef.current.add(currentKey);
            setLoadedKey(currentKey);
            setWeekErr(null);
        } catch (e: any) {
            setWeekErr(e?.message || "Failed to load week");
        } finally {
            setFetching(false);
        }
    }, [boundsReady, getAccessToken, from, to, currentKey]);

    // Trigger load when week range changes (after bounds are ready)
    useEffect(() => {
        if (!boundsReady) return;

        const curISO = toISO(weekStart);
        const clampedISO = clampMondayISO(curISO, startBound, endBound);
        if (clampedISO !== curISO) {
            setLoadedKey(null);
            setWeekStart(parseISO(clampedISO));
            return;
        }

        if (loadedKey !== currentKey) {
            setLoadedKey(null);
        }
        void reloadWeek();
    }, [boundsReady, weekStart, startBound, endBound, currentKey, loadedKey, reloadWeek]);

    // ——— actions ———
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    // —— Month summaries (for calendar badges) ——
    const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(weekStart));
    useEffect(() => {
        // keep visible month in sync when weekStart changes programmatically
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

    const fromISO = useMemo(() => toISO(monthSpan.clampFrom), [monthSpan.clampFrom]);
    const toISOstr = useMemo(() => toISO(monthSpan.clampTo), [monthSpan.clampTo]);
    const summariesKey = `${fromISO}|${toISOstr}`;

    const fetchedSummariesRef = useRef<Set<string>>(new Set());
    const [loadedSummariesKey, setLoadedSummariesKey] = useState<string | null>(null);
    const [fetchingSummaries, setFetchingSummaries] = useState(false);
    const [summaries, setSummaries] = useState<Record<string, WeekSummary>>({});

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
            const { summaries } = await fetchWeekSummaries(fromISO, toISOstr, token);
            const map: Record<string, WeekSummary> = {};
            for (const s of summaries) map[s.monday] = s;
            setSummaries(map);
            fetchedSummariesRef.current.add(summariesKey);
            setLoadedSummariesKey(summariesKey);
        } catch {
            setSummaries({});
        } finally {
            setFetchingSummaries(false);
        }
    }, [boundsReady, monthSpan.clampFrom, monthSpan.clampTo, summariesKey, fromISO, toISOstr, getAccessToken]);

    useEffect(() => {
        if (!boundsReady) return;
        if (loadedSummariesKey !== summariesKey) {
            setLoadedSummariesKey(null);
        }
        void reloadSummaries();
    }, [boundsReady, summariesKey, loadedSummariesKey, reloadSummaries]);

    const invalidateSummaries = useCallback(() => {
        fetchedSummariesRef.current.delete(summariesKey);
        setLoadedSummariesKey(null);
    }, [summariesKey]);

    // ——— save / close with local optimistic update + summaries refresh ———
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

            // optimistic: reflect draft -> server copy so UI doesn't flash
            setEntriesByDate(() => payload);

            await replaceDayEntries(payload, token);

            // keep draft in sync with server copy
            setDraftEntriesByDate(payload);

            // refresh summaries so calendar badges update
            invalidateSummaries();
            await reloadSummaries();

            // no need to refetch the week (already in sync)
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

            // update local period state immediately
            setPeriod((p) => (p ? { ...p, closed: !isClosed } : p));

            // refresh summaries for badges
            invalidateSummaries();
            await reloadSummaries();

            // no need to refetch week unless you want to enforce read-only transitions
            fetchedKeysRef.current.add(currentKey);
            setLoadedKey(currentKey);
        } finally {
            setClosing(false);
        }
    }, [getAccessToken, isClosed, weekStartISO, invalidateSummaries, reloadSummaries, currentKey]);

    // ——— AI ———
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
            const allowedDates = weekDatesISO.filter(inEmployment);

            const r = await fetch("/api/ai", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    command: aiCmd || "Fill a normal week based on expected hours.",
                    weekStart: weekStartISO,
                    expectedByDay: [...expectedByDay],
                    allowedDates,
                }),
            });

            const { suggestions, error } = await r.json();
            if (!r.ok) throw new Error(error || "AI failed");

            type DayType = "work" | "sick" | "time_off";

            // Normalize both new and old API shapes:
            // - new: { date, entries: [{hours, type}, ...] }
            // - old: { date, totalHours, type }
            const normalized: { date: string; entries: { hours: number; type: DayType }[] }[] = (suggestions ?? [])
                .map((s: any) => {
                    const date = String(s.date).trim();
                    if (Array.isArray(s.entries)) {
                        // new shape
                        const entries = s.entries
                            .map((e: any) => ({
                                hours: Math.max(0, Math.min(24, Number(e.hours || 0))),
                                type: (e.type ?? "work") as DayType,
                            }))
                            .filter((e: any) => e.hours > 0);
                        return { date, entries };
                    } else {
                        // old shape fallback
                        const hours = Math.max(0, Math.min(24, Number(s.totalHours || 0)));
                        const type = (s.type ?? "work") as DayType;
                        const entries = hours > 0 ? [{ hours, type }] : [];
                        return { date, entries };
                    }
                })
                .filter((row: { date: string; entries: { hours: number; type: DayType }[] }) => weekSet.has(row.date) && inEmployment(row.date) && row.entries.length > 0);

            if (normalized.length === 0) {
                setAiMsg("AI returned no applicable changes for this week.");
                return;
            }

            // Apply: replace the day's entries with the AI-proposed list
            setDraftEntriesByDate((cur) => {
                const next = { ...cur };
                for (const row of normalized) {
                    next[row.date] = row.entries.map((e) => ({
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
    }, [aiCmd, getAccessToken, expectedByDay, weekDatesISO, weekStartISO, startBound, endBound]);

    return {
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
        summaries, // Record<mondayISO, WeekSummary>
        fetchingSummaries,
        reloadSummaries, // exposed if you need manual refresh
    };
}
