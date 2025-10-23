// src/hooks/useWeekDataContext.ts
import { createContext, useContext } from "react";
import type { Settings, PeriodInfo, EntriesByDate } from "../services";
import type { DayEntry } from "../types";

/** 👀 type for what this context offers */
export type WeekDataContextType = {
    // week navigation & range
    weekStart: Date;
    weekStartISO: string;
    from: string; // week range start ISO (Mon)
    to: string; // week range end ISO (Sun)
    days: Date[];
    weekDatesISO: string[];
    jumpToWeek: (mondayISO: string) => void;
    prevWeek: () => void;
    nextWeek: () => void;

    // bounds (employment period)
    startDateISO: string | null | undefined;
    endDateISO: string | null | undefined;

    // settings/data/derived
    settings: Settings | null;
    expectedByDay: readonly number[]; // Mon..Sun expected hours
    period: PeriodInfo | null;
    entriesByDate: EntriesByDate;
    draftEntriesByDate: EntriesByDate;
    isClosed: boolean;
    isDirty: boolean;
    weekTotal: number;
    weekExpected: number;
    weekPct: number;

    // loading/error
    loadingWeek: boolean;
    weekErr: string | null;
    loadingSettings: boolean;

    // row edit helpers
    addEntry: (date: Date) => void;
    updateEntry: (date: Date, index: number, patch: Partial<DayEntry>) => void;
    removeEntry: (date: Date, index: number) => void;
    setVal: (date: Date, hours: number) => void;

    // actions
    handleSaveWeek: () => Promise<void>;
    handleCloseOrReopen: () => Promise<void>;
    saving: boolean;
    closing: boolean;

    // AI
    aiCmd: string;
    setAiCmd: React.Dispatch<React.SetStateAction<string>>;
    aiBusy: boolean;
    aiMsg: string | null;
    handleAIApply: () => Promise<void>;

    // Navigator month + summaries
    visibleMonth: Date;
    setVisibleMonth: React.Dispatch<React.SetStateAction<Date>>;
    summaries: Record<string, any>; // keyed by monday ISO
    fetchingSummaries: boolean;
    reloadSummaries: () => Promise<void>;
};

export const WeekDataContext = createContext<WeekDataContextType | null>(null);

export function useWeekDataContext(): WeekDataContextType {
    const ctx = useContext(WeekDataContext);
    if (!ctx) throw new Error("useWeekDataContext must be used inside <WeekDataProvider>");
    return ctx;
}
