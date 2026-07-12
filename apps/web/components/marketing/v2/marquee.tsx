import React from "react";

/**
 * CSS-driven infinite marquee. Children are duplicated into an aria-hidden
 * clone so the -50% translate loops seamlessly. Pauses on hover.
 */
export function Marquee({
  children,
  speed = "normal",
  reverse = false,
  className = "",
}: {
  children: React.ReactNode;
  speed?: "normal" | "slow";
  reverse?: boolean;
  className?: string;
}) {
  const animation = reverse
    ? "animate-marquee-reverse"
    : speed === "slow"
      ? "animate-marquee-slow"
      : "animate-marquee";
  return (
    <div className={`group overflow-hidden ${className}`}>
      <div
        className={`flex w-max ${animation} group-hover:[animation-play-state:paused] motion-reduce:[animation-play-state:paused]`}
      >
        <div className="flex shrink-0">{children}</div>
        <div className="flex shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
}
