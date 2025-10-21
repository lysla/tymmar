// src/AdminFormSetting.tsx

import { useState } from "react";
import type { Setting } from "./types";

export type FormSettingValues = Partial<Setting>;

export default function AdminFormSetting({
    initial,
    mode, // "create" | "edit"
    onSubmit,
    submitLabel = mode === "create" ? "Add setting" : "Save changes",
}: {
    initial: FormSettingValues;
    mode: "create" | "edit";
    onSubmit: (values: FormSettingValues) => Promise<void>;
    submitLabel?: string;
}) {
    const [values, setValues] = useState<FormSettingValues>(initial);
    const [errors, setErrors] = useState<{
        mon_hours?: string;
        tue_hours?: string;
        wed_hours?: string;
        thu_hours?: string;
        fri_hours?: string;
        sat_hours?: string;
        sun_hours?: string;
    }>({});
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    function set<K extends keyof FormSettingValues>(key: K, v: FormSettingValues[K]) {
        setValues((s) => ({ ...s, [key]: v }));
    }

    function validate() {
        const e: typeof errors = {};
        if (values.mon_hours === undefined) e.mon_hours = "Monday hours are required";
        if (values.tue_hours === undefined) e.tue_hours = "Tuesday hours are required";
        if (values.wed_hours === undefined) e.wed_hours = "Wednesday hours are required";
        if (values.thu_hours === undefined) e.thu_hours = "Thursday hours are required";
        if (values.fri_hours === undefined) e.fri_hours = "Friday hours are required";
        if (values.sat_hours === undefined) e.sat_hours = "Saturday hours are required";
        if (values.sun_hours === undefined) e.sun_hours = "Sunday hours are required";
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
                mon_hours: values.mon_hours,
                tue_hours: values.tue_hours,
                wed_hours: values.wed_hours,
                thu_hours: values.thu_hours,
                fri_hours: values.fri_hours,
                sat_hours: values.sat_hours,
                sun_hours: values.sun_hours,
                isDefault: values.isDefault,
            });
            setStatus(mode === "create" ? "Setting created." : "Changes saved.");
        } catch (err) {
            setStatus(`! ${err instanceof Error ? err.message : "unknown"}`);
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-y-4">
            <label className="flex items-center gap-x-4">
                <input type="checkbox" checked={values.isDefault} onChange={(e) => set("isDefault", e.target.checked)} disabled={loading} />
                <span className="text-sm">Is default</span>
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Monday hours *</span>
                <input className="input" type="number" value={values.mon_hours} onChange={(e) => set("mon_hours", Number(e.target.value))} disabled={loading} />
                {errors.mon_hours && (
                    <p className="error">
                        <span>{errors.mon_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Tuesday hours *</span>
                <input className="input" type="number" value={values.tue_hours} onChange={(e) => set("tue_hours", Number(e.target.value))} disabled={loading} />
                {errors.tue_hours && (
                    <p className="error">
                        <span>{errors.tue_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Wednesday hours *</span>
                <input className="input" type="number" value={values.wed_hours} onChange={(e) => set("wed_hours", Number(e.target.value))} disabled={loading} />
                {errors.wed_hours && (
                    <p className="error">
                        <span>{errors.wed_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Thursday hours *</span>
                <input className="input" type="number" value={values.thu_hours} onChange={(e) => set("thu_hours", Number(e.target.value))} disabled={loading} />
                {errors.thu_hours && (
                    <p className="error">
                        <span>{errors.thu_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Friday hours *</span>
                <input className="input" type="number" value={values.fri_hours} onChange={(e) => set("fri_hours", Number(e.target.value))} disabled={loading} />
                {errors.fri_hours && (
                    <p className="error">
                        <span>{errors.fri_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Saturday hours *</span>
                <input className="input" type="number" value={values.sat_hours} onChange={(e) => set("sat_hours", Number(e.target.value))} disabled={loading} />
                {errors.sat_hours && (
                    <p className="error">
                        <span>{errors.sat_hours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Sunday hours *</span>
                <input className="input" type="number" value={values.sun_hours} onChange={(e) => set("sun_hours", Number(e.target.value))} disabled={loading} />
                {errors.sun_hours && (
                    <p className="error">
                        <span>{errors.sun_hours}</span>
                    </p>
                )}
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
