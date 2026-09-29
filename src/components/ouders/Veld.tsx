"use client";
const inputClass = [
  "mt-1 min-h-11 w-full rounded-lg border-2 border-lijn bg-ivoor",
  "px-3 py-2 text-base text-tekst focus:outline-none focus:ring-2 focus:ring-marine",
].join(" ");

const focusRingClass = [
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-marine",
  "focus-visible:ring-offset-2",
].join(" ");

const buttonClass = [
  "min-h-11 rounded-lg bg-marine px-4 py-2 text-base font-semibold text-op-donker",
  "disabled:opacity-50 disabled:cursor-not-allowed",
  focusRingClass,
].join(" ");

const buttonSecondaryClass = [
  "flex min-h-11 items-center rounded-lg border-2 border-marine px-4 font-semibold",
  "aria-disabled:opacity-50 aria-disabled:cursor-not-allowed",
  focusRingClass,
].join(" ");

export function Veld({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <label className="block text-base font-semibold text-marine">
      {label}
      {multiline ? (
        <textarea
          className={inputClass}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      )}
    </label>
  );
}
export { inputClass, focusRingClass, buttonClass, buttonSecondaryClass };
