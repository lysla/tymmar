// src/components/WeekNavigator.tsx
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, isMonday } from "date-fns";
import type { Interval } from "date-fns";
import { enGB } from "date-fns/locale";
import { getMonday, toISO } from "../helpers";
import { usePeriodDataContext } from "../hooks";

export default function WeekNavigator() {
    const { fromDateISO, fromDate, toDateISO, employeeStartDateISO, employeeEndDateISO, jumpToPeriod, loading, visibleMonth, setVisibleMonth, monthPeriods, periodDaysWithEntries } = usePeriodDataContext();

    /** 👀 make sure the selectable interval is within the employee bounds */
    const allowedInterval: Interval | null = useMemo(() => {
        if (!employeeStartDateISO && !employeeEndDateISO) return null;
        return {
            start: employeeStartDateISO ?? new Date(-8640000000000000),
            end: employeeEndDateISO ?? new Date(8640000000000000),
        };
    }, [employeeStartDateISO, employeeEndDateISO]);
    const isDayAllowed = (day: Date) => !allowedInterval || isWithinInterval(day, allowedInterval);
    const fromMonth = useMemo(() => (employeeStartDateISO ? startOfMonth(employeeStartDateISO) : undefined), [employeeStartDateISO]);
    const toMonth = useMemo(() => (employeeEndDateISO ? endOfMonth(employeeEndDateISO) : undefined), [employeeEndDateISO]);

    /* 👀 current selected week interval */
    const selectedWeekInterval: Interval = useMemo(() => {
        const start = startOfWeek(fromDateISO, { weekStartsOn: 1 });
        const end = endOfWeek(toDateISO, { weekStartsOn: 1 });
        return { start, end };
    }, [fromDateISO, toDateISO]);

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
