// api/ai.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";

/* ------------------------ Schemas ------------------------ */

const InputSchema = z.object({
    command: z.string().min(1),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // Monday of the selected week
    expectedByDay: z.array(z.number()).length(7), // Mon..Sun
    entries: z.record(
        z.string(),
        z.object({
            totalHours: z.number(),
            type: z.enum(["work", "sick", "time_off"]).optional(),
        })
    ),
    // can be < 7 when employment bounds exclude some days
    allowedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
    mode: z.enum(["overwrite-week", "fill-missing"]).optional().default("overwrite-week"),
});

const OutputSchema = z.object({
    suggestions: z.array(
        z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            totalHours: z.number().min(0).max(24),
            type: z.enum(["work", "sick", "time_off"]),
        })
    ),
    rationale: z.string().optional(),
});

/* ------------------------ Helpers ------------------------ */

// Add N days to an ISO date (UTC safe) and return ISO "YYYY-MM-DD"
function addDaysISO(baseISO: string, n: number): string {
    const d = new Date(baseISO + "T00:00:00Z");
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
}

/* ------------------------ Handler ------------------------ */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const parsed = InputSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
        }

        const { command, weekStart, expectedByDay, entries, allowedDates, mode } = parsed.data;

        // Canonical weekday → date mapping for THIS week (plus short names).
        const weekdayDates = {
            Monday: weekStart,
            Tuesday: addDaysISO(weekStart, 1),
            Wednesday: addDaysISO(weekStart, 2),
            Thursday: addDaysISO(weekStart, 3),
            Friday: addDaysISO(weekStart, 4),
            Saturday: addDaysISO(weekStart, 5),
            Sunday: addDaysISO(weekStart, 6),

            Mon: weekStart,
            Tue: addDaysISO(weekStart, 1),
            Wed: addDaysISO(weekStart, 2),
            Thu: addDaysISO(weekStart, 3),
            Fri: addDaysISO(weekStart, 4),
            Sat: addDaysISO(weekStart, 5),
            Sun: addDaysISO(weekStart, 6),
        };

        const system = ["You are an assistant that proposes daily hour entries for exactly one week.", "You will be given: (a) the week's Monday date, (b) expected hours per weekday, (c) the CURRENT entries map, (d) a Mode, and (e) a weekdayDates map.", "", "CRITICAL WEEKDAY RESOLUTION:", " - When the user mentions a weekday by name (e.g., 'Saturday', 'Sat'), you MUST resolve it using the weekdayDates map.", " - Do NOT infer or guess dates from weekday names yourself.", "", "IMPORTANT POLICY ABOUT CURRENT ENTRIES:", " - Current entries are CONTEXT ONLY. Do NOT preserve them unless Mode or the user explicitly says so.", " - Mode = 'overwrite-week' → overwrite ALL dates you are allowed to touch (see allowedDates).", " - Mode = 'fill-missing'   → only propose changes for days that are empty/zero.", "", "DATE BOUNDS:", " - Only use the provided allowedDates. Never invent other dates.", "", "ABSENCE RULES:", " - If the user says they did not work / were absent / took time off / were sick on a day:", "   • totalHours = 0", "   • type = 'sick' if sickness is mentioned", "   • type = 'time_off' if vacation/leave is mentioned", "   • otherwise type = 'work' with totalHours = 0", "", "DEFAULT 'FILL NORMALLY':", " - Mon–Fri = expected hours; Sat/Sun = 0, unless the user says otherwise.", "", "OUTPUT:", " - Return ONLY JSON matching the schema. The JSON MUST follow these rules."].join("\n");

        const userMsg = {
            role: "user" as const,
            content: JSON.stringify({
                instructions: command,
                mode,
                weekStart,
                allowedDates,
                expectedByDay, // Mon..Sun hours
                currentEntries: entries,
                weekdayDates, // <— anchor weekday words to exact dates
            }),
        };

        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            system,
            messages: [userMsg],
            schema: OutputSchema,
            temperature: 0.2,
        });

        // Server-side safety rails:
        // 1) clamp to allowedDates
        // 2) clamp hours
        // 3) if mode = fill-missing, only allow changes where current totalHours is 0 (or absent)
        const allowed = new Set(allowedDates);
        const safe = (object.suggestions ?? [])
            .map((s) => ({
                date: String(s.date).trim(),
                totalHours: Math.max(0, Math.min(24, Number(s.totalHours ?? 0))),
                type: s.type ?? "work",
            }))
            .filter((s) => allowed.has(s.date));

        const finalSuggestions =
            mode === "fill-missing"
                ? safe.filter((s) => {
                      const cur = entries[s.date];
                      const curH = Number(cur?.totalHours ?? 0);
                      return !Number.isFinite(curH) || curH === 0; // only empty/zero days
                  })
                : safe;

        return res.status(200).json({
            suggestions: finalSuggestions,
            rationale: object.rationale ?? null,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err?.message ?? "Server error" });
    }
}
