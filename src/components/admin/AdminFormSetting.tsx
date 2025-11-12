import { useState } from "react";
import type { Setting } from "../../types";

export type FormSettingValues = Partial<Setting>;

export function AdminFormSetting({
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
        monHours?: string;
        tueHours?: string;
        wedHours?: string;
        thuHours?: string;
        friHours?: string;
        satHours?: string;
        sunHours?: string;
    }>({});
    const [status, setStatus] = useState<null | string>(null);
    const [loading, setLoading] = useState(false);

    function set<K extends keyof FormSettingValues>(key: K, v: FormSettingValues[K]) {
        setValues((s) => ({ ...s, [key]: v }));
    }

    function validate() {
        const e: typeof errors = {};
        if (values.monHours === undefined) e.monHours = "Monday hours are required";
        if (values.tueHours === undefined) e.tueHours = "Tuesday hours are required";
        if (values.wedHours === undefined) e.wedHours = "Wednesday hours are required";
        if (values.thuHours === undefined) e.thuHours = "Thursday hours are required";
        if (values.friHours === undefined) e.friHours = "Friday hours are required";
        if (values.satHours === undefined) e.satHours = "Saturday hours are required";
        if (values.sunHours === undefined) e.sunHours = "Sunday hours are required";
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
                monHours: values.monHours,
                tueHours: values.tueHours,
                wedHours: values.wedHours,
                thuHours: values.thuHours,
                friHours: values.friHours,
                satHours: values.satHours,
                sunHours: values.sunHours,
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
            <div className="flex items-center gap-x-4">
                <div className="checkbox mr-auto">
                    <input id="cbDefaultHS" type="checkbox" checked={Boolean(values.isDefault)} onChange={(e) => set("isDefault", e.target.checked)} disabled={loading} />
                    <label htmlFor="cbDefaultHS">Default hours setting</label>
                </div>
            </div>

            <label className="grid gap-1">
                <span className="text-sm">Monday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.monHours ?? ""}
                    onChange={(e) => set("monHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.monHours && (
                    <p className="error">
                        <span>{errors.monHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Tuesday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.tueHours ?? ""}
                    onChange={(e) => set("tueHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.tueHours && (
                    <p className="error">
                        <span>{errors.tueHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Wednesday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.wedHours ?? ""}
                    onChange={(e) => set("wedHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.wedHours && (
                    <p className="error">
                        <span>{errors.wedHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Thursday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.thuHours ?? ""}
                    onChange={(e) => set("thuHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.thuHours && (
                    <p className="error">
                        <span>{errors.thuHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Friday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.friHours ?? ""}
                    onChange={(e) => set("friHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.friHours && (
                    <p className="error">
                        <span>{errors.friHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Saturday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.satHours ?? ""}
                    onChange={(e) => set("satHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.satHours && (
                    <p className="error">
                        <span>{errors.satHours}</span>
                    </p>
                )}
            </label>

            <label className="grid gap-1">
                <span className="text-sm">Sunday hours *</span>
                <input
                    className="input"
                    type="number"
                    value={values.sunHours ?? ""}
                    onChange={(e) => set("sunHours", e.target.value === "" ? undefined : Number(e.target.value))}
                    disabled={loading}
                />
                {errors.sunHours && (
                    <p className="error">
                        <span>{errors.sunHours}</span>
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
