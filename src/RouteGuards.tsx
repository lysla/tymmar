// src/RouteGuards.tsx
import { Navigate, useLocation } from "react-router";
import { useAuth } from "./hooks/useAuth";
import type { ReactNode } from "react";

export function RequireEmployeeArea({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin, isEmployee } = useAuth();
    const loc = useLocation();

    if (loading) return <p>Loading…</p>;
    if (!user) return <Navigate to="/signin" replace state={{ from: loc }} />;
    if (isAdmin) return <Navigate to="/admin" replace />;
    if (!isEmployee) return <Navigate to="/signin" replace />;

    return <>{children}</>;
}

export function RequireAdminArea({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const loc = useLocation();

    if (loading) return <p>Loading…</p>;

    // not signed in → admin login
    if (!user) return <Navigate to="/admin/signin" replace state={{ from: loc }} />;

    // signed in but not admin → send to employee area (or show 403)
    if (!isAdmin) return <Navigate to="/" replace />;

    return <>{children}</>;
}
