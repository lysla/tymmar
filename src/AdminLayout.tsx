import { Outlet } from "react-router";
import AdminSidebar from "./AdminSidebar";

export default function AdminLayout() {
    return (
        <div className="w-full min-h-full bg-paper flex">
            <AdminSidebar />

            <main className="px-16 py-8 grow flex flex-col">
                {/* Child routes render here */}
                <Outlet />

                <footer className="px-16 pt-8 mt-auto">
                    <p className="text-center text-xs">&copy; {new Date().getFullYear()} ELVA11. All rights reserved.</p>
                </footer>
            </main>
        </div>
    );
}
