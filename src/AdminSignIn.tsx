import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useAuth } from "./hooks/useAuth";

export default function AdminSignIn() {
    const { signInWithPassword, isAdmin } = useAuth();
    const [email, setEmail] = useState("");
    const [pwd, setPwd] = useState("");
    const [msg, setMsg] = useState<string | null>(null);
    const nav = useNavigate();
    const loc = useLocation();

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        const { error } = await signInWithPassword(email, pwd);
        if (error) return setMsg(error);
        // only allow admins to proceed
        if (!isAdmin) return setMsg("Forbidden: admin only");
        nav(loc.state?.from?.pathname ?? "/admin", { replace: true });
    }

    return (
        <div className="w-full h-full bg-paper flex flex-col">
            <header className="flex items-center justify-between px-16 pt-8">
                <div>
                    <Link to="/" className="logo-typo">
                        tymmar
                    </Link>
                    <div className="flex items-center border-t py-4 mt-4">
                        <a href="http://elva11.se" target="_blank" rel="noopener noreferrer">
                            <img src="/images/elva11-logo.svg" alt="Elva11 Logo" style={{ height: "15px" }} />
                        </a>
                    </div>
                </div>
            </header>
            <div className="flex items-center justify-center grow px-16 pb-8 relative">
                <div className="absolute left-0 w-1/2 flex items-end justify-center overflow-hidden">
                    <img src="/images/ill-left.svg" alt="" className="-translate-x-1/5" />
                </div>
                <div className="relative z-10 bg-white w-[450px] p-8">
                    <h1 className="font-serif text-2xl text-center">Admin sign in</h1>
                    <p className="text-center text-sm py-4">Please enter your credentials to access the admin area</p>
                    <form className="w-full flex flex-col gap-y-4 py-4" onSubmit={onSubmit}>
                        <input className="input" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        <input className="input" placeholder="password" type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} />
                        <button className="button">Sign in</button>
                        {msg && (
                            <p className="error">
                                <span>{msg}</span>
                            </p>
                        )}
                    </form>
                </div>
                <div className="absolute right-0 w-1/2 flex items-end justify-center overflow-hidden">
                    <img src="/images/ill-right.svg" alt="" className="translate-x-1/5" />
                </div>
            </div>
            <footer className="px-16 pt-8 pb-16">
                <p className="text-center text-xs">&copy; {new Date().getFullYear()} ELVA11. All rights reserved.</p>
            </footer>
        </div>
    );
}
