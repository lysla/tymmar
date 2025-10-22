// api/_employees/put.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { requireAdmin } from "../_shared/auth";
import { db } from "../_shared/db";
import { employees } from "../../db/schema";
import { Employee, EmployeeForm } from "../../src/types";
import { eq } from "drizzle-orm";
import { isDateBefore } from "../../src/helpers";
import { supadmin } from "../_shared/supabase";

export const putEmployees = async function (req: VercelRequest, res: VercelResponse) {
    /** 👀 only admin can update records */
    await requireAdmin(req);

    const id = Number(req.body.id);

    if (!id || id <= 0) {
        return res.status(400).json({ error: "Valid record id is required" });
    }

    const formBody = (req.body as EmployeeForm) ?? {};

    /** 👀 fields validation */
    if (!formBody.name?.trim() || !formBody.surname?.trim() || !formBody.email?.trim()) {
        return res.status(400).json({ error: "Missing fields" });
    }
    if (formBody.startDate && formBody.endDate && !isDateBefore(formBody.startDate, formBody.endDate)) {
        return res.status(400).json({ error: "startDate must be <= endDate" });
    }

    /** 👀 fetch existing employee */
    const [existing] = await db.select().from(employees).where(eq(employees.id, id)).limit(1);

    /** 👀 normalize user body */
    const normalizedUserBody = {
        email: String(formBody.email).trim(),
        ...(formBody.password?.trim() && { password: String(formBody.password).trim() }),
    };

    /** 👀 updates the user first */
    const { error } = await supadmin.auth.admin.updateUserById(existing.userId, normalizedUserBody);
    if (error) return res.status(400).json({ error: error.message });

    /** 👀 normalize employee body */
    const normalizedBody = {
        name: String(formBody.name).trim(),
        surname: String(formBody.surname).trim(),
        ...(formBody.startDate ? { startDate: String(formBody.startDate) } : {}),
        ...(formBody.endDate ? { endDate: String(formBody.endDate) } : {}),
    };

    /** 👀 updates the employee */
    const [row] = await db.update(employees).set(normalizedBody).where(eq(employees.id, id)).returning();

    return res.status(200).json({ employee: row as Employee });
};
