// src/components/WeekNavigator.tsx
import { useMemo } from "react";
import { DayPicker } from "react-day-picker";
import { startOfWeek, endOfWeek, isWithinInterval, parseISO } from "date-fns";
import type { Interval } from "date-fns";
import { enGB } from "date-fns/locale";
import { getMonday, toISO } from "../helpers";

export default function WeekNavigator({
    weekStartISO,
    onJump, // receives monday ISO (YYYY-MM-DD)
    disabled,
}: {
    weekStartISO: string; // current Monday, "YYYY-MM-DD"
    onJump: (mondayISO: string) => void;
    disabled?: boolean;
}) {
    // Selected Monday as Date
    const monday = parseISO(weekStartISO);

    // Compute full selected week range (Mon..Sun)
    const weekInterval: Interval = useMemo(() => {
        const start = startOfWeek(monday, { weekStartsOn: 1 }); // Mon
        const end = endOfWeek(monday, { weekStartsOn: 1 }); // Sun
        return { start, end };
    }, [monday]);

    function handleSelect(day?: Date) {
        if (!day) return;
        const mondayISO = toISO(getMonday(day)); // snap to that week’s Monday
        onJump(mondayISO);
    }

    return (
        <div>
            {/* Inline calendar */}
            <div className={disabled ? "pointer-events-none opacity-60" : ""}>
                <DayPicker
                    mode="single"
                    defaultMonth={monday}
                    selected={monday}
                    onSelect={handleSelect}
                    locale={enGB} // week starts on Monday via locale
                    showOutsideDays
                    modifiers={{
                        // highlight the whole selected week
                        selectedWeek: (day) => isWithinInterval(day, weekInterval),
                    }}
                    modifiersClassNames={{
                        selectedWeek: "bg-tertiary", // tweak to your design system
                    }}
                    captionLayout="dropdown"
                />
            </div>
        </div>
    );
}
