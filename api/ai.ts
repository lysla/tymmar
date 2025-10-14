// api/ai.ts
export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";

const InputSchema = z.object({
    command: z.string().min(1),
    weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    expectedByDay: z.array(z.number()).length(7),
    entries: z.record(
        z.string(),
        z.object({
            totalHours: z.number(),
            type: z.enum(["work", "sick", "time_off"]).optional(),
        })
    ),
    allowedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(7),
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const parsed = InputSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
        }

        const { command, weekStart, expectedByDay, entries, allowedDates, mode } = parsed.data;

        const system = ["You are an assistant that proposes daily hour entries for exactly one week.", "You will be given: (a) the week's Monday date, (b) expected hours per weekday, (c) the CURRENT entries map, and (d) a Mode.", "", "IMPORTANT POLICY ABOUT CURRENT ENTRIES:", " - Current entries are CONTEXT ONLY. Do NOT preserve them unless Mode or the user says so.", " - Mode = 'overwrite-week' → overwrite ALL 7 days according to the instructions/expected hours.", " - Mode = 'fill-missing'   → only propose changes for days that are empty/zero.", "", "DATE BOUNDS:", " - Only use the 7 provided dates (allowedDates). Never invent dates.", " - If asked to fill the week, return exactly those dates.", "", "ABSENCE RULES:", " - If user says they did not work / were absent / time off / sick:", "   • totalHours = 0", "   • type = 'sick' if sickness is mentioned", "   • type = 'time_off' if vacation/leave is mentioned", "   • otherwise type = 'work' with totalHours = 0", "", "DEFAULT 'FILL NORMALLY':", " - Mon–Fri = expected hours; Sat/Sun = 0, unless user says otherwise.", "", "OUTPUT:", " - Return ONLY JSON matching the schema. The JSON MUST follow these rules."].join("\n");

        const userMsg = {
            role: "user" as const,
            content: JSON.stringify({
                instructions: command,
                mode, // 👈 tell the model the intent
                weekStart,
                allowedDates,
                expectedByDay, // Mon..Sun
                currentEntries: entries,
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
