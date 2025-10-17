// src/hooks/useWeekData.ts
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { addDays, getMonday, toISO, weekRangeISO, shallowEqualHours, clampMondayISO, isDateAllowed } from "../helpers";
import { askAIForHours, fetchSettings, fetchWeek, saveWeek, patchPeriod, type Settings, type PeriodInfo, type EntriesMap } from "../services";
import { parseISO, startOfDay, isBefore, isAfter } from "date-fns";

export function useWeekData(getAccessToken: () => Promise<string | undefined>, opts?: { startDateISO?: string | null; endDateISO?: string | null; boundsReady?: boolean }) {
    const startBound = opts?.startDateISO ?? null;
    const endBound = opts?.endDateISO ?? null;
    const boundsReady = Boolean(opts?.boundsReady ?? true); // if not provided, treat as ready

    // ——— week state (initialized only when bounds are ready) ———
    const [weekStart, setWeekStart] = useState<Date>(() => {
        // If bounds aren't ready yet, don't clamp—use today; we will replace it once bounds arrive.
        const initialMonday = getMonday(new Date());
        return initialMonday;
    });

    const weekStartISO = useMemo(() => toISO(weekStart), [weekStart]);
    const { from, to } = useMemo(() => weekRangeISO(weekStart), [weekStart]);

    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekDatesISO = useMemo(() => days.map(toISO), [days]);

    const jumpToWeek = useCallback(
        (mondayISO: string) => {
            const clamped = clampMondayISO(mondayISO, startBound, endBound);
            setWeekStart(parseISO(clamped));
        },
        [startBound, endBound]
    );

    const prevWeek = useCallback(() => {
        setWeekStart((cur) => parseISO(clampMondayISO(toISO(addDays(cur, -7)), startBound, endBound)));
    }, [startBound, endBound]);

    const nextWeek = useCallback(() => {
        setWeekStart((cur) => parseISO(clampMondayISO(toISO(addDays(cur, 7)), startBound, endBound)));
    }, [startBound, endBound]);

    // ——— settings ———
    const [settings, setSettings] = useState<Settings | null>(null);
    const expectedByDay = useMemo(() => {
        if (!settings) return [8, 8, 8, 8, 8, 0, 0] as const;
        return [settings.mon, settings.tue, settings.wed, settings.thu, settings.fri, settings.sat, settings.sun] as const;
    }, [settings]);

    // ——— data ———
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [entries, setEntries] = useState<EntriesMap>({});
    const [loadingWeek, setLoadingWeek] = useState(true);
    const [weekErr, setWeekErr] = useState<string | null>(null);

    // ——— drafts ———
    const hoursView = useMemo(() => {
        const obj: Record<string, number> = {};
        for (const d of weekDatesISO) obj[d] = entries[d]?.totalHours ?? 0;
        return obj;
    }, [entries, weekDatesISO]);

    const [hoursDraft, setHoursDraft] = useState<Record<string, number>>({});
    const [savedSnapshot, setSavedSnapshot] = useState<Record<string, number>>({});

    useEffect(() => {
        setHoursDraft(hoursView);
        setSavedSnapshot(hoursView);
    }, [hoursView]);

    const isClosed = Boolean(period?.closed);
    const isDirty = !shallowEqualHours(hoursDraft, savedSnapshot, weekDatesISO);

    const weekTotal = weekDatesISO.reduce((sum, k) => sum + (hoursDraft[k] ?? 0), 0);
    const weekExpected = expectedByDay.reduce((a, b) => a + b, 0);
    const weekPct = weekExpected > 0 ? Math.max(0, Math.min(100, Math.round((weekTotal / weekExpected) * 100))) : 0;

    const setVal = useCallback(
        (date: Date, v: number) => {
            if (!isDateAllowed(date, startBound, endBound)) return;
            const k = toISO(date);
            setHoursDraft((h) => ({ ...h, [k]: v }));
        },
        [startBound, endBound]
    );

    // ——— load settings once (dedup naturally) ———
    useEffect(() => {
        let active = true;
        (async () => {
            try {
                const token = await getAccessToken();
                const json = await fetchSettings(token);
                if (active) setSettings(json.settings);
            } catch {
                /* keep defaults */
            }
        })();
        return () => {
            active = false;
        };
    }, [getAccessToken]);

    // ——— dedupe reloads ———
    const fetchedKeysRef = useRef<Set<string>>(new Set());

    const reloadWeek = useCallback(async () => {
        if (!boundsReady) return; // do nothing until bounds are ready
        const key = `${from}|${to}`;
        if (fetchedKeysRef.current.has(key)) return; // prevent duplicate same-range fetches (incl. StrictMode)
        fetchedKeysRef.current.add(key);

        const token = await getAccessToken();
        const json = await fetchWeek(from, to, token);
        setPeriod(json.period);
        setEntries(json.entries || {});
    }, [boundsReady, getAccessToken, from, to]);

    // Trigger load when week range changes (after bounds are ready)
    useEffect(() => {
        let active = true;
        (async () => {
            if (!boundsReady) return;

            // Clamp first
            const curISO = toISO(weekStart);
            const clampedISO = clampMondayISO(curISO, startBound, endBound);
            if (clampedISO !== curISO) {
                setWeekStart(parseISO(clampedISO));
                return; // skip fetch this cycle
            }

            try {
                setLoadingWeek(true);
                setWeekErr(null);
                await reloadWeek();
            } catch (e: any) {
                if (active) setWeekErr(e?.message || "Failed to load week");
            } finally {
                if (active) setLoadingWeek(false);
            }
        })();
        return () => {
            active = false;
        };
    }, [boundsReady, weekStart, startBound, endBound, reloadWeek]);

    // ——— actions ———
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleSaveWeek = useCallback(async () => {
        try {
            setSaving(true);
            const token = await getAccessToken();
            await saveWeek(
                weekDatesISO.map((k) => ({
                    date: k,
                    totalHours: Number(hoursDraft[k] ?? 0),
                    type: "work" as const,
                })),
                token
            );
            // Re-fetch this same range (won’t double thanks to dedupe Set per mount; clear key first)
            fetchedKeysRef.current.delete(`${from}|${to}`);
            await reloadWeek();
        } finally {
            setSaving(false);
        }
    }, [getAccessToken, hoursDraft, weekDatesISO, from, to, reloadWeek]);

    const handleCloseOrReopen = useCallback(async () => {
        try {
            setClosing(true);
            const token = await getAccessToken();
            await patchPeriod(isClosed ? "reopen" : "close", weekStartISO, token);
            fetchedKeysRef.current.delete(`${from}|${to}`);
            await reloadWeek();
        } finally {
            setClosing(false);
        }
    }, [getAccessToken, isClosed, weekStartISO, from, to, reloadWeek]);

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

            const isISOWithinEmployment = (iso: string) => {
                const d = startOfDay(parseISO(iso));
                if (startBound && isBefore(d, startBound)) return false;
                if (endBound && isAfter(d, endBound)) return false;
                return true;
            };
            const allowedDatesForAI = weekDatesISO.filter(isISOWithinEmployment);

            const currentEntries = Object.fromEntries(
                weekDatesISO.map((d) => [
                    d,
                    {
                        totalHours: Number(hoursDraft[d] ?? 0),
                        type: (entries[d]?.type ?? "work") as "work" | "sick" | "time_off",
                    },
                ])
            );

            const mode = /\b(missing|only\s+missing|don['’]t\s+change|keep\s+existing)\b/i.test(aiCmd) ? "fill-missing" : "overwrite-week";

            const { suggestions, rationale } = await askAIForHours({
                command: aiCmd || "Fill a normal week based on expected hours.",
                weekStart: weekStartISO,
                expectedByDay: [...expectedByDay],
                entries: currentEntries,
                allowedDates: allowedDatesForAI,
                mode,
                token,
            });

            const filtered = suggestions
                .filter((s) => weekSet.has(s.date) && isISOWithinEmployment(s.date))
                .map((s) => ({
                    date: s.date,
                    totalHours: Math.max(0, Math.min(24, Number(s.totalHours || 0))),
                }));

            if (filtered.length === 0) {
                setAiMsg("AI returned no applicable changes for this week.");
                return;
            }

            setHoursDraft((prev) => {
                const next = { ...prev };
                for (const s of filtered) next[s.date] = s.totalHours;
                return next;
            });

            setAiCmd("");
            if (rationale) {
                // optional: setAiMsg(rationale);
            }
        } catch (e: any) {
            setAiMsg(e?.message || "AI failed");
        } finally {
            setAiBusy(false);
        }
    }, [aiCmd, entries, expectedByDay, getAccessToken, hoursDraft, weekDatesISO, weekStartISO, startBound, endBound]);

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

        // expose bounds so consumers (or the context) can use them
        startDateISO: startBound,
        endDateISO: endBound,

        // settings/data/derived
        settings,
        expectedByDay,
        period,
        entries,
        hoursDraft,
        isClosed,
        isDirty,
        weekTotal,
        weekExpected,
        weekPct,

        // loading/error
        loadingWeek,
        weekErr,

        // field/edit helpers
        setVal,
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
    };
}
