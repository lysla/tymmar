// src/types/schema.ts
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
    updatedAt: Date | string;
};

export type EmployeeForm = {
    name: string;
    surname: string;
    email: string;
    password: string;
    startDate?: Date | string;
    endDate?: Date | string;
    settingsId?: number;
};

export type Employee = EmployeeForm & {
    id: number;
    userId: string | null;
    updatedAt: Date | string;
    createdAt: Date | string;
};

export const DAY_TYPES = ["work", "sick", "time_off"] as const;
export type DayType = (typeof DAY_TYPES)[number];

export type DayEntry = {
    id: number;
    employeeId: number;
    projectId: number | null;
    note: string | null;
    workDate: string;
    type: DayType;
    hours: number;
    updatedAt: Date | string;
    createdAt: Date | string;
};

export type DayExpectation = {
    id: number;
    employeeId: number;
    workDate: string;
    exptectedHours: number;
    updatedAt: Date | string;
    createdAt: Date | string;
};

export type WeekSummary = {
    monday: Date | string;
    daysWithEntries: number;
    closed: boolean;
};
