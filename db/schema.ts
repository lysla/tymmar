/**
👀 easy copy-paste to generate and run 'migrations' for the current schema 
npx drizzle-kit generate
npx drizzle-kit push

remind: all the schemas need to be exported so drizzle-kit can use them
*/

import { sql } from "drizzle-orm";
import { pgTable, serial, text, integer, date, uuid, index, unique, numeric, pgEnum, timestamp, boolean, uniqueIndex, primaryKey } from "drizzle-orm/pg-core";
import { DAY_TYPES } from "./../src/types/db";

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
        uniqueIndex("settings_is_default_true_uk")
            .on(t.isDefault)
            .where(sql`${t.isDefault} = true`),
    ]
).enableRLS();

export const employees = pgTable(
    "employees",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        userId: uuid("user_id").notNull(),
        settingsId: integer("settings_id").references(() => settings.id, {
            onDelete: "set null",
        }),
        startDate: date("start_date"),
        endDate: date("end_date"),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [unique("employees_user_id_uk").on(t.userId), index("employees_start_idx").on(t.startDate), index("employees_end_idx").on(t.endDate), index("employees_settings_idx").on(t.settingsId)]
).enableRLS();

export const dayTypeEnum = pgEnum("day_type", DAY_TYPES);

export const dayEntries = pgTable(
    "day_entries",
    {
        id: serial("id").primaryKey(),
        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),
        workDate: date("work_date").notNull(),
        type: dayTypeEnum("type").notNull(),
        projectId: integer("project_id").references(() => projects.id, { onDelete: "set null" }),
        hours: numeric("hours", { precision: 5, scale: 2 }).notNull().default("0"),
        note: text("note"),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("day_entries_date_idx").on(t.workDate), index("day_entries_emp_date_idx").on(t.employeeId, t.workDate), index("day_entries_date_emp_idx").on(t.workDate, t.employeeId), index("day_entries_emp_proj_idx").on(t.employeeId, t.projectId), index("day_entries_proj_date_idx").on(t.projectId, t.workDate)]
).enableRLS();

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
    (t) => [unique("day_expectations_emp_date_uk").on(t.employeeId, t.workDate), index("day_expectations_date_emp_idx").on(t.workDate, t.employeeId)]
).enableRLS();

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
    (t) => [unique("periods_employee_week_uk").on(t.employeeId, t.weekKey), index("periods_closed_weekstart_idx").on(t.closed, t.weekStartDate), index("periods_emp_weekstart_idx").on(t.employeeId, t.weekStartDate)]
).enableRLS();

/** 👀 to review later -- connected with Ale's project */
export const projects = pgTable(
    "projects",
    {
        id: serial("id").primaryKey(),
        title: text("title").notNull(),
        description: text("description"),
        startDate: date("start_date"),
        endDate: date("end_date"),
        progress: integer("progress").notNull().default(0),
        status: text("status").notNull().default("active"),
        createdBy: uuid("created_by").notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [index("projects_start_idx").on(t.startDate), index("projects_end_idx").on(t.endDate), index("projects_created_by_idx").on(t.createdBy)]
).enableRLS();

export const employeeProjects = pgTable(
    "employee_projects",
    {
        employeeId: integer("employee_id")
            .notNull()
            .references(() => employees.id, { onDelete: "cascade" }),
        projectId: integer("project_id")
            .notNull()
            .references(() => projects.id, { onDelete: "cascade" }),
        createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    },
    (t) => [primaryKey({ columns: [t.employeeId, t.projectId], name: "employee_projects_pk" }), index("employee_projects_proj_emp_idx").on(t.projectId, t.employeeId)]
).enableRLS();
