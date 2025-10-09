import { supabase } from "./supabase";

export default function Employee() {
    async function handleSignOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.error("Error signing out:", error.message);
    }

    return (
        <main style={{ padding: 24, fontFamily: "system-ui" }}>
            <h1>tymmar</h1>
            <br />
            <button
                onClick={handleSignOut}
                style={{
                    padding: "8px 16px",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#eee",
                    cursor: "pointer",
                }}>
                Sign out
            </button>
        </main>
    );
}
