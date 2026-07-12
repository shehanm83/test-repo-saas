import React from "react";
import Link from "next/link";

import { LayertoneMark } from "@/components/brand/layertone-mark";

const COLUMNS = [
  {
    heading: "Product",
    links: [
      { label: "Generate", href: "/generate" },
      { label: "Moods", href: "/moods" },
      { label: "Brands", href: "/brands" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Contact", href: "#" },
    ],
  },
  {
    heading: "Legal",
    links: [
      { label: "Terms", href: "#" },
      { label: "Privacy", href: "#" },
      { label: "AUP", href: "#" },
    ],
  },
  {
    heading: "Social",
    links: [
      { label: "Twitter", href: "#" },
      { label: "LinkedIn", href: "#" },
    ],
  },
] as const;

export function Footer() {
  return (
    <footer className="border-t border-ink/8 bg-white px-6 pb-28 pt-16 md:pb-32">
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <LayertoneMark size={44} />
            <span className="font-display text-lg text-ink">
              Layer<b>tone</b>
            </span>
          </div>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-ink-soft">
            Brand-correct image generation for SMBs, marketers, and creators.
          </p>
          <p className="mt-6 font-mono text-xs text-ink-soft/70">© 2026 Layertone</p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.heading}>
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
              {column.heading}
            </p>
            <ul className="mt-4 list-none space-y-2.5 p-0">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className={`text-sm text-ink transition-opacity hover:opacity-60 ${
                      link.href === "#" ? "pointer-events-none opacity-40" : ""
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  );
}
