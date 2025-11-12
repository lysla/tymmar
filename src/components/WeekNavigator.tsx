// src/components/WeekNavigator.tsx
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isMonday, startOfDay, parseISO } from "date-fns";
import type { Interval } from "date-fns";
import { enGB } from "date-fns/locale";
import { getMonday, toISO } from "../helpers";
import { usePeriodDataContext } from "../hooks";

export default function WeekNavigator() {
    const { fromDateISO, fromDate, toDate, employeeStartDateISO, employeeEndDateISO, jumpToPeriod, loading, visibleMonth, setVisibleMonth, monthPeriods, periodDaysWithEntries } = usePeriodDataContext();
    const employeeStartDate = employeeStartDateISO ? startOfDay(typeof employeeStartDateISO === "string" ? parseISO(employeeStartDateISO) : employeeStartDateISO) : null;
    const employeeEndDate = employeeEndDateISO ? startOfDay(typeof employeeEndDateISO === "string" ? parseISO(employeeEndDateISO) : employeeEndDateISO) : null;

    /** 👀 make sure the selectable interval is within the employee bounds */
    const allowedInterval: Interval | null = useMemo(() => {
        if (!employeeStartDate && !employeeEndDate) return null;
        return {
            start: employeeStartDate ?? new Date(-8640000000000000),
            end: employeeEndDate ?? new Date(8640000000000000),
        };
    }, [employeeStartDate, employeeEndDate]);
    const isDayAllowed = (day: Date) => !allowedInterval || isWithinInterval(day, allowedInterval);
    const fromMonth = useMemo(() => (employeeStartDate ? startOfMonth(employeeStartDate) : undefined), [employeeStartDate]);
    const toMonth = useMemo(() => (employeeEndDate ? endOfMonth(employeeEndDate) : undefined), [employeeEndDate]);

    /* 👀 current selected week interval */
    const selectedWeekInterval: Interval = useMemo(() => {
        const start = startOfWeek(fromDate, { weekStartsOn: 1 });
        const end = endOfWeek(toDate, { weekStartsOn: 1 });
        return { start, end };
    }, [fromDate, toDate]);

    /* 👀 whichever day gets selected, snap to monday so the period will be its week */
    function handleSelect(day?: Date) {
        if (!day || !isDayAllowed(day)) return;
        const mondayISO = toISO(getMonday(day));
        jumpToPeriod(mondayISO);
    }

    /* 👀 modifiers for the week UI */
    const isWeekClosed = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = monthPeriods[monISO];
        return !!s?.closed;
    };
    const isWeekFull = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = monthPeriods[monISO];
        return !!s && !s.closed && periodDaysWithEntries === 7;
    };
    const isWeekDirty = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = monthPeriods[monISO];
        return !!s && !s.closed && periodDaysWithEntries > 0 && periodDaysWithEntries < 7;
    };

    return (
        <div className={loading ? "pointer-events-none opacity-60" : ""}>
            <DayPicker
                key={fromDateISO}
                mode="single"
                selected={fromDate}
                onSelect={handleSelect}
                onMonthChange={(d) => setVisibleMonth(startOfMonth(d))}
                month={visibleMonth}
                locale={enGB}
                showOutsideDays
                startMonth={fromMonth}
                endMonth={toMonth}
                disabled={allowedInterval ? (day) => !isWithinInterval(day, allowedInterval) : undefined}
                modifiers={{
                    selectedWeek: (day) => isWithinInterval(day, selectedWeekInterval),
                    weekClosed: isWeekClosed,
                    weekFull: isWeekFull,
                    weekDirty: isWeekDirty,
                }}
                modifiersClassNames={{
                    selectedWeek: "bg-tertiary",
                    weekClosed: "week-closed",
                    weekFull: "week-full",
                    weekDirty: "week-dirty",
                }}
                captionLayout="dropdown"
            />
        </div>
    );
}
