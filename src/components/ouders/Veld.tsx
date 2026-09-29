"use client";
const inputClass = [
  "mt-1 min-h-11 w-full rounded-lg border-2 border-lijn bg-ivoor",
  "px-3 py-2 text-base text-tekst focus:outline-none focus:ring-2 focus:ring-marine",
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
export { inputClass };
