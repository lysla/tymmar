// src/router/AppRouter.tsx
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "../hooks";
import { RequireAdmin, RequireAuth } from "./RouteGuards";
import { Dashboard, SignIn } from "../pages";
import { AdminLayout } from "../layouts";
import { AdminAddEmployee, AdminAddSetting, AdminDashboard, AdminEditEmployee, AdminEditSetting, AdminReports, AdminSettings, AdminSignIn } from "../pages/admin";

export default function AppRouter() {
    const { user, isAdmin, loading } = useAuth();

    /** 👀 fallback loading */
    if (loading)
        return (
            <div className="w-full min-h-full bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );

    return (
        <Routes>
            {/** 👀 employee level user routing */}
            <Route
                path="/"
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />
            <Route path="/signin" element={user ? <Navigate to="/" replace /> : <SignIn />} />

            {/** 👀 admin level user routing */}
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <AdminLayout />
                    </RequireAdmin>
                }>
                <Route index element={<AdminDashboard />} />
                <Route path="add-user" element={<AdminAddEmployee />} />
                <Route path="employee/:id/edit" element={<AdminEditEmployee />} />
                <Route path="settings" element={<AdminSettings />} />
                <Route path="add-setting" element={<AdminAddSetting />} />
                <Route path="setting/:id/edit" element={<AdminEditSetting />} />
                <Route path="reports" element={<AdminReports />} />
            </Route>

            <Route path="/admin/signin" element={user ? isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace /> : <AdminSignIn />} />

            {/** 👀 anything else get rerouted to root */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
