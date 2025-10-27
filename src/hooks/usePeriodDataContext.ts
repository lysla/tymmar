// src/hooks/usePeriodDataContext.ts
import { createContext, useContext } from "react";
import type { DayEntry, Period, Setting } from "../types";

export type EntriesByDate = Record<string, Partial<DayEntry>[]>;

/** 👀 type for what this context offers */
export type PeriodDataContextType = {
    /** 👀 loading and errors */
    loading: boolean;
    error: string | null;
    /** 👀 period start */
    fromDate: Date;
    fromDateISO: string;
    /** 👀 period end */
    toDate: Date;
    toDateISO: string;
    /** 👀 all dates within the period */
    days: Date[];
    daysISO: string[];
    /** 👀 employee start/end bounds */
    employeeStartDateISO: string | Date | null;
    employeeEndDateISO: string | Date | null;
    /** 👀 settings for this period */
    settings: Setting | null;
    /** 👀 expected hours by day of the period [[date=>hours]] */
    expectedByDay: readonly number[];
    /** 👀 period data */
    period: Period | null;
    periodDaysWithEntries: number;
    /** 👀 entries perm and draft */
    entriesByDate: EntriesByDate;
    draftEntriesByDate: EntriesByDate;
    /** 👀 current period info */
    isClosed: boolean;
    isDirty: boolean;
    weekTotal: number;
    weekExpected: number;
    weekPct: number;
    /** 👀 calendar navigation */
    visibleMonth: Date;
    setVisibleMonth: React.Dispatch<React.SetStateAction<Date>>;
    /** 👀 all periods within the current calendar month */
    monthPeriods: Record<string, Period>;
    /** 👀 entry ui management functions */
    addEntry: (date: Date) => void;
    updateEntry: (date: Date, index: number, patch: Partial<DayEntry>) => void;
    removeEntry: (date: Date, index: number) => void;
    /** 👀 entries and period management functions */
    savePeriod: () => Promise<void>;
    closeOrReopenPeriod: () => Promise<void>;
    saving: boolean;
    closing: boolean;
    /** 👀 move to specific period */
    jumpToPeriod: (fromISO: string) => void;
    /** 👀 AI interactions */
    aiCmd: string;
    setAiCmd: React.Dispatch<React.SetStateAction<string>>;
    aiBusy: boolean;
    aiMsg: string | null;
    handleAIApply: () => Promise<void>;
};

export const PeriodDataContext = createContext<PeriodDataContextType | null>(null);

export function usePeriodDataContext(): PeriodDataContextType {
    const ctx = useContext(PeriodDataContext);
    if (!ctx) throw new Error("usePeriodDataContext must be used inside <PeriodDataProvider>");
    return ctx;
}
