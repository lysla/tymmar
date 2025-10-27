// src/router/RouteGuards.tsx
import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router";
import { useAuth } from "../hooks";

/** 👀 guard for normal level authorization */
export function RequireAuth({ children }: { children: ReactNode }) {
    const { user, loading } = useAuth();
    const loc = useLocation();
    if (loading)
        return (
            <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );
    if (!user) return <Navigate to="/signin" replace state={{ from: loc }} />;
    return <>{children}</>;
}

/** 👀 guard for admin level authorization */
export function RequireAdmin({ children }: { children: ReactNode }) {
    const { user, loading, isAdmin } = useAuth();
    const loc = useLocation();
    if (loading)
        return (
            <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );
    if (!user) return <Navigate to="/admin/signin" replace state={{ from: loc }} />;
    if (!isAdmin) return <Navigate to="/" replace />;
    return <>{children}</>;
}
