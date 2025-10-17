// src/helpers/date.ts
import { startOfWeek, endOfWeek, addDays as dfAddDays, format, parseISO, startOfDay, isBefore, isAfter, isWithinInterval } from "date-fns";

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

export function toISO(d: Date): string {
    return format(d, "yyyy-MM-dd");
}

export function weekRangeISO(weekStart: Date): { from: string; to: string } {
    return {
        from: format(weekStart, "yyyy-MM-dd"),
        to: format(endOfWeek(weekStart, { weekStartsOn: 1 }), "yyyy-MM-dd"),
    };
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
