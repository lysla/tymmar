// src/types/db.ts
export type Employee = {
    id: number;
    name: string;
    surname: string;
    password: string; // only for form use, not stored here
    userId: string | null;
    email: string; // comes from Supabase auth
    startDate: string | null; // ISO date string (YYYY-MM-DD)
    endDate: string | null; // ISO date string (YYYY-MM-DD)
    updatedAt: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)
    createdAt: string; // ISO date string (YYYY-MM-DDTHH:mm:ss.sssZ)
};
