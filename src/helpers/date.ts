export function getMonday(d = new Date()) {
    const day = d.getDay(); // 0=Sun
    const diff = (day === 0 ? -6 : 1) - day;
    const m = new Date(d);
    m.setHours(0, 0, 0, 0);
    m.setDate(d.getDate() + diff);
    return m;
}
export function getMondayISO(dateISO: string): string {
    const d = new Date(dateISO + "T00:00:00Z");
    const day = d.getUTCDay(); // 0 Sun .. 6 Sat
    const diff = (day === 0 ? -6 : 1) - day;
    d.setUTCDate(d.getUTCDate() + diff);
    return d.toISOString().slice(0, 10);
}
export function addDays(date: Date, n: number) {
    const d = new Date(date);
    d.setDate(date.getDate() + n);
    return d;
}
export function toISO(d: Date) {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString().slice(0, 10);
}
export function weekRangeISO(weekStart: Date) {
    return { from: toISO(weekStart), to: toISO(addDays(weekStart, 6)) };
}
export function fmtDayLabel(d: Date) {
    return d.toLocaleDateString(undefined, { weekday: "short" });
}
