import { Link, useLocation } from "react-router";
import { supabase } from "./supabase";

export default function AdminSidebar() {
    const loc = useLocation();

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    }

    const isActive = (paths: string[]) => (paths.includes(loc.pathname) ? "border-b font-bold" : "opacity-80 hover:opacity-100");

    return (
        <aside className="sidebar bg-light px-16 pt-8 flex flex-col items-start gap-y-4 min-w-64">
            <Link to="/" className="logo-typo">
                tymmar
            </Link>

            <button className="button mt-2" onClick={handleSignOut}>
                Sign out
            </button>

            <nav className="flex flex-col gap-y-4 py-8 text-sm">
                <Link to="/admin" className={isActive(["/admin", "/admin/add-user", "/admin/employee/:id/edit"])}>
                    Employees
                </Link>
                <Link to="/admin/settings" className={isActive(["/admin/settings", "/admin/add-setting", "/admin/setting/:id/edit"])}>
                    Settings
                </Link>
                <Link to="/admin/reports" className={isActive(["/admin/reports"])}>
                    Reports
                </Link>
            </nav>
        </aside>
    );
}
