import React from "react";
import Link from "next/link";

import { LayertoneMark } from "@/components/brand/layertone-mark";

import { PillButton } from "./primitives";

const LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Moods", href: "#moods" },
  { label: "Showcase", href: "#showcase" },
  { label: "Pricing", href: "#pricing" },
];

export function MarketingNav({ isAuthed }: { isAuthed: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-ink/5 bg-cream/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <LayertoneMark size={40} />
          <span className="font-display text-[19px] tracking-tight text-ink">
            Layer<b>tone</b>
          </span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Marketing">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-ink-soft transition-colors hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Link
            href={isAuthed ? "/generate" : "/sign-in"}
            className="text-sm font-medium text-ink transition-opacity hover:opacity-70"
          >
            {isAuthed ? "Dashboard" : "Log in"}
          </Link>
          <PillButton href={isAuthed ? "/generate" : "/sign-up"} className="!px-5 !py-2 text-sm">
            {isAuthed ? "Open Layertone" : "Start free"}
          </PillButton>
        </div>
      </div>
    </header>
  );
}
