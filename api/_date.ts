// api/_date.ts
import { startOfWeek, addDays as dfAddDays, format, parseISO } from "date-fns";
import { DayType } from "../src/types";

export function getMonday(d: Date = new Date()): Date {
    return startOfWeek(d, { weekStartsOn: 1 });
}

export function toISO(d: Date): string {
    return format(d, "yyyy-MM-dd");
}

export function getMondayISO(dateISO: string | Date): string {
    const date = dateISO instanceof Date ? dateISO : parseISO(dateISO);
    return toISO(getMonday(date));
}

export function addDaysISO(dateISO: string, n: number): string {
    return toISO(dfAddDays(parseISO(dateISO), n));
}

export function isDateISO(s?: string): s is string {
    return Boolean(s && /^\d{4}-\d{2}-\d{2}$/.test(s));
}

export function isValidType(t?: string): t is DayType {
    return t === "work" || t === "sick" || t === "time_off";
}

export function isoWeekKeyFromMonday(mondayISO: string): string {
    const d = new Date(mondayISO + "T00:00:00Z");
    const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const dayNum = (date.getUTCDay() + 6) % 7; // Mon=0..Sun=6
    date.setUTCDate(date.getUTCDate() - dayNum + 3);
    const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
    const weekNo = 1 + Math.round(((date.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    const year = date.getUTCFullYear();
    return `${year}-W${String(weekNo).padStart(2, "0")}`;
}
