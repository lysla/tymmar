import { useState } from "react";
import type { Employee } from "../../types";

export type FormEmployeeValues = Partial<Employee>;

export function AdminFormEmployee({
    initial,
    mode, // "create" | "edit"
    onSubmit,
    submitLabel = mode === "create" ? "Add user" : "Save changes",
}: {
    initial: FormEmployeeValues;
    mode: "create" | "edit";
    onSubmit: (values: FormEmployeeValues) => Promise<void>;
    submitLabel?: string;
}) {
    const [values, setValues] = useState<FormEmployeeValues>(initial);
    const [errors, setErrors] = useState<{
        name?: string;
        surname?: string;
        email?: string;
        password?: string;
    }>({});
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    function set<K extends keyof FormEmployeeValues>(key: K, v: FormEmployeeValues[K]) {
        setValues((s) => ({ ...s, [key]: v }));
    }

    function validate() {
        const e: typeof errors = {};
        if (!values.name?.trim()) e.name = "Name is required";
        if (!values.surname?.trim()) e.surname = "Surname is required";
        if (!values.email?.trim()) e.email = "Email is required";
        if (mode == "create" && !values.password?.trim()) e.password = "Password is required";
        setErrors(e);
        return Object.keys(e).length === 0;
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setStatus(null);
        setErrors({});
        if (!validate()) return;

        setLoading(true);
        try {
            await onSubmit({
                name: values.name?.trim(),
                surname: values.surname?.trim(),
                email: values.email?.trim(),
                password: values.password?.trim() || undefined,
                startDate: values.startDate || null,
                endDate: values.endDate || null,
            });
            setStatus(mode === "create" ? "User created." : "Changes saved.");
        } catch (err) {
            setStatus(`! ${err instanceof Error ? err.message : "unknown"}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
            <label className="grid gap-1">
                <span className="text-sm">Name *</span>
                <input className="input" value={values.name} onChange={(e) => set("name", e.target.value)} placeholder="Myrs" disabled={loading} />
                {errors.name && (
                    <p className="error">
                        <span>{errors.name}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Surname *</span>
                <input className="input" value={values.surname} onChange={(e) => set("surname", e.target.value)} placeholder="Lok" disabled={loading} />
                {errors.surname && (
                    <p className="error">
                        <span>{errors.surname}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Email *</span>
                <input className="input" value={values.email} onChange={(e) => set("email", e.target.value)} placeholder="name.surname@elva11.se" disabled={loading} />
                {errors.email && (
                    <p className="error">
                        <span>{errors.email}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Password *</span>
                <input className="input" type="password" value={values.password ?? ""} onChange={(e) => set("password", e.target.value)} placeholder="Password" disabled={loading} />
                {errors.password && (
                    <p className="error">
                        <span>{errors.password}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Start date</span>
                <input type="date" className="input" value={values.startDate ?? ""} onChange={(e) => set("startDate", e.target.value)} placeholder="YYYY-MM-DD" disabled={loading} />
            </label>

            <label className="grid gap-1">
                <span className="text-sm">End date</span>
                <input type="date" className="input" value={values.endDate ?? ""} onChange={(e) => set("endDate", e.target.value)} placeholder="YYYY-MM-DD" disabled={loading} />
            </label>

            <div className="flex flex-col gap-y-3 pt-2 mr-auto">
                <button className="button" disabled={loading}>
                    {loading ? "Saving..." : submitLabel}
                </button>
                {status && (
                    <p className="error">
                        <span>{status}</span>
                    </p>
                )}
            </div>
        </form>
    );
}
