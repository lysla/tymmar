// src/Dashboard.tsx
import { useAuth } from "./context/AuthContext";
import { useEmployee } from "./context/EmployeeContext";

export default function Dashboard() {
    const { signOut } = useAuth();
    const { status, employee, refetch } = useEmployee();

    if (status === "idle" || status === "loading") return <p>Loading…</p>;
    if (status === "error") {
        return (
            <div>
                <h2>Something went wrong</h2>
                <button onClick={() => void refetch()}>Try again</button>
            </div>
        );
    }
    if (status === "missing") {
        return (
            <div>
                <h2>Account not configured</h2>
                <p>Your login is active, but your employee profile isn’t set up yet.</p>
                <button onClick={signOut}>Sign out</button>
            </div>
        );
    }

    return (
        <main>
            <h1>Welcome, {employee?.name}</h1>
            <button onClick={signOut}>Sign out</button>
            {/* …rest of employee dashboard… */}
        </main>
    );
}
