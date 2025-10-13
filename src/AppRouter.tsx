import { Routes, Route, Navigate } from "react-router";
import { useAuth } from "./context/AuthContext";
import { RequireAuth, RequireAdmin } from "./RouteGuards";
import SignIn from "./SignIn";
import AdminSignIn from "./AdminSignIn";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import AdminAddEmployee from "./AdminAddEmployee";

export default function AppRouter() {
    const { user, isAdmin, loading } = useAuth();

    // Optional: avoid flicker while we don't know the session
    if (loading) return <p>Loading…</p>;

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

            {/* Employee sign-in: if logged in, always go to / */}
            <Route path="/signin" element={user ? <Navigate to="/" replace /> : <SignIn />} />

            {/* Admin app: admin-only */}
            <Route
                path="/admin"
                element={
                    <RequireAdmin>
                        <AdminDashboard />
                    </RequireAdmin>
                }
            />

            <Route
                path="/admin/add-user"
                element={
                    <RequireAdmin>
                        <AdminAddEmployee />
                    </RequireAdmin>
                }
            />

            {/* Admin sign-in:
          - if logged in AND admin → /admin
          - if logged in but NOT admin → /
          - if logged out → show admin signin */}
            <Route path="/admin/signin" element={user ? isAdmin ? <Navigate to="/admin" replace /> : <Navigate to="/" replace /> : <AdminSignIn />} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
