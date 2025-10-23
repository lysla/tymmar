import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import "react-day-picker/dist/style.css";
import "./index.css";
import AppRouter from "./AppRouter";
import { AuthProvider } from "./context";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <AuthProvider>
                <AppRouter />
            </AuthProvider>
        </BrowserRouter>
    </StrictMode>
);
