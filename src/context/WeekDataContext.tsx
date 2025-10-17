// src/context/WeekDataContext.tsx
import { createContext, useContext } from "react";
import { useWeekData } from "../hooks/useWeekData";

const WeekDataContext = createContext<ReturnType<typeof useWeekData> | null>(null);

export function WeekDataProvider({ children, getAccessToken, startDateISO, endDateISO }: { children: React.ReactNode; getAccessToken: () => Promise<string | undefined>; startDateISO?: string | null; endDateISO?: string | null }) {
    const weekData = useWeekData(getAccessToken, { startDateISO, endDateISO });
    return <WeekDataContext.Provider value={weekData}>{children}</WeekDataContext.Provider>;
}

export function useWeekDataContext() {
    const ctx = useContext(WeekDataContext);
    if (!ctx) throw new Error("useWeekDataContext must be used inside <WeekDataProvider>");
    return ctx;
}
