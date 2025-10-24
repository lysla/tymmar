// src/types/schema.ts

export type SettingForm = {
    monHours: number | string;
    tueHours: number | string;
    wedHours: number | string;
    thuHours: number | string;
    friHours: number | string;
    satHours: number | string;
    sunHours: number | string;
    isDefault: boolean;
};

export type Setting = SettingForm & {
    id: number;
    updatedAt: Date | string;
};

export type EmployeeForm = {
    name: string;
    surname: string;
    email: string;
    password: string;
    startDate: Date | string | null;
    endDate: Date | string | null;
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
    hours: number | string;
    updatedAt: Date | string;
    createdAt: Date | string;
};

export type Period = {
    id: number;
    employeeId: number;
    weekKey: string;
    weekStartDate: string | Date;
    closed: boolean;
    closedAt: Date | string | null;
    totalHours?: number | string;
    expectedHours?: number | string;
    updatedAt: Date | string;
    createdAt: Date | string;
};

export type PeriodAction = "close" | "reopen";

export type DayExpectation = {
    id: number;
    employeeId: number;
    workDate: string;
    exptectedHours: number;
    updatedAt: Date | string;
    createdAt: Date | string;
};
