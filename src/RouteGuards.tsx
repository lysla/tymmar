// src/RouteGuards.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./context/AuthContext";
import { useEmployee } from "./context/EmployeeContext";

export function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading) return <p>Loading…</p>;
    if (!user) return <Navigate to="/signin" replace state={{ from: loc }} />;
    return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const loc = useLocation();
    if (loading) return <p>Loading…</p>;
    if (!user) return <Navigate to="/admin/signin" replace state={{ from: loc }} />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
}

/** Use this if you still want to block the employee area when no employee row exists */
export function RequireEmployeeRecord({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const { status } = useEmployee();
    const loc = useLocation();

    if (loading) return <p>Loading…</p>;
    if (!user) return <Navigate to="/signin" replace state={{ from: loc }} />;
    if (isAdmin) return <Navigate to="/admin" replace />;

    if (status === "loading" || status === "idle") return <p>Loading…</p>;
    if (status === "missing") return <p>Account not configured for employee access.</p>;
    if (status === "error") return <p>Couldn’t load your profile.</p>;

    return <>{children}</>;
}
