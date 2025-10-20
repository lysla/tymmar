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

/* ------------------------ Handler ------------------------ */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const parsed = InputSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
        }

        const { command, weekStart, expectedByDay, allowedDates } = parsed.data;

        const system = ["You are an assistant that proposes daily hour entries for some or all days within the given week.", "You will be given: (a) the week's Monday date, (b) expected hours per day.", "If the user says they did not work / were absent / took time off / were sick on a day, if sickness is mentioned: type = 'sick' - otherwise type = 'time_off'.", "When the user refers to a whole day, the totalHours must be equal to the expected hours for that day.", "The totalHours refers to the total registered hours for the user, not only the worked hours. So if a user mentions sickness or time off, the default totalHours for the whole day is always equal to the expect hours for that day.", "If the user does not specificy one or more days, do not propose any hour entry for those days.", "If, and only if, the user explicitly asks to generally fill one or more days, or the whole week, fill them with totalHours = expected hours and type = 'work'.", "Don't add unrequested weekdays hour entries.", "An hour entry with totalHours = 0 can't exists.", "Return ONLY JSON matching the schema. The JSON MUST follow these rules."].join("\n");

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
        // 1) clamp to allowedDates
        // 2) clamp hours
        const allowed = new Set(allowedDates);
        const safe = (object.suggestions ?? [])
            .map((s) => ({
                date: String(s.date).trim(),
                totalHours: Math.max(0, Math.min(24, Number(s.totalHours ?? 0))),
                type: s.type ?? "work",
            }))
            .filter((s) => allowed.has(s.date));

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
