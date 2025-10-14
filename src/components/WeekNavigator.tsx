// src/components/WeekNavigator.tsx
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, startOfMonth, endOfMonth } from "date-fns";
import type { Interval } from "date-fns";
import { enGB } from "date-fns/locale";
import { getMonday, toISO } from "../helpers";

export default function WeekNavigator({
    weekStartISO,
    onJump, // receives monday ISO (YYYY-MM-DD)
    disabled,
    startDateISO,
    endDateISO,
}: {
    weekStartISO: string;
    onJump: (mondayISO: string) => void;
    disabled?: boolean;
    startDateISO?: string | null;
    endDateISO?: string | null;
}) {
    // Selected Monday as Date
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

    // Restrict month navigation to bounds (optional but nice)
    const fromMonth = useMemo(() => (startDateISO ? startOfMonth(parseISO(startDateISO)) : undefined), [startDateISO]);
    const toMonth = useMemo(() => (endDateISO ? endOfMonth(parseISO(endDateISO)) : undefined), [endDateISO]);

    // Full selected week range (Mon..Sun)
    const weekInterval: Interval = useMemo(() => {
        const start = startOfWeek(monday, { weekStartsOn: 1 });
        const end = endOfWeek(monday, { weekStartsOn: 1 });
        return { start, end };
    }, [monday]);

    const isDayAllowed = (day: Date) => !allowedInterval || isWithinInterval(day, allowedInterval);

    function handleSelect(day?: Date) {
        if (!day || !isDayAllowed(day)) return;
        const mondayISO = toISO(getMonday(day));
        onJump(mondayISO);
    }

    return (
        <div className={disabled ? "pointer-events-none opacity-60" : ""}>
            <DayPicker
                key={weekStartISO} // helps during HMR
                mode="single"
                selected={monday}
                onSelect={handleSelect}
                locale={enGB}
                showOutsideDays
                startMonth={fromMonth}
                endMonth={toMonth}
                disabled={allowedInterval ? (day) => !isWithinInterval(day, allowedInterval) : undefined}
                modifiers={{
                    selectedWeek: (day) => isWithinInterval(day, weekInterval),
                }}
                modifiersClassNames={{
                    selectedWeek: "bg-tertiary",
                }}
                captionLayout="dropdown"
            />
        </div>
    );
}
