// src/api.ts
export async function askAIForHours(params: {
    command: string;
    weekStart: string; // YYYY-MM-DD
    expectedByDay: number[]; // Mon..Sun
    entries: Record<string, { totalHours: number; type?: "work" | "sick" | "time_off" }>;
    allowedDates: string[]; // ← NEW: the exact 7 dates for the selected week (YYYY-MM-DD)
    token?: string;
}) {
    const r = await fetch("/api/ai", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(params.token ? { Authorization: `Bearer ${params.token}` } : {}),
        },
        body: JSON.stringify(params), // includes allowedDates
    });

    const data = await r.json();
    if (!r.ok) throw new Error(data?.error || "AI request failed");

    return data as {
        suggestions: { date: string; totalHours: number; type: "work" | "sick" | "time_off" }[];
        rationale?: string | null;
    };
}
