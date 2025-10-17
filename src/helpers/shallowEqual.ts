export function shallowEqualHours(a: Record<string, number>, b: Record<string, number>, keys: string[]) {
    for (const k of keys) if ((a[k] ?? 0) !== (b[k] ?? 0)) return false;
    return true;
}
