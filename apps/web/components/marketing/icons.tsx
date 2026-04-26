import React from "react";

function Icon({ children, size = 16 }: { children: React.ReactNode; size?: number | undefined }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const Icons = {
  sparkle: (size?: number) => (
    <Icon size={size}>
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </Icon>
  ),
  arrowRight: (size?: number) => (
    <Icon size={size}>
      <path d="M5 12h14M13 5l7 7-7 7" />
    </Icon>
  ),
  play: (size?: number) => (
    <Icon size={size}>
      <polygon points="6 3 20 12 6 21 6 3" />
    </Icon>
  ),
  check: (size?: number) => (
    <Icon size={size}>
      <path d="m20 6-11 11-5-5" />
    </Icon>
  ),
  snowflake: (size?: number) => (
    <Icon size={size}>
      <path d="M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93 4.93 19.07M9 5l3 3 3-3M9 19l3-3 3 3M5 9l3 3-3 3M19 9l-3 3 3 3" />
    </Icon>
  ),
  briefcase: (size?: number) => (
    <Icon size={size}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
    </Icon>
  ),
  wand: (size?: number) => (
    <Icon size={size}>
      <path d="M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8 19 13M17.8 6.2 19 5M3 21l9-9M12.2 6.2 11 5" />
    </Icon>
  ),
};
