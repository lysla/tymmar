// AppRouter.tsx
import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { RequireAuth, RequireAdmin } from "./RouteGuards";
import SignIn from "./SignIn";
import AdminSignIn from "./AdminSignIn";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";

export default function AppRouter() {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Root: logged-in → /app; logged-out → /signin */}
            <Route path="/" element={user ? <Navigate to="/app" replace /> : <Navigate to="/signin" replace />} />

            {/* Employee app: ANY authenticated user (admins included) */}
            <Route
                path="/app"
                element={
                    <RequireAuth>
                        <Dashboard />
                    </RequireAuth>
                }
            />

            {/* Employee sign-in */}
            <Route path="/signin" element={<SignIn />} />

            {/* Admin app: admin-only */}
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <AdminDashboard />
                    </RequireAdmin>
                }
            />

            {/* Admin sign-in */}
            <Route path="/admin/signin" element={<AdminSignIn />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
