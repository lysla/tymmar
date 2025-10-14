import { useEffect, useMemo, useState, useCallback } from "react";
import { addDays, getMonday, toISO, weekRangeISO } from "../helpers";
import { shallowEqualHours } from "../helpers";
import { fetchSettings, fetchWeek, saveWeek, patchPeriod, type Settings, type PeriodInfo, type EntriesMap } from "../services/apiClient";
import { askAIForHours } from "../api";

export function useWeekData(getAccessToken: () => Promise<string | undefined>) {
    // week state
    const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
    const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
    const weekDatesISO = useMemo(() => days.map(toISO), [days]);

    // settings
    const [settings, setSettings] = useState<Settings | null>(null);
    const expectedByDay = useMemo(() => {
        if (!settings) return [8, 8, 8, 8, 8, 0, 0] as const;
        return [settings.mon, settings.tue, settings.wed, settings.thu, settings.fri, settings.sat, settings.sun] as const;
    }, [settings]);

    // data
    const [period, setPeriod] = useState<PeriodInfo | null>(null);
    const [entries, setEntries] = useState<EntriesMap>({});
    const [loadingWeek, setLoadingWeek] = useState(true);
    const [weekErr, setWeekErr] = useState<string | null>(null);

    // drafts
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

    const setVal = useCallback((date: Date, v: number) => {
        const k = toISO(date);
        setHoursDraft((h) => ({ ...h, [k]: v }));
    }, []);

    const prevWeek = useCallback(() => setWeekStart(addDays(weekStart, -7)), [weekStart]);
    const nextWeek = useCallback(() => setWeekStart(addDays(weekStart, 7)), [weekStart]);

    // load settings once
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

    // load week
    const reloadWeek = useCallback(async () => {
        const token = await getAccessToken();
        const { from, to } = weekRangeISO(weekStart);
        const json = await fetchWeek(from, to, token);
        setPeriod(json.period);
        setEntries(json.entries || {});
    }, [getAccessToken, weekStart]);

    useEffect(() => {
        let active = true;
        (async () => {
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
    }, [reloadWeek]);

    // actions
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    const handleSaveWeek = useCallback(async () => {
        try {
            setSaving(true);
            const token = await getAccessToken();
            await saveWeek(
                weekDatesISO.map((k) => ({ date: k, totalHours: Number(hoursDraft[k] ?? 0), type: "work" as const })),
                token
            );
            await reloadWeek();
        } finally {
            setSaving(false);
        }
    }, [getAccessToken, hoursDraft, reloadWeek, weekDatesISO]);

    const handleCloseOrReopen = useCallback(async () => {
        try {
            setClosing(true);
            const token = await getAccessToken();
            await patchPeriod(isClosed ? "reopen" : "close", toISO(weekStart), token);
            await reloadWeek();
        } finally {
            setClosing(false);
        }
    }, [getAccessToken, isClosed, reloadWeek, weekStart]);

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
            const currentEntries = Object.fromEntries(weekDatesISO.map((d) => [d, { totalHours: Number(hoursDraft[d] ?? 0), type: (entries[d]?.type ?? "work") as "work" | "sick" | "time_off" }]));
            const mode = /\b(missing|only\s+missing|don['’]t\s+change|keep\s+existing)\b/i.test(aiCmd) ? "fill-missing" : "overwrite-week";
            const { suggestions, rationale } = await askAIForHours({
                command: aiCmd || "Fill a normal week based on expected hours.",
                weekStart: toISO(weekStart),
                expectedByDay: [...expectedByDay],
                entries: currentEntries,
                allowedDates: weekDatesISO,
                mode,
                token,
            });

            const filtered = suggestions.filter((s) => weekSet.has(s.date)).map((s) => ({ date: s.date, totalHours: Math.max(0, Math.min(24, Number(s.totalHours || 0))) }));

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
                console.debug("AI rationale:", rationale);
                //setAiMsg(rationale);
            }
        } catch (e: any) {
            setAiMsg(e?.message || "AI failed");
        } finally {
            setAiBusy(false);
        }
    }, [aiCmd, entries, expectedByDay, getAccessToken, hoursDraft, weekDatesISO, weekStart]);

    return {
        // state
        weekStart,
        days,
        weekDatesISO,
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
        loadingWeek,
        weekErr,

        // ai
        aiCmd,
        setAiCmd,
        aiBusy,
        aiMsg,
        handleAIApply,

        // actions
        setVal,
        prevWeek,
        nextWeek,
        handleSaveWeek,
        handleCloseOrReopen,
        saving,
        closing,
    };
}
