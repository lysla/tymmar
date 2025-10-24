// src/context/EmployeeContext.tsx
import { useEffect, useMemo, useState, useCallback } from "react";
import type { Employee } from "../types";
import { EmployeeContext, type EmployeeContextType } from "../hooks/useEmployee";
import { useAuth } from "../hooks/useAuth";

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
    const { user, getAccessToken } = useAuth();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [status, setStatus] = useState<EmployeeContextType["status"]>("idle");

    const loadEmployee = useCallback(
        async (force = false) => {
            /** 👀 if there is no authenticated user, reset all and do nothing */
            if (!user) {
                setEmployee(null);
                setStatus("idle");
                return;
            }

            /** 👀 if the employee is already fetched for this user and not forcing a refetch, do nothing */
            if (!force && employee?.userId === user.id && (status === "ok" || status === "missing")) {
                return;
            }

            /** 👀 otherwise start loading before fetching the employee  */
            setStatus("loading");
            try {
                const token = await getAccessToken();
                if (!token) {
                    setEmployee(null);
                    setStatus("error");
                    return;
                }
                /** 👀 fetch self employee  */
                const res = await fetch("/api/employees?id=me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const json = await res?.json();
                setEmployee(json.employee ?? null);
                setStatus(json.employee ? "ok" : "missing");
            } catch {
                setEmployee(null);
                setStatus("error");
            }
        },
        [getAccessToken, status, user, employee]
    );

    useEffect(() => {
        loadEmployee(false);
    }, [loadEmployee]);

    const value = useMemo<EmployeeContextType>(
        () => ({
            status,
            employee,
            refetch: () => loadEmployee(true),
        }),
        [status, employee, loadEmployee]
    );

    return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}
