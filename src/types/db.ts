// src/types/db.ts
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
