import { Link, useLocation } from "react-router";
import { supabase } from "./supabase";

export default function AdminSidebar() {
    const loc = useLocation();

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    }

    const isActive = (path: string) => (loc.pathname === path ? "border-b font-bold" : "opacity-80 hover:opacity-100");

    return (
        <aside className="sidebar bg-light px-16 pt-8 flex flex-col items-start gap-y-4 min-w-64">
            <Link to="/" className="logo-typo">
                tymmar
            </Link>

            <button className="button mt-2" onClick={handleSignOut}>
                Sign out
            </button>

            <nav className="flex flex-col gap-y-4 py-8 text-sm">
                <Link to="/admin" className={isActive("/admin") || isActive("/admin/add-user")}>
                    Employees
                </Link>
                <a className="pointer-events-none opacity-50">Settings</a>
                <a className="pointer-events-none opacity-50">Reports</a>
            </nav>
        </aside>
    );
}
