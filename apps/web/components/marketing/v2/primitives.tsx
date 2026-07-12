import React from "react";
import Link from "next/link";

type PillVariant = "dark" | "light" | "brand";

const PILL_BASE =
  "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3 text-[15px] font-medium " +
  "transition-transform duration-200 ease-out hover:-translate-y-0.5 active:translate-y-0 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand";

const PILL_VARIANTS: Record<PillVariant, string> = {
  dark: "bg-ink-deep text-white shadow-pill-dark hover:bg-ink",
  light: "bg-white text-ink shadow-pill hover:bg-cream",
  brand: "bg-brand text-white shadow-pill-dark hover:bg-brand-600",
};

export function PillButton({
  href,
  variant = "dark",
  className = "",
  children,
  ...rest
}: {
  href?: string;
  variant?: PillVariant;
  className?: string;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<"button">) {
  const cls = `${PILL_BASE} ${PILL_VARIANTS[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...rest}>
      {children}
    </button>
  );
}

export function Eyebrow({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <p className={`font-mono text-xs uppercase tracking-[0.18em] text-ink-soft ${className}`} style={style}>
      {children}
    </p>
  );
}

/** Big editorial heading: Cal Sans body with a Fraunces-italic accent span via <Serif>. */
export function SectionHeading({
  children,
  className = "",
  as: Tag = "h2",
}: {
  children: React.ReactNode;
  className?: string;
  as?: "h1" | "h2" | "h3";
}) {
  return (
    <Tag
      className={`font-display text-[34px] leading-[1.08] tracking-tight text-ink md:text-[46px] lg:text-[54px] ${className}`}
    >
      {children}
    </Tag>
  );
}

export function Serif({ children }: { children: React.ReactNode }) {
  return <em className="font-serif font-[450] italic tracking-normal">{children}</em>;
}
