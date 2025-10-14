import { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "./AuthContext";
import type { Employee } from "../types";

type EmployeeValue = {
    status: "idle" | "loading" | "ok" | "missing" | "error";
    employee: Employee | null;
    refetch: () => Promise<void>;
};

const EmployeeContext = createContext<EmployeeValue | null>(null);

export function EmployeeProvider({ children }: { children: React.ReactNode }) {
    const { user, getAccessToken } = useAuth();
    const [employee, setEmployee] = useState<Employee | null>(null);
    const [status, setStatus] = useState<EmployeeValue["status"]>("idle");
    const fetchedRef = useRef<string | null>(null); // store last fetched userId

    const load = async () => {
        if (!user) {
            setEmployee(null);
            setStatus("idle");
            fetchedRef.current = null;
            return;
        }
        // avoid duplicate fetch if already fetched for this userId
        if (fetchedRef.current === user.id && (status === "ok" || status === "missing")) return;

        setStatus("loading");
        try {
            const token = await getAccessToken();
            if (!token) {
                setEmployee(null);
                setStatus("missing");
                fetchedRef.current = user.id;
                return;
            }
            const res = await fetch("/api/employees?id=me", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error("HTTP " + res.status);
            const json = await res.json();
            setEmployee(json.employee ?? null);
            setStatus(json.employee ? "ok" : "missing");
            fetchedRef.current = user.id;
        } catch {
            setEmployee(null);
            setStatus("error");
            fetchedRef.current = user.id;
        }
    };

    useEffect(() => {
        // run on mount and whenever the user id changes
        void load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const value = useMemo<EmployeeValue>(() => ({ status, employee, refetch: load }), [status, employee]);

    return <EmployeeContext.Provider value={value}>{children}</EmployeeContext.Provider>;
}

export function useEmployee() {
    const ctx = useContext(EmployeeContext);
    if (!ctx) throw new Error("useEmployee must be used within <EmployeeProvider>");
    return ctx;
}
