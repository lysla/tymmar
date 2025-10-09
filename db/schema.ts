/* 
npx drizzle-kit generate
npx drizzle-kit push 
*/

import { pgTable, serial, text, integer, date, time } from "drizzle-orm/pg-core";

export const employees = pgTable("employees", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    surname: text("surname").notNull(),
});

export const hours = pgTable("hours", {
    id: serial("id").primaryKey(),
    employeeId: integer("employee_id")
        .references(() => employees.id, { onDelete: "cascade" })
        .notNull(),
    workDate: date("work_date").notNull(),
    fromTime: time("from_time").notNull(),
    toTime: time("to_time").notNull(),
    type: text("type").notNull(), // 'standard_in' | 'sick_time' | 'time_off'
});
