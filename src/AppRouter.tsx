// AppRouter.tsx
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { RequireAuth, RequireAdmin } from "./RouteGuards";
import SignIn from "./SignIn";
import AdminSignIn from "./AdminSignIn";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import AdminAddEmployee from "./AdminAddEmployee";
import AdminEditEmployee from "./AdminEditEmployee";
import AdminSettings from "./AdminSettings";
import AdminAddSetting from "./AdminAddSetting";
import AdminEditSetting from "./AdminEditSetting";
import AdminLayout from "./AdminLayout";

export default function AppRouter() {
    const { user, isAdmin, loading } = useAuth();
    if (loading)
        return (
            <div className="w-full min-h-dvh bg-paper flex flex-col px-16 py-8">
                <img src="/images/loading.svg" alt="Loading…" className="m-auto" />
            </div>
        );

    return (
        <Routes>
            {/* Root redirect */}
            <Route path="/" element={user ? <Navigate to="/app" replace /> : <Navigate to="/signin" replace />} />

            {/* Employee app */}
            <Route
                path="/app"
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />
            <Route path="/signin" element={user ? <Navigate to="/" replace /> : <SignIn />} />

            {/* Admin app: layout + nested pages */}
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
            </Route>

            <Route path="/admin/signin" element={user ? isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace /> : <AdminSignIn />} />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
