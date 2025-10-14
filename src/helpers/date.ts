import { startOfWeek, endOfWeek, addDays as dfAddDays, format, parseISO } from "date-fns";

// Monday as first day of week (weekStartsOn: 1)
export function getMonday(d: Date = new Date()): Date {
    return startOfWeek(d, { weekStartsOn: 1 });
}

export function getMondayISO(dateISO: string): string {
    const d = parseISO(dateISO); // safe parse YYYY-MM-DD
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
    return format(d, "EEE"); // Mon, Tue, ...
}
