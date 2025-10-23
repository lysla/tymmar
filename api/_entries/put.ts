// api/_entries/put.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isDateISO, isoWeekKeyFromMonday, toISO, weekdayNameUTC } from "../../src/helpers";
import { db } from "../_shared/db";
import { dayEntries, dayExpectations, periods, settings } from "../../db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { DayEntry, DAY_TYPES, DayType, Period, Setting } from "../../src/types";
import { isAfter, isBefore } from "date-fns";

async function getExpectedHoursForDate(empId: number, empSettingsId: number | null, dateISO: string): Promise<number | null> {
    /** 👀 default fallback if not settings found */
    let sett: Partial<Setting> = {
        monHours: 8,
        tueHours: 8,
        wedHours: 8,
        thuHours: 8,
        friHours: 8,
        satHours: 0,
        sunHours: 0,
    };

    /** 👀 check if employee has specific settings on, if not retrieve default settings */
    const [settRow] = await db
        .select()
        .from(settings)
        .where(empSettingsId ? eq(settings.id, empSettingsId) : eq(settings.isDefault, true))
        .limit(1);

    /** 👀 if some settings are found, use them */
    if (settRow) {
        sett = settRow;
    }

    /** 👀 return the right expected hours for the given week day */
    const wd = weekdayNameUTC(dateISO);
    switch (wd) {
        case "monday":
            return Number(sett.monHours);
        case "tuesday":
            return Number(sett.tueHours);
        case "wednesday":
            return Number(sett.wedHours);
        case "thursday":
            return Number(sett.thuHours);
        case "friday":
            return Number(sett.friHours);
        case "saturday":
            return Number(sett.satHours);
        case "sunday":
        default:
            return Number(sett.sunHours);
    }
}

export const putEntries = async function (req: VercelRequest, res: VercelResponse, empId: number, empSettingsId: number | null) {
    /** 👀 retrieve the passed entries [[date=>[entry]]] */
    const entriesByDate: Record<string, Partial<DayEntry>[]> = req.body.entries;
    if (!entriesByDate || Object.keys(entriesByDate).length === 0) {
        return res.status(400).json({ error: "entries are required in format [[date=>[entry]]]" });
    }

    /** 👀 ensure correct entries format while preparing the new period hour total */
    let periodTotalHours = 0;
    for (const [date, entries] of Object.entries(entriesByDate)) {
        if (!isDateISO(date)) {
            return res.status(400).json({ error: `Invalid date: ${date}` });
        }
        for (const row of entries) {
            if (!DAY_TYPES.includes(row.type as DayType)) {
                return res.status(400).json({ error: `Invalid type for ${date}` });
            }
            const h = Number(row.hours);
            if (!Number.isFinite(h) || h < 0 || h > 24) {
                return res.status(400).json({ error: `Invalid hours for ${date}` });
            }
            periodTotalHours += h;
        }
    }

    /** 👀 retrieving the period informations relative to these entries */
    let endISO = null;
    let startISO = null;
    let weekKey = null;
    for (const d of Object.keys(entriesByDate)) {
        /** 👀 i need earliest date and the end latest date to retrieve the entries */
        startISO = !startISO || isBefore(toISO(d), startISO) ? d : startISO;
        endISO = !endISO || isAfter(toISO(d), endISO) ? d : endISO;
    }
    /** 👀 this only works when the period is a whole week */
    weekKey = isoWeekKeyFromMonday(startISO!);

    /** 👀 upserting the entries */
    await db.transaction(async (tx) => {
        /** 👀 retrieve the period corresponding to the group using the weekKey */
        let [periodRow]: Partial<Period>[] = await tx
            .select()
            .from(periods)
            .where(and(eq(periods.employeeId, empId), eq(periods.weekKey, weekKey)))
            .limit(1);

        /** 👀 if the period doesn't exists yet, we create it, otherwise we update the total hours only */
        if (!periodRow) {
            [periodRow] = await tx
                .insert(periods)
                .values({
                    employeeId: empId,
                    weekKey,
                    weekStartDate: startISO as string,
                    closed: false,
                    totalHours: periodTotalHours.toFixed(2),
                })
                .returning();
        } else {
            [periodRow] = await tx
                .update(periods)
                .set({ totalHours: periodTotalHours.toFixed(2) })
                .where(and(eq(periods.employeeId, empId), eq(periods.weekKey, weekKey)))
                .returning();
        }

        /** 👀 ensure that no new hours get registered on closed periods */
        if (periodRow?.closed) {
            throw Object.assign(new Error(`Week ${weekKey} is closed`), { status: 409 });
        }

        /** 👀 delete existing rows for these dates */
        await tx.delete(dayEntries).where(and(eq(dayEntries.employeeId, empId), inArray(dayEntries.workDate, Object.keys(entriesByDate))));

        /** 👀 insert new rows */
        for (const [d, entries] of Object.entries(entriesByDate)) {
            for (const r of entries) {
                const h = Number(r.hours);
                /** 👀 we never want zero hours entries */
                if (h === 0) continue;

                /** 👀 normalize record body */
                const normalizedBody = {
                    employeeId: empId,
                    workDate: d,
                    type: r.type as DayType,
                    projectId: r.projectId,
                    hours: h.toFixed(2),
                    note: r.note,
                    updatedAt: new Date(),
                };
                await tx.insert(dayEntries).values(normalizedBody);
            }
        }

        /** 👀 snapshot the expected hours for all dates touched */
        for (const d of Object.keys(entriesByDate)) {
            const expected = await getExpectedHoursForDate(empId, empSettingsId, d);
            await tx
                .insert(dayExpectations)
                .values({
                    employeeId: empId,
                    workDate: d,
                    expectedHours: String(expected),
                })
                .onConflictDoUpdate({
                    target: [dayExpectations.employeeId, dayExpectations.workDate],
                    set: {
                        expectedHours: String(expected),
                        updatedAt: new Date(),
                    },
                });
        }
    });

    return res.status(200).json({});
};
