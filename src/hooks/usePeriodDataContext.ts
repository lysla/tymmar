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
    fromISO: string;
    /** 👀 period end */
    toISO: string;
    /** 👀 all dates within the period */
    days: Date[];
    daysISO: string[];
    /** 👀 employee start/end bounds */
    employeeStartDateISO: string | null | undefined;
    employeeEndDateISO: string | null | undefined;
    /** 👀 settings for this period */
    settings: Setting | null;
    /** 👀 expected hours by date [[date=>hours]] */
    expectedByDate: Record<string, number>;
    /** 👀 period data */
    period: Period | null;
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
    reloadMonthPeriods: () => Promise<void>;
    /** 👀 entry ui management functions */
    addEntry: (date: Date) => void;
    updateEntry: (date: Date, index: number, patch: Partial<DayEntry>) => void;
    removeEntry: (date: Date, index: number) => void;
    // what is this??
    setVal: (date: Date, hours: number) => void;
    /** 👀 entries and period management functions */
    handleSaveWeek: () => Promise<void>;
    handleCloseOrReopen: () => Promise<void>;
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
