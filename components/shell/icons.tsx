import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 17, ...rest }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

export const NAV_ICONS: Record<string, (p: IconProps) => React.ReactElement> = {
  wallet: (p) => (
    <svg {...base(p)}>
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2H5a2 2 0 0 1 0-4h13" />
      <circle cx="17" cy="13" r="1" />
    </svg>
  ),
  perps: (p) => (
    <svg {...base(p)}>
      <path d="M3 17l5-6 4 4 8-10" />
      <path d="M14 5h7v7" />
    </svg>
  ),
  radar: (p) => (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
    </svg>
  ),
  cohorts: (p) => (
    <svg {...base(p)}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M3 19c0-3 3-5 6-5s6 2 6 5M15 18c.5-2 2.5-3 4.5-3" />
    </svg>
  ),
  heatmap: (p) => (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  liquidations: (p) => (
    <svg {...base(p)}>
      <path d="M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z" />
    </svg>
  ),
};

export function SearchIcon(p: IconProps) {
  return (
    <svg {...base({ size: 15, strokeWidth: 1.6, ...p })}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function ChevronRight(p: IconProps) {
  return (
    <svg {...base({ size: 15, ...p })}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function ChevronLeft(p: IconProps) {
  return (
    <svg {...base({ size: 15, ...p })}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function RisexMark({ size = 19 }: { size?: number }) {
  return (
    <svg viewBox="0 0 18 16" width={size} height={size} fill="var(--rx-brand)">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M 10.43 7.322 C 11.712 6.247 13.664 6.68 14.371 8.196 L 18 15.978 L 15.512 15.978 L 12.464 9.442 C 11.992 8.432 10.69 8.143 9.836 8.859 L 1.373 15.961 L 0.129 15.961 L 10.43 7.322 Z M 2.488 0 L 5.536 6.535 C 6.008 7.546 7.31 7.835 8.164 7.118 L 16.627 0.017 L 17.871 0.017 L 7.57 8.655 C 6.288 9.73 4.336 9.297 3.629 7.781 L 0 0 L 2.488 0 Z"
      />
    </svg>
  );
}
