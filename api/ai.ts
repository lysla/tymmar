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
    allowedDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(7), // ← the 7 exact dates Mon..Sun
});

const OutputSchema = z.object({
    suggestions: z.array(
        z.object({
            date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            totalHours: z.number().min(0).max(24), // force valid hours
            type: z.enum(["work", "sick", "time_off"]), // REQUIRED, no fallback
        })
    ),
    rationale: z.string().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        const parse = InputSchema.safeParse(req.body ?? {});
        if (!parse.success) {
            return res.status(400).json({ error: "Invalid body", issues: parse.error.issues });
        }
        const { command, weekStart, expectedByDay, entries, allowedDates } = parse.data;

        const system = ["You are an assistant that proposes daily hour entries for a single week.", "Only use the provided week and dates. Never invent other dates.", "If the user asks to 'fill normally the whole week', use Mon–Fri expected hours and 0 for Sat/Sun, unless stated otherwise.", "If the user says they did not work / were absent / took time off / were sick on a given day:", "  - Set totalHours = 0 for that day.", "  - Set type = 'sick' if sick is mentioned.", "  - Set type = 'time_off' if vacation/leave is mentioned.", "  - Otherwise use type = 'work' with totalHours = 0.", "The JSON output MUST exactly match these rules, even if the rationale text differs.", "Always explicitly include those days in suggestions with 0 hours, never skip them.", "Return only JSON matching the schema; no commentary outside JSON."].join("\n");

        const userMsg = {
            role: "user" as const,
            content: JSON.stringify({
                instructions: command,
                weekStart,
                allowedDates, // ← critical: constrain to these
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

        // Hard-clamp on server: only keep allowedDates and clamp hours
        const allowed = new Set(allowedDates);
        const suggestions = (object.suggestions ?? [])
            .map((s) => ({
                date: String(s.date).trim(),
                totalHours: Math.max(0, Math.min(24, Number(s.totalHours ?? 0))),
                type: s.type ?? "work",
            }))
            .filter((s) => allowed.has(s.date));

        return res.status(200).json({
            suggestions,
            rationale: object.rationale ?? null,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err?.message ?? "Server error" });
    }
}
