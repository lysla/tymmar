// src/helpers/date.ts
import { startOfWeek, endOfWeek, addDays as dfAddDays, format, parseISO, startOfDay, isBefore, isAfter, isWithinInterval } from "date-fns";
import type { DayType } from "../types";

/* ── constants ─────────────────────────────────────────────── */
export const MIN_DATE = new Date(-8640000000000000);
export const MAX_DATE = new Date(8640000000000000);

/* ── base helpers (local-time, Mon-first weeks) ───────────── */
export function getMonday(d: Date = new Date()): Date {
    return startOfWeek(d, { weekStartsOn: 1 });
}

export function getMondayISO(dateISO: string): string {
    const d = parseISO(dateISO);
    return format(getMonday(d), "yyyy-MM-dd");
}

export function addDays(date: Date, n: number): Date {
    return dfAddDays(date, n);
}

export function toISO(d: Date | string | number): string {
    const date = typeof d === "string" ? new Date(d) : (d as Date | number);
    return format(date as Date | number, "yyyy-MM-dd");
}

export function weekRangeISO(weekStart: Date): { from: string; to: string } {
    return {
        from: format(weekStart, "yyyy-MM-dd"),
        to: format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
}

export function isDateISO(s?: string): s is string {
    return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}
export function isValidType(t?: string): t is DayType {
    return !t || t === "work" || t === "sick" || t === "time_off";
}
export function addDaysISO(dateISO: string, n: number): string {
    const d = parseISO(dateISO);
    return toISO(dfAddDays(d, n));
}
export function isoWeekKeyFromMonday(mondayISO: string): string {
    // ISO week key, same as your hours.ts logic
    const d = new Date(mondayISO + "T00:00:00Z");
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    const year = date.getUTCFullYear();
    return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

export function fmtDayLabel(d: Date): string {
    return format(d, "EEE dd/MM");
}

/* ── bounds + predicates ───────────────────────────────────── */
export function clampMondayISO(mondayISO: string, startDateISO?: string | null, endDateISO?: string | null): string {
    if (!startDateISO && !endDateISO) return mondayISO;

    const monday = getMonday(parseISO(mondayISO)); // ensure we compare Mondays
    const start = startDateISO ? getMonday(parseISO(startDateISO)) : undefined;
    const end = endDateISO ? getMonday(parseISO(endDateISO)) : undefined;

    if (start && isBefore(monday, start)) return toISO(start);
    if (end && isAfter(monday, end)) return toISO(end);
    return mondayISO;
}

/** Inclusive day-in-range check (normalizes to 00:00 locally). */
export function isDateAllowed(date: Date, startDateISO?: string | null, endDateISO?: string | null): boolean {
    if (!startDateISO && !endDateISO) return true;
    const start = startDateISO ? startOfDay(parseISO(startDateISO)) : MIN_DATE;
    const end = endDateISO ? startOfDay(parseISO(endDateISO)) : MAX_DATE;
    return isWithinInterval(startOfDay(date), { start, end });
}

/** Check if a date is before another date (normalizes to 00:00 locally). */
export function isDateBefore(date: Date | string, compareDate: Date | string): boolean {
    const d1 = startOfDay(typeof date === "string" ? parseISO(date) : date);
    const d2 = startOfDay(typeof compareDate === "string" ? parseISO(compareDate) : compareDate);
    return isBefore(d1, d2);
}

/* ── convenience helpers used all over the app ─────────────── */
export function weekDates(weekStart: Date): Date[] {
    const mon = getMonday(weekStart);
    return Array.from({ length: 7 }, (_, i) => dfAddDays(mon, i));
}

export function weekDatesISO(weekStart: Date): string[] {
    return weekDates(weekStart).map(toISO);
}

/** Often handy for filters/validation */
export function weekISOSet(weekStart: Date): Set<string> {
    return new Set(weekDatesISO(weekStart));
}

export function hoursAreValid(hours: (string | number)[]): boolean {
    for (const h of hours) {
        const n = Number(h);
        if (isNaN(n) || n < 0 || n > 24) {
            return false;
        }
    }
    return true;
}
