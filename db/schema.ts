/* 
npx drizzle-kit generate
npx drizzle-kit push 
*/

import { pgTable, serial, text, integer, date, time, uuid, index, unique } from "drizzle-orm/pg-core";

/* employees */
export const employees = pgTable(
    "employees",
    {
        id: serial("id").primaryKey(),
        name: text("name").notNull(),
        surname: text("surname").notNull(),
        userId: uuid("user_id").unique(), // inline unique is fine too
    },
    (t) => [
        // If you want an explicit named unique constraint as well:
        unique("employees_user_id_uk").on(t.userId),
        index("employees_user_idx").on(t.userId),
    ]
);

/* hours */
export const hours = pgTable(
    "hours",
    {
        id: serial("id").primaryKey(),
        employeeId: integer("employee_id")
            .references(() => employees.id, { onDelete: "cascade" })
            .notNull(),
        workDate: date("work_date").notNull(),
        fromTime: time("from_time").notNull(),
        toTime: time("to_time").notNull(),
        type: text("type").notNull(), // or switch to a pgEnum later
    },
    (t) => [index("hours_employee_idx").on(t.employeeId), index("hours_employee_date_idx").on(t.employeeId, t.workDate), unique("hours_emp_date_from_to_uk").on(t.employeeId, t.workDate, t.fromTime, t.toTime)]
);
