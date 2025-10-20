// src/types/db.ts
export type Setting = {
    id: number;
    mon_hours: number;
    tue_hours: number;
    wed_hours: number;
    thu_hours: number;
    fri_hours: number;
    sat_hours: number;
    sun_hours: number;
    isDefault: boolean;
    updatedAt: string;
};

export type Employee = {
    id: number;
    name: string;
    surname: string;
    password: string; // only for form use, not stored here
    userId: string | null;
    email: string; // comes from Supabase auth
    startDate: string | null;
    endDate: string | null;
    updatedAt: string;
    createdAt: string;
};

export type DayType = "work" | "sick" | "time_off";

export type DayEntry = {
    id: number;
    date: string;
    type: DayType;
    hours: number;
    projectId: number | null;
    note: string | null;
};

export type WeekSummary = {
    monday: string; // YYYY-MM-DD (Monday)
    daysWithEntries: number; // 0..7
    closed: boolean;
};
