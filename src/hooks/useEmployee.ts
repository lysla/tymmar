// src/hooks/useEmployee.ts
import { createContext, useContext } from "react";
import type { Employee } from "../types";

/** 👀 type for what this context offers */
export type EmployeeContextType = {
    status: "idle" | "loading" | "ok" | "missing" | "error";
    employee: Employee | null;
    refetch: () => Promise<void>;
};

export const EmployeeContext = createContext<EmployeeContextType | null>(null);

export function useEmployee() {
    const ctx = useContext(EmployeeContext);
    if (!ctx) throw new Error("useEmployee must be used within <EmployeeProvider>");
    return ctx;
}
