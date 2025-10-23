// api/_ai/schema.ts
import z from "zod";
import { DAY_TYPES } from "../../src/types";

/** 👀 this schema reflects the single entry, having hours between 0 (not included) and 24 (included) plus an allowed type */
export const EntrySchema = z
    .object({
        hours: z.number().min(0.01).max(24),
        type: z.enum(DAY_TYPES),
    })
    .strict();

/** 👀 this schema reflects one entire day with multiple entries, having a date, a total of expected hours, the corresponding week day name */
export const DaySchema = z
    .object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        expectedHours: z.number().min(0).max(24),
        weekdayName: z.enum(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
        entries: z.array(EntrySchema),
    })
    .strict();

/** 👀 schema for what AI will output: an array of days entries and a rationale sentence */
export const OutputSchema = z
    .object({
        suggestions: z.array(DaySchema).length(7),
        rationale: z.string().optional(),
    })
    .strict();

/** 👀 schema for what AI will receive: the user command, and the array of days with entries */
export const InputSchema = z
    .object({
        command: z.string().min(1),
        currentEntries: z.array(DaySchema).length(7),
    })
    .strict();
