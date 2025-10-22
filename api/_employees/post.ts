// api/_employees/post.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { employees, vEmployees } from "../../db/schema";
import { Employee, EmployeeForm } from "../../src/types";
import { eq } from "drizzle-orm";
import { isDateBefore } from "../../src/helpers";
import { supadmin } from "../_shared/supabase";

export const postEmployees = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can create records */
    await requireAdmin(req);

    const formBody = (req.body as EmployeeForm) ?? {};

    /** 👀 fields validation */
    if (!formBody.name?.trim() || !formBody.surname?.trim() || !formBody.email?.trim() || !formBody.password?.trim()) {
        return res.status(400).json({ error: "Missing fields" });
    }
    if (formBody.startDate && formBody.endDate && !isDateBefore(formBody.startDate, formBody.endDate)) {
        return res.status(400).json({ error: "startDate must be <= endDate" });
    }

    /** 👀 normalize user body */
    const normalizedUserBody = {
        email: String(formBody.email).trim(),
        password: String(formBody.password).trim(),
        email_confirm: true,
    };

    /** 👀 creates the user first */
    const { data, error } = await supadmin.auth.admin.createUser(normalizedUserBody);

    if (error || !data.user) {
        return res.status(400).json({ error: error?.message ?? "Failed to create user" });
    }

    /** 👀 normalize employee body */
    const normalizedBody = {
        name: String(formBody.name).trim(),
        surname: String(formBody.surname).trim(),
        userId: data.user.id,
        ...(formBody.startDate ? { startDate: String(formBody.startDate) } : {}),
        ...(formBody.endDate ? { endDate: String(formBody.endDate) } : {}),
    };

    /** 👀 creates the employee */
    const [inserted] = await db.insert(employees).values(normalizedBody).returning();

    /** 👀 retrieve the employee view */
    const [row] = await db.select().from(vEmployees).where(eq(vEmployees.id, inserted.id)).limit(1);

    if (!row) {
        return res.status(500).json({ error: "Failed to retrieve created employee" });
    }

    return res.status(201).json({ employee: row as Employee });
};
