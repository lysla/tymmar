import { Link, useLocation, matchPath } from "react-router";
import { supabase } from "../../supabase";

export function AdminSidebar() {
    const loc = useLocation();

    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    }

    // Helper to check if current location matches ANY of the given patterns
    // Each pattern can control "end" matching (exact vs prefix).
    const isActive = (patterns: { path: string; end?: boolean }[]) => {
        const matched = patterns.some((p) => matchPath({ path: p.path, end: p.end ?? true }, loc.pathname));
        return matched ? "border-b font-bold" : "opacity-80 hover:opacity-100";
    };

    // Patterns per nav item
    const employeesPatterns = [
        { path: "/admin", end: true }, // list page
        { path: "/admin/add-user", end: true }, // create
        { path: "/admin/employee/:id/edit", end: true }, // edit
    ];

    const settingsPatterns = [
        { path: "/admin/settings", end: true }, // list page
        { path: "/admin/add-setting", end: true }, // create
        { path: "/admin/setting/:id/edit", end: true }, // edit
    ];

    const reportsPatterns = [{ path: "/admin/reports", end: true }];

    return (
        <aside className="sidebar h-full bg-light px-16 pt-8 flex flex-col items-start gap-y-4 min-w-64">
            <Link to="/" className="logo-typo">
                tymmar
            </Link>

            <button className="button mt-2" onClick={handleSignOut}>
                Sign out
            </button>

            <nav className="flex flex-col gap-y-4 py-8 text-sm">
                <Link to="/admin" className={isActive(employeesPatterns)}>
                    Employees
                </Link>
                <Link to="/admin/settings" className={isActive(settingsPatterns)}>
                    Settings
                </Link>
                <Link to="/admin/reports" className={isActive(reportsPatterns)}>
                    Reports
                </Link>
            </nav>
        </aside>
    );
}
