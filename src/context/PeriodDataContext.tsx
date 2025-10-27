// src/context/PeriodDataContext.tsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { PeriodDataContext, type EntriesByDate, type PeriodDataContextType } from "../hooks/usePeriodDataContext";
import { getMonday, toISO, isDateAllowed } from "../helpers";
import { parseISO, startOfDay, isBefore, isAfter, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns";
import type { DayEntry, DayType, Employee, Period, Setting } from "../types";
import { useAuth } from "../hooks";

/** 👀 helper that tells us if the draft entries are != then perms => isDirty */
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
    const [loadingMonthPeriods, setLoadingMonthPeriods] = useState(false);

    const loading = useMemo(() => loadingSettings || loadingPeriodData || loadingMonthPeriods, [loadingSettings, loadingPeriodData, loadingMonthPeriods]);
    const [error, setError] = useState<string | null>(null);

    /** 👀 period start date */
    const [fromDate, setFromDate] = useState<Date>(() => getMonday(new Date()));

    /** 👀 period bounds derived from fromDate */
    const toDate = useMemo(() => endOfWeek(fromDate, { weekStartsOn: 1 }), [fromDate]);
    const fromDateISO = useMemo(() => toISO(fromDate), [fromDate]);
    const toDateISO = useMemo(() => toISO(toDate), [toDate]);

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

    const [periodDaysWithEntries, setPeriodDaysWithEntries] = useState<number>(0);

    /** 👀 load all the period data entries and info */
    const loadPeriod = useCallback(async () => {
        setLoadingPeriodData(true);
        try {
            const token = await getAccessToken();
            const r = await fetch(`/api/day_entries?from=${fromDateISO}&to=${toDateISO}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!r.ok) throw new Error("Failed to load period entries and info");
            const json = (await r.json()) as {
                period: Period;
                entriesByDate: EntriesByDate;
                totals: Record<string, { totalHours: number; type: DayType | "mixed" }>;
                expectationsByDate: Record<string, number>;
                totalDaysWithEntries: number;
            };

            setPeriod(json.period);
            setEntriesByDate(json.entriesByDate || {});
            setDraftEntriesByDate(json.entriesByDate || {});
            setExpectationsByDate(json.expectationsByDate || {});
            setPeriodDaysWithEntries(json.totalDaysWithEntries || 0);
            setError(null);
        } catch (e: any) {
            setError(e?.message || "Failed to load week");
        } finally {
            setLoadingPeriodData(false);
        }
    }, [getAccessToken, fromDateISO, toDateISO]);

    /** 👀 makes sure the period reloads when needed */
    useEffect(() => {
        loadPeriod();
    }, [loadPeriod]);

    /** 👀 prepare an allowed interval based on the employee data */
    const allowedEmployeeInterval = useMemo(() => {
        return { start: employee.startDate ?? new Date(-8640000000000000), end: employee.endDate ?? new Date(8640000000000000) };
    }, [employee]);

    /** 👀 get the exact month span we need the data for */
    const monthSpan = useMemo(() => {
        const monthStart = startOfMonth(visibleMonth);
        const monthEnd = endOfMonth(visibleMonth);
        const spanFrom = startOfWeek(monthStart, { weekStartsOn: 1 });
        const spanTo = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const clampFrom = spanFrom < allowedEmployeeInterval.start ? allowedEmployeeInterval.start : spanFrom;
        const clampTo = spanTo > allowedEmployeeInterval.end ? allowedEmployeeInterval.end : spanTo;
        return { clampFrom: toISO(clampFrom), clampTo: toISO(clampTo) };
    }, [visibleMonth, allowedEmployeeInterval]);

    /** 👀 get the full visible month periods summaried data */
    const [monthPeriods, setMonthPeriods] = useState<Record<string, Period>>({});
    const loadMonthPeriods = useCallback(async () => {
        setLoadingMonthPeriods(true);
        try {
            const token = await getAccessToken();
            const r = await fetch(`/api/periods?from=${monthSpan.clampFrom}&to=${monthSpan.clampTo}`, {
                method: "GET",
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!r.ok) throw new Error("Failed to load month periods");
            const { periods } = (await r.json()) as { periods: Period[]; range: { from: string; to: string } };
            const map: Record<string, any> = {};
            for (const p of periods) {
                map[p.weekStartDate as string] = p;
            }
            setMonthPeriods(map);
        } catch {
            setMonthPeriods({});
        } finally {
            setLoadingMonthPeriods(false);
        }
    }, [monthSpan.clampFrom, monthSpan.clampTo, getAccessToken]);

    /** 👀 actions of the whole period */
    const [saving, setSaving] = useState(false);
    const [closing, setClosing] = useState(false);

    /** 👀 period saving */
    const savePeriod = useCallback(async () => {
        try {
            setSaving(true);
            const token = await getAccessToken();
            const payload: EntriesByDate = {};
            for (const iso of daysISO) {
                payload[iso] = (draftEntriesByDate[iso] ?? []).map((r) => ({
                    type: r.type,
                    hours: Number(r.hours || 0),
                    projectId: r.projectId ?? null,
                    note: r.note ?? null,
                }));
            }
            const r = await fetch(`/api/day_entries`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ payload }),
            });
            const json = await r.json();
            if (!r.ok) throw new Error(json?.error || "Save failed");
            setEntriesByDate(() => payload);
            setDraftEntriesByDate(payload);
            await loadMonthPeriods();
        } finally {
            setSaving(false);
        }
    }, [getAccessToken, draftEntriesByDate, loadMonthPeriods, daysISO]);

    /** 👀 period closing / reopening */
    const closeOrReopenPeriod = useCallback(async () => {
        try {
            setClosing(true);
            const token = await getAccessToken();
            const r = await fetch("/api/periods", {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ action: isClosed ? "reopen" : "close", fromDateISO }),
            });
            const data = await r.json();
            if (!r.ok) throw new Error(data?.error || "Action failed");
            setPeriod((p) => (p ? { ...p, closed: !isClosed } : p));
            await loadMonthPeriods();
        } finally {
            setClosing(false);
        }
    }, [getAccessToken, isClosed, fromDateISO, loadMonthPeriods]);

    /** 👀 interactions */
    const [aiCmd, setAiCmd] = useState("");
    const [aiBusy, setAiBusy] = useState(false);
    const [aiMsg, setAiMsg] = useState<string | null>(null);

    const handleAIApply = useCallback(async () => {
        try {
            setAiBusy(true);
            setAiMsg(null);
            const token = await getAccessToken();

            /** 👀 prep week day names to identify each of the current entry */
            const weekdayNames = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

            /** 👀 normalize current entries */
            const currentEntries = daysISO.map((iso, i) => {
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

            /** 👀 AI call */
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

            /** 👀 check returned data and normalize if needed */
            const daysSet = new Set(daysISO);
            const inEmployment = (iso: string) => {
                const d = startOfDay(parseISO(iso));
                if (employee.startDate && isBefore(d, employee.startDate)) return false;
                if (employee.endDate && isAfter(d, employee.endDate)) return false;
                return true;
            };
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
                .filter((row: any) => daysSet.has(row.date) && inEmployment(row.date) && row.entries.length > 0);
            if (suggestions.length > 0 && normalized.length === 0) {
                setAiMsg("AI returned no applicable changes for this week.");
                return;
            }

            /** 👀 apply normalized suggestions */
            setDraftEntriesByDate((cur) => {
                const map = new Map<string, { hours: number; type: DayType }[]>();
                for (const row of normalized) map.set(row.date, row.entries);

                const next = { ...cur };
                for (const iso of daysISO) {
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
    }, [aiCmd, getAccessToken, expectedByDay, draftEntriesByDate, daysISO, employee]);

    const value: PeriodDataContextType = {
        loading,
        error,
        fromDate,
        fromDateISO,
        toDate,
        toDateISO,
        days,
        daysISO,
        employeeStartDateISO: employee.startDate,
        employeeEndDateISO: employee.endDate,
        settings,
        expectedByDay,
        period,
        periodDaysWithEntries,
        entriesByDate,
        draftEntriesByDate,
        isClosed,
        isDirty,
        weekTotal,
        weekExpected,
        weekPct,
        visibleMonth,
        setVisibleMonth,
        monthPeriods,
        addEntry,
        updateEntry,
        removeEntry,
        savePeriod,
        closeOrReopenPeriod,
        saving,
        closing,
        jumpToPeriod,
        aiCmd,
        setAiCmd,
        aiBusy,
        aiMsg,
        handleAIApply,
    };

    return <PeriodDataContext.Provider value={value}>{children}</PeriodDataContext.Provider>;
}
