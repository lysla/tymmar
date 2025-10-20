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
    allowedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1),
});

// NEW: multiple entries per date
const OutputSchema = z.object({
    suggestions: z.array(
        z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            entries: z
                .array(
                    z.object({
                        hours: z.number().min(0.01).max(24), // no zero-hour entries
                        type: z.enum(["work", "sick", "time_off"]),
                    })
                )
                .min(1),
        })
    ),
    rationale: z.string().optional(),
});

/* ------------------------ Handler ------------------------ */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const parsed = InputSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
        }

        const { command, weekStart, expectedByDay, allowedDates } = parsed.data;

        // UPDATED system prompt
        const system = ["You are an assistant that proposes daily hour entries for some or all days within the given week.", "You will be given: (a) the week's Monday date, (b) expected hours per day.", "You may return MULTIPLE entries for the same day. Each entry must include { hours, type }.", "If the user says they did not work / were absent / took time off / were sick on a day: if sickness is mentioned → type = 'sick'; otherwise type = 'time_off'.", "When the user refers to a whole day, the SUM of all entries' hours for that day MUST equal the expected hours for that day.", "The total registered hours per day refers to all types combined (work, sick, time_off). For a whole-day time off or sickness, default the sum to expected hours.", "If the user does not specify one or more days, do not propose any entry for those days.", "If, and only if, the user explicitly asks to generally fill one or more days, or the whole week, fill them with total expected hours as entries of type 'work'. One entry is enough.", "Don't add unrequested weekdays hour entries.", "No entry with hours = 0.", "Return ONLY JSON matching the schema. The JSON MUST follow these rules."].join("\n");

        const userMsg = {
            role: "user" as const,
            content: JSON.stringify({
                instructions: command,
                weekStart,
                expectedByDay,
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
        const allowed = new Set(allowedDates);

        // Clamp to allowed dates, clamp hours, drop zero/invalid, and ensure at least one valid entry per day remains
        const safe = (object.suggestions ?? [])
            .filter((s) => allowed.has(s.date))
            .map((s) => {
                const entries = (s.entries || [])
                    .map((e) => ({
                        hours: Math.max(0, Math.min(24, Number(e.hours || 0))),
                        type: e.type ?? "work",
                    }))
                    .filter((e) => e.hours > 0);
                return { date: s.date.trim(), entries };
            })
            .filter((s) => s.entries.length > 0);

        return res.status(200).json({
            suggestions: safe,
            originalSuggestions: object.suggestions,
            rationale: object.rationale ?? null,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err?.message ?? "Server error" });
    }
}
