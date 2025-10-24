import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { startOfWeek, endOfWeek, parseISO, startOfMonth, endOfMonth, isWithinInterval, isMonday as dfIsMonday } from "date-fns";
import type { Interval } from "date-fns";
import { enGB } from "date-fns/locale";
import { getMonday, toISO } from "../helpers";
import { useWeekDataContext } from "../context/PeriodDataContext";

function isMonday(d: Date) {
    return dfIsMonday(d);
}

export default function WeekNavigator() {
    const {
        weekStartISO,
        jumpToWeek,
        loadingWeek,
        startDateISO,
        endDateISO,

        // NEW: from context instead of local state/effects
        visibleMonth,
        setVisibleMonth,
        summaries,
    } = useWeekDataContext();

    const monday = parseISO(weekStartISO);

    // Allowed selection interval
    const allowedInterval: Interval | null = useMemo(() => {
        const start = startDateISO ? parseISO(startDateISO) : null;
        const end = endDateISO ? parseISO(endDateISO) : null;
        if (!start && !end) return null;
        return {
            start: start ?? new Date(-8640000000000000),
            end: end ?? new Date(8640000000000000),
        };
    }, [startDateISO, endDateISO]);

    // Restrict month navigation to bounds (optional)
    const fromMonth = useMemo(() => (startDateISO ? startOfMonth(parseISO(startDateISO)) : undefined), [startDateISO]);
    const toMonth = useMemo(() => (endDateISO ? endOfMonth(parseISO(endDateISO)) : undefined), [endDateISO]);

    // Full selected week range (Mon..Sun)
    const selectedWeekInterval: Interval = useMemo(() => {
        const start = startOfWeek(monday, { weekStartsOn: 1 });
        const end = endOfWeek(monday, { weekStartsOn: 1 });
        return { start, end };
    }, [monday]);

    const isDayAllowed = (day: Date) => !allowedInterval || isWithinInterval(day, allowedInterval);

    function handleSelect(day?: Date) {
        if (!day || !isDayAllowed(day)) return;
        const mondayISO = toISO(getMonday(day));
        jumpToWeek(mondayISO);
    }

    // Modifier predicates: color the Monday cell of each week
    const isWeekClosed = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = summaries[monISO];
        return !!s?.closed;
    };

    const isWeekFull = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = summaries[monISO];
        return !!s && !s.closed && s.daysWithEntries === 7;
    };

    const isWeekDirty = (day: Date) => {
        if (!isMonday(day)) return false;
        const monISO = toISO(day);
        const s = summaries[monISO];
        return !!s && !s.closed && s.daysWithEntries > 0 && s.daysWithEntries < 7;
    };

    return (
        <div className={loadingWeek ? "pointer-events-none opacity-60" : ""}>
            <DayPicker
                key={weekStartISO}
                mode="single"
                selected={monday}
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
