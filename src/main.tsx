import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "react-day-picker/dist/style.css";
import "./index.css";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./context/AuthContext";
import { EmployeeProvider } from "./context/EmployeeContext";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <EmployeeProvider>
                    <AppRouter />
                </EmployeeProvider>
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
