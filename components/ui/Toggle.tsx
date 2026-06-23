"use client";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative h-[18px] w-[32px] flex-none rounded-full transition-colors"
      style={{ background: checked ? "var(--rx-brand)" : "var(--rx-bg-hover)" }}
    >
      <span
        className="absolute top-[2px] h-[14px] w-[14px] rounded-full bg-white transition-[left]"
        style={{ left: checked ? 16 : 2 }}
      />
    </button>
  );
}
