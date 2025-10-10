// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router";
import "./index.css";

import { RequireEmployeeArea, RequireAdminArea } from "./RouteGuards";
import Dashboard from "./Dashboard"; // employee dashboard
import SignIn from "./SignIn"; // employee signin
import AdminDashboard from "./AdminDashboard"; // admin dashboard
import AdminSignIn from "./AdminSignIn"; // admin signin

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <Routes>
                {/* Employee app */}
                <Route
                    path="/"
                    element={
                        <RequireEmployeeArea>
                            <Dashboard />
                        </RequireEmployeeArea>
                    }
                />
                <Route path="/signin" element={<SignIn />} />

                {/* Admin app */}
                <Route
                    path="/admin"
                    element={
                        <RequireAdminArea>
                            <AdminDashboard />
                        </RequireAdminArea>
                    }
                />
                <Route path="/admin/signin" element={<AdminSignIn />} />

                {/* fallback */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
