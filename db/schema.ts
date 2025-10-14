/* 
npx drizzle-kit generate
npx drizzle-kit push
*/

import { pgTable, serial, text, integer, date, uuid, index, unique, numeric, pgEnum, timestamp, boolean } from "drizzle-orm/pg-core";

/* --- ENUMS --- */
export const dayTypeEnum = pgEnum("day_type", ["work", "sick", "time_off"]);

/* --- employees --- */
// --- employees ---
export const employees = pgTable(
    "employees",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        userId: uuid("user_id").unique(),

        // New fields
        startDate: date("start_date"), // nullable => unknown/unspecified start
        endDate: date("end_date"), // nullable => still employed
        // Optional: track updates
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        unique("employees_user_id_uk").on(t.userId),
        index("employees_user_idx").on(t.userId),

        // Helps queries like: find employees active on a given day,
        // or filter reports by employment window.
        index("employees_start_end_idx").on(t.startDate, t.endDate),
    ]
);

/* --- (Optional, ready for later) projects --- */
export const projects = pgTable(
    "projects",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        code: text("code"), // e.g. "ACME-001"
        active: boolean("active").notNull().default(true),
        // You can add client fields later
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("projects_active_idx").on(t.active)]
);

/* 
  --- day_entries ---
  Multiple entries per employee/day.
  - For work: may repeat (different projectId or even none).
  - For sick/time_off: allow multiple rows as well (notes/reasons), or you can de-dupe in UI.
*/
export const dayEntries = pgTable(
    "day_entries",
    {
        id: serial("id").primaryKey(),

        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),

        workDate: date("work_date").notNull(),

        type: dayTypeEnum("type").notNull(), // 'work' | 'sick' | 'time_off'

        // optional link to a project (usually only for type='work')
        projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),

        hours: numeric("hours", { precision: 5, scale: 2 }).notNull().default("0"),

        note: text("note"),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        // Querying a specific week for an employee:
        index("day_entries_emp_date_idx").on(t.employeeId, t.workDate),
        // Helpful for reports like “hours by project”:
        index("day_entries_emp_proj_idx").on(t.employeeId, t.projectId),
        index("day_entries_proj_date_idx").on(t.projectId, t.workDate),
        // (Intentionally NO unique on (employeeId, workDate, type))
    ]
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

/* --- periods: weekly state/cached total --- */
export const periods = pgTable(
    "periods",
    {
        id: serial("id").primaryKey(),
        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),
        weekKey: text("week_key").notNull(), // "YYYY-Www"
        weekStartDate: date("week_start_date").notNull(),
        closed: boolean("closed").notNull().default(false),
        closedAt: timestamp("closed_at", { withTimezone: true }),
        totalHours: numeric("total_hours", { precision: 6, scale: 2 }).default("0"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [unique("periods_employee_week_uk").on(t.employeeId, t.weekKey), index("periods_employee_idx").on(t.employeeId), index("periods_week_key_idx").on(t.weekKey), index("periods_week_start_idx").on(t.weekStartDate)]
);

/* --- TODEL soon -- hours: 1 row per employee per day, total hours only --- */
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
