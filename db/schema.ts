/* 
npx drizzle-kit generate
npx drizzle-kit push
*/

import { pgTable, serial, text, integer, date, uuid, index, unique, numeric, pgEnum, timestamp, boolean } from "drizzle-orm/pg-core";

/* --- ENUMS --- */
export const dayTypeEnum = pgEnum("day_type", ["work", "sick", "time_off"]);

/* --- employees --- */
export const employees = pgTable(
    "employees",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        userId: uuid("user_id").unique(), // one auth user per employee (optional)
    },
    (t) => [unique("employees_user_id_uk").on(t.userId), index("employees_user_idx").on(t.userId)]
);

/* --- hours: 1 row per employee per day, total hours only --- */
export const hours = pgTable(
    "hours",
    {
        id: serial("id").primaryKey(),
        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),

        workDate: date("work_date").notNull(),

        // numeric(5,2): e.g., 7.50
        totalHours: numeric("total_hours", { precision: 5, scale: 2 }).notNull().default("0"),

        type: dayTypeEnum("type").notNull().default("work"),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("hours_employee_idx").on(t.employeeId), index("hours_employee_date_idx").on(t.employeeId, t.workDate), unique("hours_employee_date_uk").on(t.employeeId, t.workDate)]
);

/* --- settings: global expected hours per weekday (Mon..Sun) --- */
export const settings = pgTable("settings", {
    id: serial("id").primaryKey(),

    mon: numeric("mon_hours", { precision: 4, scale: 2 }).notNull().default("8"),
    tue: numeric("tue_hours", { precision: 4, scale: 2 }).notNull().default("8"),
    wed: numeric("wed_hours", { precision: 4, scale: 2 }).notNull().default("8"),
    thu: numeric("thu_hours", { precision: 4, scale: 2 }).notNull().default("8"),
    fri: numeric("fri_hours", { precision: 4, scale: 2 }).notNull().default("8"),
    sat: numeric("sat_hours", { precision: 4, scale: 2 }).notNull().default("0"),
    sun: numeric("sun_hours", { precision: 4, scale: 2 }).notNull().default("0"),

    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/* --- periods: one row per employee per week (e.g., 2025-W42) --- */
export const periods = pgTable(
    "periods",
    {
        id: serial("id").primaryKey(),

        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),

        // ISO-like week key: "YYYY-Www" (e.g., 2025-W42)
        weekKey: text("week_key").notNull(),

        // Optional: store the Monday of the week for easier date range queries
        weekStartDate: date("week_start_date").notNull(),

        // Whether this week is closed for edits
        closed: boolean("closed").notNull().default(false),
        closedAt: timestamp("closed_at", { withTimezone: true }),

        // Optional: cached total hours for the week (for fast dashboards)
        totalHours: numeric("total_hours", { precision: 6, scale: 2 }).default("0"),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [unique("periods_employee_week_uk").on(t.employeeId, t.weekKey), index("periods_employee_idx").on(t.employeeId), index("periods_week_key_idx").on(t.weekKey), index("periods_week_start_idx").on(t.weekStartDate)]
);
