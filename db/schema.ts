/* 
npx drizzle-kit generate
npx drizzle-kit push
*/

import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, date, uuid, index, unique, numeric, pgEnum, timestamp, boolean, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";

/* --- ENUMS --- */
export const dayTypeEnum = pgEnum("day_type", ["work", "sick", "time_off"]);

/* --- settings: global expected hours per weekday (Mon..Sun) --- */
export const settings = pgTable(
    "settings",
    {
        id: serial("id").primaryKey(),
        mon: numeric("mon_hours", { precision: 4, scale: 2 }).notNull().default("8"),
        tue: numeric("tue_hours", { precision: 4, scale: 2 }).notNull().default("8"),
        wed: numeric("wed_hours", { precision: 4, scale: 2 }).notNull().default("8"),
        thu: numeric("thu_hours", { precision: 4, scale: 2 }).notNull().default("8"),
        fri: numeric("fri_hours", { precision: 4, scale: 2 }).notNull().default("8"),
        sat: numeric("sat_hours", { precision: 4, scale: 2 }).notNull().default("0"),
        sun: numeric("sun_hours", { precision: 4, scale: 2 }).notNull().default("0"),
        isDefault: boolean("is_default").notNull().default(false),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        // Ensure at most ONE default settings row
        uniqueIndex("settings_is_default_true_uk")
            .on(t.id) // arbitrary; required by Drizzle, the uniqueness is enforced by WHERE
            .where(sql`is_default = true`),
    ]
);

export const employees = pgTable(
    "employees",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        userId: uuid("user_id"),

        // link to settings (optional)
        settingsId: integer("settings_id").references(() => settings.id, {
            onDelete: "set null",
            onUpdate: "cascade",
        }),

        // New fields
        startDate: date("start_date"),
        endDate: date("end_date"),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [unique("employees_user_id_uk").on(t.userId), index("employees_user_idx").on(t.userId), index("employees_start_end_idx").on(t.startDate, t.endDate), index("employees_settings_idx").on(t.settingsId)]
);

/* --- (Optional, ready for later) projects --- */
export const projects = pgTable("projects", {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    description: text("description"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    progress: integer("progress").notNull().default(0), // 0..100
    status: text("status").notNull().default("active"), // active | completed | on_hold | cancelled
    createdBy: uuid("created_by").notNull(), // userId of creator
    // You can add client fields later
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

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

export const dayExpectations = pgTable(
    "day_expectations",
    {
        id: serial("id").primaryKey(),
        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),
        workDate: date("work_date").notNull(),
        expectedHours: numeric("expected_hours", { precision: 5, scale: 2 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [unique("day_expectations_emp_date_uk").on(t.employeeId, t.workDate), index("day_expectations_emp_idx").on(t.employeeId), index("day_expectations_date_idx").on(t.workDate)]
);

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

export const employeeProjects = pgTable(
    "employee_projects",
    {
        employeeId: integer("employee_id")
            .notNull()
            .references(() => employees.id, { onDelete: "cascade", onUpdate: "cascade" }),
        projectId: integer("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade", onUpdate: "cascade" }),

        // Optional metadata
        role: text("role").notNull().default("member"), // e.g., member | lead | admin
        allocationPct: numeric("allocation_pct", { precision: 5, scale: 2 }).notNull().default("0"), // 0..100
        startDate: date("start_date"),
        endDate: date("end_date"),

        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [
        // composite primary key
        primaryKey({ columns: [t.employeeId, t.projectId], name: "employee_projects_pk" }),
        // helpful indexes
        index("employee_projects_emp_idx").on(t.employeeId),
        index("employee_projects_proj_idx").on(t.projectId),
    ]
);
