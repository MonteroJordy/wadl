import * as React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (size = 18): React.SVGProps<SVGSVGElement> => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
});

export function IconQr({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <path d="M14 14h3v3h-3zM20 14h1M14 20h1M20 17v4" />
    </svg>
  );
}

export function IconSearch({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

export function IconPlus({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeLinecap="round" {...rest}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconBack({ size = 22, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconMore({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...rest}
    >
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </svg>
  );
}

export function IconCopy({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
    </svg>
  );
}

export function IconShare({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <path d="M16 6l-4-4-4 4" />
      <path d="M12 2v14" />
    </svg>
  );
}

export function IconFlash({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeLinejoin="round" {...rest}>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

export function IconCheck({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="m4 12 5 5L20 6" />
    </svg>
  );
}

export function IconClose({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} strokeLinecap="round" {...rest}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  );
}

export function IconCal({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconPin({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <path d="M12 22s7-7.5 7-13a7 7 0 1 0-14 0c0 5.5 7 13 7 13Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

export function IconArrow({ size = 14, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

export function IconUser({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
    </svg>
  );
}

export function IconUsers({ size = 18, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <circle cx="17" cy="6" r="2.5" />
      <path d="M22 18c0-2.8-2.2-5-5-5" />
    </svg>
  );
}

export function IconBolt({ size = 14, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      {...rest}
    >
      <path d="M13 2 3 14h7l-1 8 11-13h-7l1-7z" />
    </svg>
  );
}

export function IconUpload({ size = 20, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M12 16V4M6 10l6-6 6 6M4 20h16" />
    </svg>
  );
}

export function IconDownload({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M12 4v12M6 14l6 6 6-6M4 20h16" />
    </svg>
  );
}

export function IconAttach({ size = 16, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M21 11.5 12 20.5a5 5 0 0 1-7-7l9-9a3.5 3.5 0 0 1 5 5l-9 9a2 2 0 0 1-3-3l8.5-8.5" />
    </svg>
  );
}

export function IconInfo({ size = 16, ...rest }: IconProps) {
  return (
    <svg {...base(size)} {...rest}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v5h1" />
    </svg>
  );
}

export function IconSend({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="m22 2-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

export function IconExport({ size = 18, ...rest }: IconProps) {
  return (
    <svg
      {...base(size)}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v13" />
    </svg>
  );
}

// Tab bar icons (1.6px stroke, slightly larger default)
export function IconHome({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} {...rest}>
      <path d="m3 11 9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z" />
    </svg>
  );
}

export function IconList({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} {...rest}>
      <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
    </svg>
  );
}

export function IconWallet({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} {...rest}>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M22 10H6a2 2 0 0 1 0-4h12" />
    </svg>
  );
}

export function IconStaff({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} {...rest}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function IconAnalytics({ size = 20, ...rest }: IconProps) {
  return (
    <svg {...base(size)} strokeWidth={1.6} {...rest}>
      <path d="M3 3v18h18M7 14l4-4 4 4 5-7" />
    </svg>
  );
}
