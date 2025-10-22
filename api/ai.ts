// api/ai.ts
export const config = { runtime: "nodejs" };

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { z } from "zod";
import { createOpenAI } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { requireUser } from "./_shared/_auth";

/* ------------------------ Schemas ------------------------ */

const EntrySchema = z
    .object({
        hours: z.number().min(0.01).max(24), // no zero-hour entries
        type: z.enum(["work", "sick", "time_off"]),
    })
    .strict();

const DaySchema = z
    .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        expectedHours: z.number().min(0).max(24),
        weekdayName: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
        entries: z.array(EntrySchema),
    })
    .strict();

const OutputSchema = z
    .object({
        suggestions: z.array(DaySchema).length(7),
        rationale: z.string().optional(),
    })
    .strict();

const InputSchema = z
    .object({
        command: z.string().min(1),
        currentEntries: z.array(DaySchema).length(7),
    })
    .strict();

/* ------------------------ Handler ------------------------ */

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

        // Require authenticated user
        await requireUser(req);

        const parsed = InputSchema.safeParse(req.body ?? {});
        if (!parsed.success) {
            return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
        }

        const { command, currentEntries } = parsed.data;

        // prettier-ignore
        const system = [
            "You are an assistant that proposes daily hour entries for the given week.", 
            "ALWAYS return ONLY JSON matching the schema.", 
            "You will be given the week, structured with all the relative information: the date, the corresponding day of the week, and the expected hours for that day. You will also be given the current entries for that week, if any, with the registered hours and relative type (can be: 'work', 'time_off', 'sick').", 
            "The expected hours are to be considered per day, do not sum them up or consider them for the whole week unless explicitly asked by the user.",
            "When the user refers to a 'whole day', it refers actually to the expected hours for that day. Never consider a whole day as in regular 24 hours or standard office hours, the 'whole day' is always the given expected hours for that day.", 
            "Default type for hours is 'work'.",
            "If the user says they did not work / were absent / took time off / were sick on a day: if sickness is mentioned → type = 'sick'; otherwise type = 'time_off'.", 
            "All types (work, sick, time_off) are treated equally. So even for a whole day time off or sickness, the entry will be equal to the expected hours.", 
            "If the user does specify one or more days, choose whether to merge them with the given current entries (if any), relatively to what the user asks.", 
            "When asked to 'fill' days or the whole week, the total hours of the entries must be equal to the expected hours.",
            "When asked to 'fill', if you consider a day, or the whole week, is already completely filled within the current entries, copy the current entries into your proposal.", 
            "Do not fill days as time_off or sick unless the user specifically says so.",
            "If the user asks to reset / empty days or the whole week, you can return the whole week or days with no entries.",
            "Never return entries with hours = 0. If a day has no hours, return it with an empty entries array.", 
        ].join("\n");

        const userMsg = {
            role: "user" as const,
            content: JSON.stringify({
                instructions: command,
                currentEntries,
            }),
        };

        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const { object } = await generateObject({
            model: openai("gpt-4o-mini"),
            system,
            messages: [userMsg],
            schema: OutputSchema,
            temperature: 0.25, // tighter adherence to rules/schema
        });

        return res.status(200).json({
            suggestions: object.suggestions,
            rationale: object.rationale ?? null,
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ error: err?.message ?? "Server error" });
    }
}
